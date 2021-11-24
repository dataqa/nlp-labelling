import csv
import io
import requests

from dataqa.constants import (ES_GROUND_TRUTH_NAME_FIELD,
                              ES_TEXT_FIELD_NAME,
                              PROJECT_TYPE_NER,
                              TABLE_COLUMN_NAMES_FIELD_NAME,
                              TABLE_ROWS_FIELD_NAME,
                              TABLE_ROWS_CHAR_STARTS_FIELD_NAME)
from dataqa.elasticsearch.client import queries
from dataqa.elasticsearch.client.utils.common import (get_unlabelled_docs_query,
                                                      scroll_through,
                                                      fill_manual_spans,
                                                      QueryResults)


def get_flattened_rule_spans(rules_field):
    """
    Get all the rule spans as a single list.
    """
    all_rule_spans = []
    for rule in rules_field:
        for label in rule["label"]:
            all_rule_spans.append(label)
    return all_rule_spans


def get_manual_label_if_exists_else_rule_labels(hit, rule_id=None):
    if "manual_label" in hit:
        return hit["manual_label"].get("label", [])
    if rule_id:
        return extract_label_from_rule(hit, rule_id)
    return hit["predicted_label"]


def process_es_docs_ner(query, es_uri, index_name, rule_id):
    """
    If rule_id is None, we return the spans from the merged predicted labels,
    otherwise we return the spans from the rule with id rule_id.
    """
    response = requests.get(f"{es_uri}/{index_name}/_search",
                            headers={"Content-type": "application/json"},
                            json=query)
    response_json = response.json()
    total = response_json["hits"]["total"]["value"]

    if rule_id == -1:
        # all rules
        get_label = lambda hit: get_manual_label_if_exists_else_rule_labels(hit)
    elif rule_id == -2:
        # no rules
        get_label = lambda hit: hit.get("manual_label", {}).get("label", [])
    elif rule_id == -3:
        # read unlabelled docs
        get_label = lambda hit: hit.get("manual_label", {}).get("label", [])
    else:
        # get results from specific rule_id
        get_label = lambda hit: get_manual_label_if_exists_else_rule_labels(hit, rule_id)

    documents = [{"text": hit["_source"][ES_TEXT_FIELD_NAME],
                  "is_table": hit["_source"].get("is_table") == 'true',
                  TABLE_COLUMN_NAMES_FIELD_NAME: hit["_source"][TABLE_COLUMN_NAMES_FIELD_NAME]
                  if hit["_source"].get("is_table") == 'true' else [],
                  TABLE_ROWS_FIELD_NAME: hit["_source"][TABLE_ROWS_FIELD_NAME]
                  if hit["_source"].get("is_table") == 'true' else [],
                  TABLE_ROWS_CHAR_STARTS_FIELD_NAME: hit["_source"][TABLE_ROWS_CHAR_STARTS_FIELD_NAME]
                  if hit["_source"].get("is_table") == 'true' else [],
                  "label": get_label(hit["_source"]),
                  "rules": get_flattened_rule_spans(hit["_source"].get("rules", []))}
                 for hit in response_json["hits"]["hits"]]

    doc_ids = [hit["_source"]["id"] for hit in response_json["hits"]["hits"]]

    query_results = QueryResults(total, documents, doc_ids, None)
    return query_results


def extract_label_from_rule(hit, rule_id):
    for rule in hit["rules"]:
        if rule["rule_id"] == rule_id:
            return rule["label"]
    return []


def read_docs_with_empty_manual_labels(es_uri,
                                       index_name,
                                       from_,
                                       size,
                                       session_id):
    query = queries.docs_with_empty_manual_entities_query(from_,
                                                          size,
                                                          session_id)
    field_id = -2
    query_results = process_es_docs_ner(query, es_uri, index_name, field_id)
    return query_results


def read_docs_with_manual_label_ner(es_uri,
                                    index_name,
                                    from_,
                                    size,
                                    session_id,
                                    label):
    query = queries.docs_with_manual_label_query(PROJECT_TYPE_NER,
                                                 from_,
                                                 size,
                                                 session_id,
                                                 label)
    field_id = -3

    query_results = process_es_docs_ner(query, es_uri, index_name, field_id)
    return query_results


def add_entity(es_uri, index_name, doc_id, spans, session_id):
    query = queries.add_entity_query(spans, session_id)
    response = requests.post(f"{es_uri}/{index_name}/_update/{doc_id}",
                             headers={"Content-type": "application/json"},
                             json=query)

    if response.status_code != 200:
        raise Exception(f"Error while updating entity for document {doc_id}.")


def format_rule_spans(rules, rule_ids):
    spans = []
    rules = dict((rule["rule_id"], rule["label"]) for rule in rules)
    for rule_id in rule_ids:
        spans.append(rules.get(rule_id, []))
    return spans


def get_all_existing_rule_spans(es_uri, index_name, rule_ids, num_docs):
    query = queries.docs_with_any_rule_query()
    hits = scroll_through(es_uri, index_name, query)

    rule_results = [(hit["id"],
                     format_rule_spans(hit["rules"], rule_ids)) for hit in hits]

    predicted_label_results = [(hit["id"],
                                hit.get("predicted_label", [])) for hit in hits]

    rule_results = dict(rule_results)
    rule_results = [rule_results.get(doc_id, [[] for _ in range(len(rule_ids))]) for doc_id in range(num_docs)]

    predicted_label_results = dict(predicted_label_results)
    predicted_label_results = [predicted_label_results.get(doc_id, []) for doc_id in range(num_docs)]

    return rule_results, predicted_label_results


def get_all_rule_or_manual_entity_spans(es_uri, index_name, rule_ids, num_docs):
    query = queries.docs_with_any_rule_or_manual_label_query()
    hits = scroll_through(es_uri, index_name, query)

    rule_results = [(hit["id"],
                     format_rule_spans(hit.get("rules", []), rule_ids)) for hit in hits]

    predicted_label_results = [(hit["id"],
                                hit.get("predicted_label", [])) for hit in hits]

    # manual_label_results will be None (if no manual label)
    manual_label_results = [(hit["id"],
                             fill_manual_spans(hit.get("manual_label"))) for hit in hits]

    rule_results = dict(rule_results)
    rule_results = [rule_results.get(doc_id, [[] for _ in range(len(rule_ids))]) for doc_id in range(num_docs)]

    predicted_label_results = dict(predicted_label_results)
    predicted_label_results = [predicted_label_results.get(doc_id, []) for doc_id in range(num_docs)]

    manual_label_results = dict(manual_label_results)
    manual_label_results = [manual_label_results.get(doc_id, None) for doc_id in range(num_docs)]

    return rule_results, predicted_label_results, manual_label_results


def get_all_manual_entity_spans(es_uri, index_name, rule_ids, num_docs):
    query = queries.all_docs_with_manual_entities()
    hits = scroll_through(es_uri, index_name, query)

    rule_results = [(hit["id"],
                     format_rule_spans(hit.get("rules", []), rule_ids)) for hit in hits]

    predicted_label_results = [(hit["id"],
                                hit.get("predicted_label", [])) for hit in hits]

    manual_label_results = [(hit["id"],
                             fill_manual_spans(hit["manual_label"])) for hit in hits]

    rule_results = dict(rule_results)
    rule_results = [rule_results.get(doc_id, [[] for _ in range(len(rule_ids))]) for doc_id in range(num_docs)]

    predicted_label_results = dict(predicted_label_results)
    predicted_label_results = [predicted_label_results.get(doc_id, []) for doc_id in range(num_docs)]

    manual_label_results = dict(manual_label_results)
    manual_label_results = [manual_label_results.get(doc_id, None) for doc_id in range(num_docs)]

    return (rule_results,
            predicted_label_results,
            manual_label_results)


def read_unlabelled_docs(es_uri,
                         index_name,
                         from_,
                         size,
                         session_id):
    """
    Read documents from ES that do not have a manual label.

    We return manual labels because the user might have labelled some docs during the
    current session and we would like to return them if queried.
    """
    query = get_unlabelled_docs_query(from_,
                                      size,
                                      session_id)

    query_results = process_es_docs_ner(query, es_uri, index_name, -3)

    return query_results


def read_docs_from_single_rule(es_uri,
                               index_name,
                               from_,
                               size,
                               session_id,
                               has_ground_truth_labels,
                               rule_id):
    query = queries.docs_with_predicted_labels_query(from_,
                                                     size,
                                                     session_id,
                                                     ground_truth_field=None,
                                                     rule_id=rule_id)
    query_results = process_es_docs_ner(query, es_uri, index_name, rule_id)

    return query_results


def read_docs_from_all_rules(es_uri,
                             index_name,
                             from_,
                             size,
                             session_id,
                             has_ground_truth_labels=False):
    query = queries.docs_with_predicted_labels_query(from_,
                                                     size,
                                                     session_id)
    results = process_es_docs_ner(query, es_uri, index_name, -1)

    return results


def read_docs_with_no_rule(es_uri,
                           index_name,
                           from_,
                           size,
                           session_id,
                           has_ground_truth_labels=False):
    query = queries.docs_with_no_rule_query(from_,
                                            size,
                                            session_id,
                                            ES_GROUND_TRUTH_NAME_FIELD)

    query_results = process_es_docs_ner(query, es_uri, index_name, -2)
    return query_results


def export_text_or_table(hit):
    if hit["is_table"] == 'true':
        column_names = hit[TABLE_COLUMN_NAMES_FIELD_NAME]
        rows = hit[TABLE_ROWS_FIELD_NAME]

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(column_names)
        for row in rows:
            writer.writerow(row)
        return output.getvalue()
    else:
        return hit["text"]


def export_spans(es_uri, index_name, is_wiki):
    query = queries.docs_with_any_rule_or_manual_label_query()

    hits = scroll_through(es_uri, index_name, query)

    if is_wiki:
        docs = [(hit["id"],
                 hit["url"],
                 export_text_or_table(hit),
                 hit["is_table"],
                 hit.get("manual_label", {}).get("label"),
                 dict((rule["rule_id"], rule["label"]) for rule in hit.get("rules", {})))
                for hit in hits]
    else:
        docs = [(hit["id"],
                 hit.get("manual_label", {}).get("label"),
                 dict((rule["rule_id"], rule["label"]) for rule in hit.get("rules", {})))
                for hit in hits]

    results = sorted(docs, key=lambda x: x[0])

    return results
