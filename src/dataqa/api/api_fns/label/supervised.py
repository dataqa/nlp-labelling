import pandas as pd

from dataqa.api.api_fns.rules import rule_fns
from dataqa.constants import PROJECT_TYPE_CLASSIFICATION, PROJECT_TYPE_NER, SPAN_KEYS, SPACY_COLUMN_NAME
from dataqa.elasticsearch.client.utils import classification as classification_es, ner as ner_es
from dataqa.nlp import nlp_ner as nlp_ner, spacy_file_utils as spacy_file_utils


def get_labelled_docs(es_uri, index_name, rule_ids):
    docs, labelled_doc_ids = classification_es.get_labelled_docs(es_uri, index_name)

    (all_labels_mat,
     merged_labels,
     manual_labels) = rule_fns.get_mats_from_es_docs(docs, rule_ids)

    return all_labels_mat, merged_labels, manual_labels, labelled_doc_ids


def read_docs_with_rules(es_uri,
                         index_name,
                         project_type,
                         from_,
                         size,
                         session_id,
                         has_ground_truth_labels,
                         rule_id):
    try:
        rule_id = int(rule_id)
    except:
        raise Exception(f"Rule_id {rule_id} not an int")

    input_params = (es_uri,
                    index_name,
                    from_,
                    size,
                    session_id,
                    has_ground_truth_labels)

    if rule_id == -1:
        if project_type == PROJECT_TYPE_CLASSIFICATION:
            results = classification_es.read_docs_from_all_rules(*input_params)
        else:
            results = ner_es.read_docs_from_all_rules(*input_params)
    elif rule_id == -2:
        if project_type == PROJECT_TYPE_CLASSIFICATION:
            results = classification_es.read_docs_with_no_rule(*input_params)
        else:
            results = ner_es.read_docs_with_no_rule(*input_params)
    else:
        if project_type == PROJECT_TYPE_CLASSIFICATION:
            results = classification_es.read_docs_from_single_rule(*input_params, rule_id)
        else:
            results = ner_es.read_docs_from_single_rule(*input_params, rule_id)

    return results


def read_docs_with_manual_labels(es_uri,
                                 index_name,
                                 project_type,
                                 from_,
                                 size,
                                 session_id,
                                 has_ground_truth_labels,
                                 label):
    input_params = (es_uri, index_name, from_, size, session_id)

    if label == "none":
        # Docs that were not labelled
        if project_type == PROJECT_TYPE_CLASSIFICATION:
            results = classification_es.read_unlabelled_docs(*input_params, has_ground_truth_labels)
        else:
            results = ner_es.read_unlabelled_docs(*input_params)
    elif label == "empty":
        # Docs that were not labelled
        results = ner_es.read_docs_with_empty_manual_labels(*input_params)
    else:
        if project_type == PROJECT_TYPE_CLASSIFICATION:
            results = classification_es \
                .read_docs_with_manual_label_classification(*input_params, has_ground_truth_labels, label)
        else:
            results = ner_es.read_docs_with_manual_label_ner(*input_params, label)
    return results


def check_entity_form_input(spans):
    for span in spans:
        if len(span) == 0:
            continue
        if not all(k in span for k in SPAN_KEYS):
            raise Exception(f"Need to send all these keys in a span: {SPAN_KEYS}."
                            f"Current span: {span}")
    return spans


def check_label_arg(label, project_type):
    if label == "none":
        return label
    if project_type == PROJECT_TYPE_NER and label == "empty":
        return label
    try:
        label = int(label)
    except:
        raise Exception(f"Label {label} not supported.")
    return label


def get_correct_spans(project, spans, doc_id):
    """
    Need to make sure it aligns with tokens, that it is in the same sentence and no more than
    N tokens.
    """
    # 1. get the document from
    df = read_spacy_doc_id_into_df(doc_id,
                                   project.spacy_binary_filepath)

    # 2. get the spans
    corrected_spans = nlp_ner.get_spans_from_start_end(df, spans)

    return corrected_spans


def read_spacy_doc_id_into_df(doc_id, spacy_binary_filepath):
    spacy_docs = spacy_file_utils.deserialise_spacy_doc_id(spacy_binary_filepath,
                                                           doc_id)
    df = pd.DataFrame([[spacy_docs]], columns=[SPACY_COLUMN_NAME])
    return df