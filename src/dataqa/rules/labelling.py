import json

from dataqa.ml import distant_supervision as ds, sentiment as ml_sentiment
from dataqa.nlp import nlp_ner as nlp_ner, nlp_classification


def get_regex_matcher(type_, word, label):
    if type_ == 'exact case-sensitive':
        matcher = nlp_classification.get_regex_matcher_case_sensitive(word, label, ds.ABSTAIN, False)
    elif type_ == 'exact case-insensitive':
        matcher = nlp_classification.get_regex_matcher_case_insensitive(word, label, ds.ABSTAIN, False)
    else:
        raise Exception(f"Rule type {type_} not supported.")
    return matcher


def get_token_matcher(type_, word, label):
    if type_ == 'token case-sensitive':
        matcher = nlp_classification.get_token_matcher_case_sensitive(word, label, ds.ABSTAIN, False)
    elif type_ == 'token case-insensitive':
        matcher = nlp_classification.get_token_matcher_case_insensitive(word, label, ds.ABSTAIN, False)
    else:
        raise Exception(f"Rule type {type_} not supported.")
    return matcher


def get_entity_matcher(type_, word, label):
    try:
        entity_type = type_.split()[1].upper()
    except:
        raise Exception(f"Missing the entity type {type_}.")

    if entity_type not in ["PERSON", "NORP", "ORG", "GPE", "DATE", "TIME", "MONEY", "QUANTITY"]:
        raise Exception(f"Entity type {entity_type} from entity {type_} not supported.")

    matcher = nlp_classification.get_entity_matcher(word, entity_type, label, ds.ABSTAIN, False)
    return matcher


def create_ordered_match_lf(rule):
    all_ordered_rules, label, negative_match, sentence_match = parse_classification_rule(rule)
    lf = ds.ordered_match_lf(all_ordered_rules,
                             label,
                             rule.id,
                             negative_match,
                             sentence_match)
    return lf


def create_non_ordered_match_lf(rule):
    all_ordered_rules, label, negative_match, sentence_match = parse_classification_rule(rule)
    lf = ds.non_ordered_match_lf(all_ordered_rules,
                                 label,
                                 rule.id,
                                 negative_match,
                                 sentence_match)
    return lf


def create_sentiment_match_lf(rule):
    try:
        params = json.loads(rule.params)
        score = float(params['score'])
        is_gt = params['is_gt']
        label = int(rule.class_id)
        sentiment = params['sentiment']
        if sentiment not in ml_sentiment.SENTIMENT_COL_MAPPING.keys():
            raise Exception(f"Sentiment {sentiment} not supported.")
    except:
        raise Exception(f"Exception encountered when loading rule parameters: {rule.params}.")

    lf = ds.create_sentiment_lf(sentiment,
                                score,
                                is_gt,
                                label,
                                rule.id)
    return lf


def get_new_rule_labels_mat(df, new_rules):
    lfs = []
    for rule in new_rules:
        # create labelling function
        if rule.rule_type == 'ordered':
            lf = create_ordered_match_lf(rule)
        elif rule.rule_type == 'non-ordered':
            lf = create_non_ordered_match_lf(rule)
        elif rule.rule_type == 'sentiment':
            lf = create_sentiment_match_lf(rule)
        else:
            raise Exception("rule not supported")
            # load text
        lfs.append(lf)

    # apply the lfs
    rule_labels_mat = ds.apply_lfs(df, lfs)
    return rule_labels_mat


def create_regex_span_lf(regex,
                         match_num_entitities,
                         entity_id):
    fn = lambda df: nlp_ner.get_all_regex_entities(df,
                                                   regex,
                                                   match_num_entitities,
                                                   entity_id)
    return fn


def create_noun_phrase_regex_lf(sentence, text_regex, noun_phrase_regex, entity_id):
    fn = lambda df: nlp_ner.get_all_noun_phrase_regex_entities(df,
                                                               sentence,
                                                               text_regex,
                                                               noun_phrase_regex,
                                                               entity_id)
    return fn


def apply_rules_ner(df, entity_fns):
    all_entity_spans = []
    for entity_fn in entity_fns:
        entity_spans = entity_fn(df)
        all_entity_spans.append(entity_spans)
    all_entity_spans = [list(doc_rules) for doc_rules in (zip(*all_entity_spans))]
    return all_entity_spans


def get_new_spans(df, rules):
    """
    Returns a 3-level nested list where level 1: docs, level 2: rules and level 3: spans.

    So the output is a list:
    [spans_document_1, spans_document_2, ..., spans_document_N]
    where spans_document_i are all the rule spans for that document represented by a list:
    [rule_1, rule_2, ..., rule_R]
    where each rule is represented by a list of spans (can be an empty list if no spans):
    [span_1, span_2, ..., span_N]

    So we have: [[[span_1_rule_1_doc_1, span_2_rule_1_doc_1], [span_1_rule_2_doc_1]]]

    :param df:
    :param rules:
    :return:
    """
    entity_fns = []
    for rule in rules:
        if rule.rule_type == "noun_phrase_regex":
            sentence, text_regex, noun_phrase_regex, entity_id = parse_ner_noun_phrase_regex_rule(rule)
            entity_fns.append(create_noun_phrase_regex_lf(sentence,
                                                          text_regex,
                                                          noun_phrase_regex,
                                                          entity_id))
        elif rule.rule_type == "entity_regex":
            regex, match_num_entitities, entity_id = parse_ner_regex_rule(rule)
            entity_fns.append(create_regex_span_lf(regex,
                                                   match_num_entitities,
                                                   entity_id))
        else:
            raise Exception(f"Rule type {rule.rule_type} is not supported for named-entity-recognition projects.")
    all_entity_spans = apply_rules_ner(df, entity_fns)
    return all_entity_spans


def parse_classification_rule(rule):
    params = json.loads(rule.params)
    label = int(rule.class_id)
    rules = params['rules']
    negative_match = not (params['contains'])
    sentence_match = bool(params['sentence'])
    all_ordered_rules = []
    for item in rules:
        word = item['word']
        type_ = item['type']
        if type_.startswith('exact'):
            matcher = get_regex_matcher(type_, word, label)
        elif type_.startswith('token'):
            matcher = get_token_matcher(type_, word, label)
        elif type_.startswith('entity'):
            matcher = get_entity_matcher(type_, word, label)
        elif type_ == 'lemma':
            matcher = nlp_classification.get_lemma_matcher(word, label, ds.ABSTAIN, False)
        else:
            raise Exception(f"Rule type {type_} not supported.")

        all_ordered_rules.append(matcher)
    return all_ordered_rules, label, negative_match, sentence_match


def parse_ner_noun_phrase_regex_rule(rule):
    params = json.loads(rule.params)
    sentence = bool(params["sentence"])
    text_regex = params["text_regex"]
    noun_phrase_regex = params["noun_phrase_regex"]
    class_id = int(rule.class_id)
    return sentence, text_regex, noun_phrase_regex, class_id


def parse_ner_regex_rule(rule):
    params = json.loads(rule.params)
    regex = params["regex"]
    match_num_entitities = int(params["n"])
    class_id = int(rule.class_id)
    return regex, match_num_entitities, class_id