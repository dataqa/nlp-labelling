"""Functions to perform text classification."""

import spacy
from spacy.tokens import DocBin
from spacy.matcher import Matcher
from spacy.strings import hash_string
import re
from abc import ABC, abstractmethod
import uuid
import dataqa.nlp.spacy_nlp as spacy_nlp


class GenericMatcher(ABC):

    def __init__(self, matcher, name, label, abstain_label, negative_match=False):
        self.matcher = matcher
        self.name = name
        self.label = label
        self.abstain_label = abstain_label
        self.negative_match = negative_match
        super().__init__()

    @abstractmethod
    def label_doc(self, doc):
        # should return label
        pass

    @abstractmethod
    def has_match(self, doc):
        # should return boolean
        pass

    @abstractmethod
    def get_matching_spans(self, doc):
        # should return spans
        pass


class RegexMatcher(GenericMatcher):

    def has_match(self, doc):
        if self.matcher.search(doc.text):
            return True
        return False

    def label_doc(self, doc):
        matches = self.matcher.search(doc.text)
        if bool(self.negative_match) != bool(matches):
            return self.label
        return self.abstain_label

    def get_matching_spans(self, doc):
        spans = []
        for match in self.matcher.finditer(doc.text):
            spans.append((match.start(), match.end()))
        return spans


class SpacyTokenMatcher(GenericMatcher):

    def has_match(self, doc):
        if type(doc) == spacy.tokens.span.Span:
            # if we are matching on a sent.ence level
            matches = self.matcher(spacy_nlp.nlp(doc.text))
        else:
            # if we are matching on the whole document
            matches = self.matcher(doc)
        if matches:
            return True
        return False

    def label_doc(self, doc):
        matches = self.matcher(doc)
        if bool(self.negative_match) != bool(matches):
            return self.label
        return self.abstain_label

    def get_matching_spans(self, doc):
        if type(doc) == spacy.tokens.span.Span:
            matches = self.matcher(spacy_nlp.nlp(doc.text))
        else:
            matches = self.matcher(doc)
        spans = []
        for match in matches:
            span_start = match[1]
            span_end = match[2]
            try:
                a = doc[span_start].idx
                b = doc[span_end].idx
                spans.append((a, b))
            except:
                print("error")
        return spans


class SpacyEntityMatcher(GenericMatcher):

    @classmethod
    def get_matcher(cls, name_matcher, regex_expression, entity_type):
        regex = re.compile(f"{regex_expression}")
        match_id = hash_string(name_matcher)

        def match_entities(spacy_doc):
            matches = []
            for ent in spacy_doc.ents:
                if ent.label_ == entity_type and regex.search(ent.text):
                    matches.append((match_id, ent.start_char, ent.end_char))
            return matches

        return match_entities

    def has_match(self, doc):
        if type(doc) == spacy.tokens.span.Span:
            matches = self.matcher(spacy_nlp.nlp(doc.text))
        else:
            matches = self.matcher(doc)
        if matches:
            return True
        return False

    def label_doc(self, doc):
        matches = self.matcher(doc)
        if bool(self.negative_match) != bool(matches):
            return self.label
        return self.abstain_label

    def get_matching_spans(self, doc):
        if type(doc) == spacy.tokens.span.Span:
            matches = self.matcher(spacy_nlp.nlp(doc.text))
        else:
            matches = self.matcher(doc)
        spans = []
        for match in matches:
            spans.append((match[1], match[2]))
        return spans


def get_lemma_matcher(word, label, abstain_label, negative_match):
    matcher = Matcher(spacy_nlp.nlp.vocab)
    matcher.add(f"lemma_{word}_lf", None, [{"LEMMA": word.lower()}])
    token_matcher = SpacyTokenMatcher(matcher=matcher,
                                      name=str(uuid.uuid1()),
                                      label=label,
                                      abstain_label=abstain_label,
                                      negative_match=negative_match)
    return token_matcher


def get_token_matcher_case_sensitive(word, label, abstain_label, negative_match):
    matcher = Matcher(spacy_nlp.nlp.vocab)
    matcher.add(f"word_{word}_lf", None, [{"TEXT": {"REGEX": word}}])
    token_matcher = SpacyTokenMatcher(matcher=matcher,
                                      name=str(uuid.uuid1()),
                                      label=label,
                                      abstain_label=abstain_label,
                                      negative_match=negative_match)
    return token_matcher


def get_token_matcher_case_insensitive(word, label, abstain_label, negative_match):
    matcher = Matcher(spacy_nlp.nlp.vocab)
    matcher.add(f"word_{word}_lf", None, [{"LOWER": {"REGEX": word}}])
    token_matcher = SpacyTokenMatcher(matcher=matcher,
                                      name=str(uuid.uuid1()),
                                      label=label,
                                      abstain_label=abstain_label,
                                      negative_match=negative_match)
    return token_matcher


def get_regex_matcher_case_sensitive(word, label, abstain_label, negative_match):
    matcher = re.compile(f"{word}")
    regex_matcher = RegexMatcher(matcher=matcher,
                                 name=str(uuid.uuid1()),
                                 label=label,
                                 abstain_label=abstain_label,
                                 negative_match=negative_match)
    return regex_matcher


def get_regex_matcher_case_insensitive(word, label, abstain_label, negative_match):
    matcher = re.compile(f"(?i){word}")
    regex_matcher = RegexMatcher(matcher=matcher,
                                 name=str(uuid.uuid1()),
                                 label=label,
                                 abstain_label=abstain_label,
                                 negative_match=negative_match)
    return regex_matcher


def get_entity_matcher(word, entity_type, label, abstain_label, negative_match):
    matcher = SpacyEntityMatcher.get_matcher(f"entity_{entity_type}_{word}_lf",
                                             word,
                                             entity_type)

    entity_matcher = SpacyEntityMatcher(matcher=matcher,
                                        name=str(uuid.uuid1()),
                                        label=label,
                                        abstain_label=abstain_label,
                                        negative_match=negative_match)
    return entity_matcher
