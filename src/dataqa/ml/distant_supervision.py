import re

import numpy as np
from snorkel.labeling import LabelingFunction
from snorkel.labeling.model import MajorityLabelVoter
from snorkel.labeling.model import LabelModel
from snorkel.labeling import PandasLFApplier

import dataqa.ml.sentiment as ml_sentiment

from dataqa.constants import SPACY_COLUMN_NAME, ABSTAIN

MAJORITY_VOTE_MERGE_METHOD = "majority"
MODEL_MERGE_METHOD = "model"
NO_MERGE_METHOD = "none"


def full_text_match(document, matcher, label, negative_match):
    if bool(negative_match) != matcher(document[SPACY_COLUMN_NAME]):
        return label
    return ABSTAIN


def sentence_match(document, matcher, label, negative_match):
    for sentence in document[SPACY_COLUMN_NAME].sents:
        # if negative match, then if any sentence matches, return abstain, else label
        # if non-negative match then if any sentence matches, return label, else return abstain
        if matcher(sentence):
            if negative_match:
                return ABSTAIN
            else:
                return label
    # none of the sentences match
    if negative_match:
        return label
    return ABSTAIN


def ordered_full_text_match(document, list_matchers, label, negative_match):
    matcher = lambda doc: has_ordered_match(doc, list_matchers)
    return full_text_match(document, matcher, label, negative_match)


def non_ordered_full_text_match(document, list_matchers, label, negative_match):
    matcher = lambda doc: has_non_ordered_match(doc, list_matchers)
    return full_text_match(document, matcher, label, negative_match)


def ordered_sentence_match(document, list_matchers, label, negative_match):
    matcher = lambda doc: has_ordered_match(doc, list_matchers)
    return sentence_match(document, matcher, label, negative_match)


def non_ordered_sentence_match(document, list_matchers, label, negative_match):
    matcher = lambda doc: has_non_ordered_match(doc, list_matchers)
    return sentence_match(document, matcher, label, negative_match)


def has_ordered_match(document, list_matchers):
    spans = []
    for matching_object in list_matchers:
        name = matching_object.name
        matching_spans = matching_object.get_matching_spans(document)
        if not matching_spans:
            return False
        for span in matching_spans:
            spans.append((name, span))

    named_spans = sorted(list(set(spans)), key=lambda x: x[1])
    sorted_named_spans = ' '.join([x[0] for x in named_spans])

    ordered_regex = re.compile(' '.join([x.name for x in list_matchers]))
    matches = ordered_regex.search(sorted_named_spans)
    if matches:
        return True
    return False


def has_non_ordered_match(document, list_matchers):
    for matcher in list_matchers:
        if not (matcher.has_match(document)):
            return False
    return True


def ordered_match_lf(list_matchers, label, rule_id, negative_match, sentence_match):
    params = (list_matchers, label, negative_match)
    if sentence_match:
        composite_matcher = lambda doc: ordered_sentence_match(doc, *params)
    else:
        composite_matcher = lambda doc: ordered_full_text_match(doc, *params)
    return LabelingFunction(name=rule_id, f=composite_matcher)


def non_ordered_match_lf(list_matchers, label, rule_id, negative_match, sentence_match):
    params = (list_matchers, label, negative_match)
    if sentence_match:
        composite_matcher = lambda doc: non_ordered_sentence_match(doc, *params)
    else:
        composite_matcher = lambda doc: non_ordered_full_text_match(doc, *params)
    return LabelingFunction(name=rule_id, f=composite_matcher)


def create_sentiment_lf(sentiment, score, is_gt, label, rule_id):
    matcher = lambda doc: ml_sentiment.filter_sentiment(doc,
                                                        sentiment,
                                                        is_gt,
                                                        score,
                                                        label,
                                                        ABSTAIN)
    return LabelingFunction(name=rule_id, f=matcher)


def apply_lfs(df, lfs):
    applier = PandasLFApplier(lfs=lfs)
    L_mat = applier.apply(df=df)
    return L_mat


def merge_labels(L_mat, total_classes):
    _, num_lfs = L_mat.shape
    if num_lfs <= 1:
        merged_labels = np.reshape(L_mat, -1)
        merged_method = NO_MERGE_METHOD
    elif num_lfs >= 3:
        merged_labels = model_vote_merge(L_mat, total_classes)
        merged_method = MODEL_MERGE_METHOD
    else:
        merged_labels = majority_vote_merge(L_mat, total_classes)
        merged_method = MAJORITY_VOTE_MERGE_METHOD
    return merged_labels, merged_method

def model_vote_merge(L_mat, total_classes):
    # Parameters that can be used in the fit config:
    # https://github.com/snorkel-team/snorkel/blob/1adc7a8df016882bb5b3fa38f236e06e829051ab/snorkel/labeling/model/label_model.py#L25
    label_model = LabelModel(cardinality=total_classes, verbose=True)
    label_model.fit(L_train=L_mat)
    merged_labels = label_model.predict(L=L_mat, tie_break_policy="abstain")
    return merged_labels


def majority_vote_merge(L_mat, total_classes):
    majority_model = MajorityLabelVoter(cardinality=total_classes)
    merged_labels = majority_model.predict(L=L_mat)
    return merged_labels
