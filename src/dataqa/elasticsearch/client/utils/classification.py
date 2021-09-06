import requests

from dataqa.constants import (ES_TEXT_FIELD_NAME,
                              ES_GROUND_TRUTH_LABEL_FIELD,
                              PROJECT_TYPE_CLASSIFICATION)
from dataqa.elasticsearch.client import queries
from dataqa.elasticsearch.client.utils.common import (scroll_through,
                                                      format_rules_array,
                                                      get_unlabelled_docs_query,
                                                      QueryResults)


def process_es_docs_classification(query, es_uri, index_name, has_ground_truth_labels):
    response = requests.get(f"{es_uri}/{index_name}/_search",
                            headers={"Content-type": "application/json"},
                            json=query)
    response_json = response.json()
    total = response_json["hits"]["total"]["value"]

    documents = []
    doc_ids = []
    ground_truth_labels = []
    for hit in response_json["hits"]["hits"]:
        distinct_rules = sorted(set([rule["label"] for rule in hit["_source"].get("rules", [])]))

        documents.append({"text": hit["_source"][ES_TEXT_FIELD_NAME],
                          "label": hit["_source"].get("manual_label", {}).get("label"),
                          "rules": distinct_rules})

        doc_ids.append(hit["_source"]["id"])

        if has_ground_truth_labels:
            ground_truth_labels.append(hit["_source"][ES_GROUND_TRUTH_LABEL_FIELD])

    query_results = QueryResults(total, documents, doc_ids, ground_truth_labels)

    return query_results


def read_docs_with_manual_label_classification(es_uri,
                                               index_name,
                                               from_,
                                               size,
                                               session_id,
                                               has_ground_truth_labels,
                                               label):
    query = queries.docs_with_manual_label_query(PROJECT_TYPE_CLASSIFICATION,
                                                 from_,
                                                 size,
                                                 session_id,
                                                 ES_TEXT_FIELD_NAME,
                                                 label)

    query_results = process_es_docs_classification(query,
                                                   es_uri,
                                                   index_name,
                                                   has_ground_truth_labels)

    return query_results


def label_doc(es_uri,
              index_name,
              doc_id,
              manual_label,
              session_id):
    response = requests.post(f"{es_uri}/{index_name}/_update/{doc_id}",
                             headers={"Content-type": "application/json"},
                             json={"doc": {"manual_label": {"label": manual_label,
                                                            "session_id": session_id}}})

    if response.status_code != 200:
        raise Exception(f"Error while updating the label for document {doc_id}.")


def get_labelled_docs(es_uri, index_name):
    query = {
        "query": {
            "exists": {
                "field": "manual_label"
            }
        },
        "_source": ["manual_label", "rules", "predicted_label", "id"]
    }

    hits = scroll_through(es_uri, index_name, query)

    docs = [{"rules": format_rules_array(hit.get("rules", [])),
             "predicted_label": hit.get("predicted_label"),
             "manual_label": hit["manual_label"]["label"]}
            for hit in hits]

    doc_ids = [hit["id"] for hit in hits]

    return docs, doc_ids


def get_docs_specific_rule(es_uri, index_name, rule_id):
    """
    Returns rules and merged_label of specific doc_ids.
    """
    query = queries.docs_specific_rule_query(rule_id)

    hits = scroll_through(es_uri, index_name, query)
    hits = sorted(hits, key=lambda x: x["id"])

    docs = []
    doc_ids = []

    for hit in hits:
        doc = {"rules": format_rules_array(hit.get("rules", [])),
               "predicted_label": hit.get("predicted_label"),
               "manual_label": hit.get("manual_label", {}).get("label"),
               "ground_truth_label": hit.get(ES_GROUND_TRUTH_LABEL_FIELD)}

        docs.append(doc)
        doc_ids.append(hit["id"])

    return docs, doc_ids


def get_specific_docs(es_uri, index_name, doc_ids):
    """
    Returns rules and merged_label of specific doc_ids.
    """
    query = queries.specific_doc_ids_query(doc_ids)
    response = requests.post(f"{es_uri}/{index_name}/_mget",
                             headers={"Content-type": "application/json"},
                             json=query)

    if response.status_code != 200:
        raise Exception(f"Error while getting all the doc_ids.")

    response_json = response.json()
    hits = response_json["docs"]
    docs = dict([(hit["_source"]["id"],
                  {"rules": format_rules_array(hit["_source"].get("rules", [])),
                   "predicted_label": hit["_source"].get("predicted_label")})
                 for hit in hits])

    docs = [docs[id_] for id_ in doc_ids]
    return docs


def read_unlabelled_docs(es_uri,
                         index_name,
                         from_,
                         size,
                         session_id,
                         has_ground_truth_labels):
    """
    Read documents from ES that do not have a manual label.

    We return manual labels because the user might have labelled some docs during the
    current session and we would like to return them if queried.
    """
    query = get_unlabelled_docs_query(from_,
                                      size,
                                      session_id)

    query_results = process_es_docs_classification(query,
                                                   es_uri,
                                                   index_name,
                                                   has_ground_truth_labels)

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
                                                     ES_TEXT_FIELD_NAME,
                                                     ES_GROUND_TRUTH_LABEL_FIELD,
                                                     rule_id)
    query_results = process_es_docs_classification(query,
                                                   es_uri,
                                                   index_name,
                                                   has_ground_truth_labels)

    return query_results


def read_docs_from_all_rules(es_uri,
                             index_name,
                             from_,
                             size,
                             session_id,
                             has_ground_truth_labels):
    query = queries.docs_with_predicted_labels_query(from_,
                                                     size,
                                                     session_id,
                                                     ES_TEXT_FIELD_NAME,
                                                     ES_GROUND_TRUTH_LABEL_FIELD)

    results = process_es_docs_classification(query,
                                             es_uri,
                                             index_name,
                                             has_ground_truth_labels)

    return results


def read_docs_with_no_rule(es_uri,
                           index_name,
                           from_,
                           size,
                           session_id,
                           has_ground_truth_labels):
    query = queries.docs_with_no_rule_query(from_,
                                            size,
                                            session_id,
                                            ES_TEXT_FIELD_NAME,
                                            ES_GROUND_TRUTH_LABEL_FIELD)

    query_results = process_es_docs_classification(query,
                                                   es_uri,
                                                   index_name,
                                                   has_ground_truth_labels)
    return query_results


def get_all_ground_truth_labels(es_uri, index_name):
    query = {
        "query": {
            "match_all": {}
        },
        "_source": [ES_GROUND_TRUTH_LABEL_FIELD, "predicted_label", "id"],
        "size": 1000
    }

    hits = scroll_through(es_uri, index_name, query)

    docs = [(hit["id"],
             {"ground_truth_label": hit[ES_GROUND_TRUTH_LABEL_FIELD],
              "predicted_label": hit.get("predicted_label")})
            for hit in hits]

    docs = [x for _, x in sorted(docs, key=lambda pair: pair[0])]

    return docs


def export_labels(es_uri, index_name):
    query = queries.docs_with_any_rule_or_manual_label_query()

    hits = scroll_through(es_uri, index_name, query)

    docs = [(hit["id"],
             hit.get("manual_label", {}).get("label"),
             hit.get("predicted_label"),
             format_rules_array(hit.get("rules", []))) for hit in hits]

    results = sorted(docs, key=lambda x: x[0])

    return results


def add_ground_truth_ids_to_es(es_uri, index_name, class_mapping):
    query = queries.add_ground_truth_ids_query(class_mapping)
    response = requests.post(f"{es_uri}/{index_name}/_update_by_query",
                             headers={"Content-type": "application/json"},
                             json=query)

    if response.status_code != 200:
        print(f"Failed to add ground-truth labels", response)
        return False

    return True