import re

HTML_TAGS = ["(br|p|div|section)"]


def clean_html(raw_html):
    cleanr = re.compile(f'<\/?{HTML_TAGS}>')
    cleantext = re.sub(cleanr, '', raw_html)
    return cleantext


def normalise_text(text):
    return text.strip().lower()