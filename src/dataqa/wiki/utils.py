import argparse
from bs4 import BeautifulSoup, NavigableString, Tag
from collections import namedtuple
import pandas as pd
import re
import requests

from dataqa.constants import TABLE_COLUMN_NAMES_FIELD_NAME, TABLE_ROWS_FIELD_NAME, TEXT_COLUMN_NAME

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
                paragraphs.append(re.sub('\n+', ' ', paragraph))
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


def extract_tables(soup):
    output_tables = []
    all_tables = soup.find_all(['table'])

    for tab in all_tables:
        list_tabs = pd.read_html(str(tab))
        for df_tab in list_tabs:
            df_tab = df_tab.dropna(how='all').fillna('')

            if type(df_tab.columns) == pd.core.indexes.numeric.Int64Index:
                df_tab = df_tab.transpose()
                df_tab.columns = df_tab.iloc[0]
                df_tab = df_tab.iloc[1:]

            table_text = df_tab.to_string(index=False)
            table_cols = df_tab.columns.tolist()
            table_rows = df_tab.values.tolist()
            output_tables.append({TABLE_ROWS_FIELD_NAME: table_rows,
                                  TABLE_COLUMN_NAMES_FIELD_NAME: table_cols,
                                  TEXT_COLUMN_NAME: table_text})

    for table in all_tables:
        table.decompose()

    return output_tables


def extract_wikipedia_paragraphs(url):
    html = get_html(url)

    soup = BeautifulSoup(html, 'html.parser')

    for style_tag in soup.find_all('style'):
        style_tag.decompose()

    all_tables = extract_tables(soup)
    for table_ind, table in enumerate(all_tables):
        yield {"paragraph_id": table_ind,
               TEXT_COLUMN_NAME: table[TEXT_COLUMN_NAME],
               TABLE_COLUMN_NAMES_FIELD_NAME: table[TABLE_COLUMN_NAMES_FIELD_NAME],
               TABLE_ROWS_FIELD_NAME: table[TABLE_ROWS_FIELD_NAME],
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