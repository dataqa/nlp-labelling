import argparse
from bs4 import BeautifulSoup, NavigableString, Tag
from collections import namedtuple
import pandas as pd
import requests

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


def get_paragraphs_from_html(html):
    soup = BeautifulSoup(html, 'html.parser')
    all_headers = soup.find_all(['h1', 'h2'])

    text = []
    prev_header = all_headers[0]
    for i in all_headers:
        if not (prev_header.text.startswith('References') or prev_header.text.startswith('External links')):
            text.extend([prev_header.text.replace('[edit]', '') + ' ' + x for x in between(prev_header, i)])
        prev_header = i

    return text


def get_html(url):
    if url.startswith('/'):
        r = requests.get('https://en.wikipedia.org' + url)
    else:
        r = requests.get(url)
    html = r.text
    return html


def extract_wikipedia_paragraphs(url):
    html = get_html(url)
    for p_ind, paragraph in enumerate(get_paragraphs_from_html(html)):
        yield {"paragraph_id": p_ind, "text": paragraph, "url": url}