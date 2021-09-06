"""Functions to label entities."""

from collections import namedtuple
from dataqa.constants import (NUM_MAX_SPAN_TOKENS,
                              SPACY_COLUMN_NAME)
import dataqa.nlp.spacy_nlp as spacy_nlp
import re
import uuid
import copy

Token = namedtuple('Token', ['start_char',
                             'end_char',
                             'idx_token',
                             'is_punct',
                             'is_sent_start',
                             'is_empty'])


def select_n_tokens(tok_list, n):
    """
    This selects N tokens within the same sentence, and does not count punctuation.

    :param tok_list:
    :param n:
    :return:
    """
    selected_toks = []
    for tok in tok_list:
        if len(selected_toks) == n:
            return selected_toks
        if tok.is_punct or tok.is_empty:
            continue
        if tok.is_sent_start:
            return selected_toks
        selected_toks.append(tok)
    return selected_toks


def match_end_of_expression(tok_list, end_idx, n):
    """
    Returns the index of the last token in the list that is within the same sentence,
    is not punctuation (or empty) and that has an index below the end_idx.

    :param tok_list:
    :param end_idx:
    :return:
    """
    last_valid_ind = 0

    for ind, tok in enumerate(tok_list):
        if tok.start_char >= end_idx:
            return last_valid_ind
        if n == 0 and tok.is_punct or tok.is_empty:
            continue
        # the first token in the expression can be punctuation
        if tok.is_sent_start and ind > 0 and n == 0:
            return last_valid_ind
        last_valid_ind = ind

    return last_valid_ind


def get_expression_start_token_index(token_starts, match_start_idx, match_end_idx, n):
    """
    We find the first token such that is closest to start_idx.

    If n==0, we will return this token as the first part of the span, so it cannot be punctuation and cannot start after
    the end of the match (e.g. if we match on punctuation only, we do not return anything).

    If n>0, we will remove these conditions, as this token will not be the start of the span.

    :param token_starts:
    :param end_idx:
    :param n:
    :return:
    """
    expression_start_token = None
    if n == 0:
        # we do not start or end a match on punctuation
        for token in token_starts:
            if token.start_char > match_end_idx:
                return None
            if not token.is_punct and not token.is_empty:
                # check if the match is in the middle of a valid token
                if token.start_char <= match_start_idx < token.end_char:
                    return token.idx_token
                if match_start_idx <= token.start_char and token.end_char <= match_end_idx:
                    return token.idx_token
    else:
        try:
            # the expression does not need to match the whole token
            expression_start_token = next(len(token_starts) - ind - 1 for ind, x in enumerate(token_starts[::-1])
                                          if match_start_idx >= x.start_char <= match_end_idx)
        except:
            # we have matched on punctuation at the end of a sentence
            pass
    return expression_start_token


def generate_span_next_n_tokens(doc, tok_list, n, entity_id):
    next_n_tokens = select_n_tokens(tok_list, n)

    if not len(next_n_tokens):
        return None

    first_token = next_n_tokens[0]
    last_token = next_n_tokens[-1]

    start_idx = first_token.start_char
    end_idx = last_token.start_char + len(doc[last_token.idx_token].text)

    span = {"end": end_idx - 1,
            "start": start_idx,
            "text": doc.text[start_idx: end_idx],
            "id": str(uuid.uuid1()),
            "entity_id": entity_id}
    return span


def get_spans_from_start_end(df, spans):
    """
    Return correct spans (aligned with tokens) from input spans with start and end indices.
    """
    doc = df[SPACY_COLUMN_NAME].values[0]
    spans = sorted(spans, key=lambda x: x['start'])

    corrected_spans = []
    last_span = None

    token_starts = [Token(tok.idx,
                          tok.idx + len(tok.text),
                          tok.i,
                          tok.is_punct,
                          tok.is_sent_start,
                          is_token_only_space(tok)) for tok in doc]

    for span in spans:
        expression_start_token = get_expression_start_token_index(token_starts,
                                                                  span["start"],
                                                                  span["end"],
                                                                  0)
        if expression_start_token is None:
            continue

        # avoid overlapping spans
        if last_span and last_span["end"] >= token_starts[expression_start_token].start_char:
            continue

        expression_end_token = match_end_of_expression(token_starts[expression_start_token:],
                                                       span["end"],
                                                       0)
        expression_end_token = min([expression_end_token, NUM_MAX_SPAN_TOKENS - 1])
        expression_end_token += expression_start_token

        start_token_idx = token_starts[expression_start_token].start_char
        end_token_idx, end_token_i = (token_starts[expression_end_token].start_char,
                                      token_starts[expression_end_token].idx_token)

        last_span = {"end": end_token_idx + len(doc[end_token_i].text) - 1,
                     "start": start_token_idx,
                     "text": doc.text[start_token_idx: end_token_idx + len(doc[end_token_i].text)],
                     "id": str(uuid.uuid1()),
                     "entity_id": span["entity_id"]}
        corrected_spans.append(last_span)
    return corrected_spans


def is_token_only_space(tok):
    return len(tok.text.strip()) == 0


def get_spans_from_regex(doc, regex, n, entity_id):
    spans = []
    last_span = None

    token_starts = [Token(tok.idx,
                          tok.idx + len(tok),
                          tok.i,
                          tok.is_punct,
                          tok.is_sent_start,
                          is_token_only_space(tok)) for tok in doc]

    for match in regex.finditer(doc.text):
        if len(match.group(0)) == 0:
            continue

        expression_start_token = get_expression_start_token_index(token_starts, match.start(), match.end(), n)
        if expression_start_token is None:
            continue

        # avoid overlapping spans
        if last_span and last_span["end"] >= token_starts[expression_start_token].start_char:
            continue

        expression_end_token = match_end_of_expression(token_starts[expression_start_token:],
                                                       match.end(),
                                                       n)

        if n == 0:
            expression_end_token = min([expression_end_token, NUM_MAX_SPAN_TOKENS - 1])
            expression_end_token += expression_start_token

            start_token_idx = token_starts[expression_start_token].start_char
            end_token_idx, end_token_i = (token_starts[expression_end_token].start_char,
                                          token_starts[expression_end_token].idx_token)

            last_span = {"end": end_token_idx + len(doc[end_token_i].text) - 1,
                         "start": start_token_idx,
                         "text": doc.text[start_token_idx: end_token_idx + len(doc[end_token_i].text)],
                         "id": str(uuid.uuid1()),
                         "entity_id": entity_id}
            spans.append(last_span)
        else:
            expression_end_token += expression_start_token

            if len(token_starts) <= expression_end_token + 1:
                break

            span = generate_span_next_n_tokens(doc,
                                               token_starts[expression_end_token + 1:],
                                               n,
                                               entity_id)
            if not span:
                break

            last_span = span
            spans.append(span)

    return spans


def get_matching_noun_phrase_spans(doc, sentence_start_char, noun_phrase_regex, entity_id):
    spans = []
    noun_chunks = doc.noun_chunks
    for noun_chunk in noun_chunks:
        length_noun_chunk = noun_chunk.end - noun_chunk.start
        if length_noun_chunk == 1 and doc[noun_chunk.start].is_stop:
            continue
        if noun_phrase_regex.search(noun_chunk.text):
            spans.append({"start": sentence_start_char + noun_chunk.start_char,
                          "end": sentence_start_char + noun_chunk.end_char - 1,
                          "text": doc.text[noun_chunk.start_char: noun_chunk.end_char],
                          "id": str(uuid.uuid1()),
                          "entity_id": entity_id})
    return spans


def get_spans_from_noun_phrase_regex(doc,
                                     sentence,
                                     text_regex,
                                     noun_phrase_regex,
                                     entity_id):
    """
    Return all spans made out of matching noun phrases.

    If in sentence mode, a matching noun phrase is a noun phrase where the sentence matches
    the text_regex and the noun_phrase matches the noun_phrase_regex.
    In text mode, it's the same but at the full text level.
    """
    doc_spans = []
    if sentence:
        for sentence in doc.sents:
            if text_regex.search(sentence.text):
                sentence_doc = spacy_nlp.nlp(sentence.text)
                spans = get_matching_noun_phrase_spans(sentence_doc,
                                                       sentence.start_char,
                                                       noun_phrase_regex,
                                                       entity_id)
                doc_spans.extend(spans)
    else:
        if text_regex.search(doc.text):
            doc_spans = get_matching_noun_phrase_spans(doc, 0, noun_phrase_regex, entity_id)
    return doc_spans


def get_all_noun_phrase_regex_entities(df,
                                       sentence,
                                       text_regex_str,
                                       noun_phrase_regex_str,
                                       entity_id):
    """

    """
    text_regex = re.compile(text_regex_str)
    noun_phrase_regex = re.compile(noun_phrase_regex_str)
    matcher = lambda doc: get_spans_from_noun_phrase_regex(doc,
                                                           sentence,
                                                           text_regex,
                                                           noun_phrase_regex,
                                                           entity_id)
    spans = df[SPACY_COLUMN_NAME].apply(matcher)
    return spans


def get_all_regex_entities(df, regex_str, match_num_entitities, entity_id):
    """
    Returns a list of spans for each document. If a document has no match, it will return an empty list.

    Example: [[span_1_doc_1, span_2_doc_1], [], [span_1_doc_3], ...]

    :param df:
    :param regex_str:
    :param match_num_entitities:
    :return:
    """
    regex = re.compile(regex_str)
    matcher = lambda doc: get_spans_from_regex(doc, regex, match_num_entitities, entity_id)
    spans = df[SPACY_COLUMN_NAME].apply(matcher)
    return spans


def flatten(l):
    return [item for sublist in l for item in sublist]


def merge_spans(spans):
    if not len(spans):
        return []

    intervals = copy.deepcopy(sorted(spans, key=lambda x: x['start']))

    merged = [intervals[0]]
    merged[0]["id"] = str(uuid.uuid1())

    for current in intervals:
        previous = merged[-1]
        if current["start"] <= previous["end"]:
            # there is overlap
            if current["end"] > previous["end"]:
                # the current span is longer than the previous overlapping span
                previous["text"] = previous["text"] + current["text"][-(current["end"] - previous["end"]):]
                previous["end"] = current["end"]
        else:
            # create new span id
            current["id"] = str(uuid.uuid1())
            merged.append(current)

    return merged


def merge_spans_all_docs(spans):
    all_spans = []
    for doc_id in range(len(spans)):
        all_spans.append(merge_spans(flatten(spans[doc_id])))
    return all_spans


def merge_predicted_labels(current_predicted_label_spans, new_rule_spans):
    new_merged_spans = []
    for doc_predicted_labels, doc_rules in zip(current_predicted_label_spans, new_rule_spans):
        flat_spans = flatten(doc_rules + [doc_predicted_labels])
        new_merged_spans.append(merge_spans(flat_spans))
    return new_merged_spans
