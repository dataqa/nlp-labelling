import re

import pandas as pd
import pytest

from dataqa.nlp.nlp_ner import (get_spans_from_regex,
                                get_spans_from_start_end,
                                merge_spans)
from dataqa.nlp.spacy_nlp import nlp
from dataqa.constants import SPACY_COLUMN_NAME

example_text = ("Iron is one of the elements undoubtedly known to the ancient world. "
                "It has been worked, or wrought, for millennia. However, iron objects "
                "of great age are much rarer than objects made of gold or silver "
                "due to the ease with which iron corrodes. The technology developed slowly.")

example_doc = nlp(example_text)


@pytest.fixture
def spans():
    return [{"start": 0, "end": 12, "text": example_text[0:12]},
            {"start": 6, "end": 23, "text": example_text[6:23]},
            {"start": 30, "end": 35, "text": example_text[30:35]}]


@pytest.fixture
def merged_span():
    return [{"start": 0, "end": 23, "text": example_text[0:23]},
            {"start": 30, "end": 35, "text": example_text[30:35]}]


@pytest.fixture
def regex_0_entity():
    all_params = []
    # match in the middle of a token
    params = {"regex": re.compile("ol"),
              "expected": [get_span_from_extract("gold"),
                           get_span_from_extract("technology")]}
    all_params.append(params)
    # full token match
    params = {"regex": re.compile("corrodes"),
              "expected": [get_span_from_extract("corrodes")]}
    all_params.append(params)
    # match starting with punctuation
    params = {"regex": re.compile(","),
              "expected": []}
    all_params.append(params)
    # match starting with punctuation and a valid token
    params = {"regex": re.compile(", for"),
              "expected": [get_span_from_extract("for")]}
    all_params.append(params)
    # match ending with punctuation
    params = {"regex": re.compile("millennia."),
              "expected": [get_span_from_extract("millennia")]}
    all_params.append(params)
    return all_params


@pytest.fixture
def regex_1_entity():
    params = {"regex": re.compile("iron"),
              "expected": [get_span_from_extract("objects", 0),
                           get_span_from_extract("corrodes")]}
    return params


@pytest.fixture
def regex_3_entities():
    all_params = []
    params = {"regex": re.compile("iron"),
              "expected": [get_span_from_extract("objects of great"),
                           get_span_from_extract("corrodes")]}
    all_params.append(params)

    params = {"regex": re.compile("cient"),
              "expected": [get_span_from_extract("world")]}

    all_params.append(params)

    # matching end of a sentence: will be empty because it needs to be in the same sentence
    params = {"regex": re.compile("millennia."),
              "expected": []}
    all_params.append(params)

    # matching across sentence boundaries
    params = {"regex": re.compile("millennia. However"),
              "expected": [get_span_from_extract("iron objects of")]}
    all_params.append(params)

    # matching inside a token
    params = {"regex": re.compile("wev"),
              "expected": [get_span_from_extract("iron objects of")]}
    all_params.append(params)
    return all_params


def get_span_from_extract(extract, ind=None):
    matches = list(re.finditer(extract, example_text))
    if ind is None:
        assert len(matches) == 1, extract
        match = matches[0]
    else:
        match = matches[ind]
    start_ind = match.start()
    end_ind = match.end() - 1
    return {"start": start_ind, "end": end_ind, "text": extract, "entity_id": 0}


def assert_same_span(span1, span2):
    assert span1["start"] == span2["start"]
    assert span1["end"] == span2["end"]
    assert span1["text"] == span2["text"]


def test_merge_spans(spans, merged_span):
    result = merge_spans(spans)
    for ind, span in enumerate(result):
        assert_same_span(span, merged_span[ind])


def test_get_spans_from_regex__0_entity(regex_0_entity):
    for test in regex_0_entity:
        results = get_spans_from_regex(example_doc,
                                       test["regex"],
                                       0,
                                       "name")
        assert (len(results) == len(test["expected"]))
        for result, expected_result in zip(results, test["expected"]):
            assert_same_span(result, expected_result)


def test_get_spans_from_regex__1_entity(regex_1_entity):
    results = get_spans_from_regex(example_doc,
                                   regex_1_entity["regex"],
                                   1,
                                   "name")
    assert (len(results) == len(regex_1_entity["expected"]))
    for result, expected_result in zip(results, regex_1_entity["expected"]):
        assert_same_span(result, expected_result)


def test_get_spans_from_regex__3_entities(regex_3_entities):
    for test in regex_3_entities:
        results = get_spans_from_regex(example_doc,
                                       test["regex"],
                                       3,
                                       "name")
        assert (len(results) == len(test["expected"]))
        for result, expected_result in zip(results, test["expected"]):
            assert_same_span(result, expected_result)


def test_get_spans_from_regex__3_entities_overlapping():
    text = "I repeat here and here the text."
    spans = get_spans_from_regex(nlp(text),
                                 re.compile("here"),
                                 3,
                                 "name")
    assert(len(spans) == 1)
    assert(spans[0]["text"] == "and here the")


def test_get_spans_from_start_end():
    df = pd.DataFrame([[example_doc]], columns=[SPACY_COLUMN_NAME])
    results = get_spans_from_start_end(df,
                                       [get_span_from_extract("lements undoubtedly known to t")])
    assert (len(results) == 1)
    assert_same_span(results[0], get_span_from_extract("elements undoubtedly known to"))
