import argparse
from bs4 import BeautifulSoup, NavigableString, Tag
from collections import namedtuple
import pandas as pd
import re
import requests

from dataqa.constants import (TABLE_COLUMN_NAMES_FIELD_NAME,
                              TABLE_ROWS_FIELD_NAME,
                              TABLE_ROWS_CHAR_STARTS_FIELD_NAME,
                              TEXT_COLUMN_NAME)

Wikipage = namedtuple("Wikipage", ["name", "html", "url", "source"])


def between(cur, end=None):
    text = ''
    while cur and ((end is None) or (end is not None and cur != end)):
        if isinstance(cur, NavigableString):
            if isinstance(cur.previous_element, Tag) and cur.previous_element.name == 'p':
                if len(text.strip()):
                    yield text
                text = cur
            else:
                text += cur

        cur = cur.next_element
    if len(text.strip()):
        yield text


def get_paragraphs(soup):
    all_headers = soup.find_all(['h1', 'h2'])

    text = []
    prev_header = all_headers[0]
    for i in all_headers:
        if not (prev_header.text.startswith('References') or prev_header.text.startswith('External links')
                or prev_header.text.startswith('Further reading')):
            paragraphs = []
            for x in between(prev_header, i):
                paragraph = f"(section {prev_header.text.replace('[edit]', '')}) " + x
                paragraph = re.sub('\n+', ' ', paragraph)
                paragraph = re.sub('(\[edit\]|\[\d+\])', ' ', paragraph)
                paragraphs.append(paragraph)
            text.extend(paragraphs)
        prev_header = i

    return text


def get_html(url):
    if url.startswith('/'):
        r = requests.get('https://en.wikipedia.org' + url)
    else:
        r = requests.get(url)
    html = r.text
    return html

def sanitise_string(x, url):
    try:
        return re.sub('\[\d+\]', ' ', str(x))
    except:
        raise Exception("Could not sanitise string ", x, " at url ", url)


def extract_tables(soup, url):
    output_tables = []
    all_tables = soup.find_all(['table'])

    for tab in all_tables:
        try:
            list_tabs = pd.read_html(str(tab))
        except:
            print("Could not parse table for url ", url)
            continue

        for df_tab in list_tabs:
            df_tab = df_tab.dropna(how='all').fillna('')

            if type(df_tab.columns) == pd.core.indexes.numeric.Int64Index:
                df_tab = df_tab.transpose()
                df_tab.columns = df_tab.iloc[0]
                df_tab = df_tab.iloc[1:]

            # we add a white space to prevent the spacy tokeniser to create a token across columns
            # (a comma is not enough)
            if df_tab.columns.nlevels > 2:
                continue
            elif df_tab.columns.nlevels == 2:
                df_tab.columns = [' '.join((col[0], str(col[1]))) for col in df_tab.columns]

            table_cols = df_tab.columns.tolist()
            df_tab_csv = df_tab.applymap(lambda x: sanitise_string(x, url))
            try:
                table_text = ','.join(table_cols) + '\n'
            except:
                raise Exception("Could not create csv out of columns ", table_cols, " at url ", url)
            column_csv_length = len(table_text)

            # This is not exactly csv, but otherwise it was too difficult to align
            # the spans selected in the values and the ones in the text turned to csv
            table_cols = df_tab_csv.columns.tolist()
            table_rows = df_tab_csv.values.tolist()
            df_tab_csv = df_tab_csv.applymap(lambda x: x + ' ')
            table_text += '\n'.join(df_tab_csv.apply(lambda x: ','.join(x), axis=1).values.tolist()) + '\n'

            char_starts = []
            current_char = column_csv_length

            for _, row in df_tab_csv.iterrows():
                char_starts_row = [current_char]
                for val in row:
                    current_char += len(val) + 1  # + comma or newline
                    char_starts_row.append(current_char)
                char_starts.append(char_starts_row[:-1])

            output_tables.append({TABLE_ROWS_FIELD_NAME: table_rows,
                                  TABLE_COLUMN_NAMES_FIELD_NAME: table_cols,
                                  TEXT_COLUMN_NAME: table_text,
                                  TABLE_ROWS_CHAR_STARTS_FIELD_NAME: char_starts})

    for table in all_tables:
        table.decompose()

    return output_tables


def extract_wikipedia_paragraphs(url):
    html = get_html(url)

    soup = BeautifulSoup(html, 'html.parser')

    # remove style tags
    for style_tag in soup.find_all('style'):
        style_tag.decompose()

    # add whitespace to list items to make sure they are extracted as separate strings
    all_list_items = soup.find_all(['li'])
    for li in all_list_items:
        if li.string:
            li.string = li.string + ', '
        else:
            children = list(li.children)
            if children:
                last_child = children[-1]
                if last_child.string:
                    last_child.string.replace_with(last_child.string + ', ')

    all_tables = extract_tables(soup, url)
    table_ind = -1
    for table_ind, table in enumerate(all_tables):
        yield {"paragraph_id": table_ind,
               TEXT_COLUMN_NAME: table[TEXT_COLUMN_NAME],
               TABLE_COLUMN_NAMES_FIELD_NAME: table[TABLE_COLUMN_NAMES_FIELD_NAME],
               TABLE_ROWS_FIELD_NAME: table[TABLE_ROWS_FIELD_NAME],
               TABLE_ROWS_CHAR_STARTS_FIELD_NAME: table[TABLE_ROWS_CHAR_STARTS_FIELD_NAME],
               "url": url,
               "is_table": "true"}

    for p_ind, paragraph in enumerate(get_paragraphs(soup)):
        yield {"paragraph_id": p_ind + table_ind + 1,
               TEXT_COLUMN_NAME: paragraph,
               "url": url,
               "is_table": "false"}


def main(input_filepath, output_filepath):
    df = pd.read_csv(input_filepath)
    processed_data = []
    for url in df['url']:
        for paragraph in extract_wikipedia_paragraphs(url):
            processed_data.append(paragraph)
    output_df = pd.DataFrame(processed_data).to_csv(output_filepath, index=False)
    return output_df


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Extract paragraphs from Wikipedia.')
    parser.add_argument('input_filepath')
    parser.add_argument('output_filepath')
    args = parser.parse_args()
    main(args.input_filepath, args.output_filepath)
