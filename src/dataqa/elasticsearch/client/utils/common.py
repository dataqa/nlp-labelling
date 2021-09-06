import requests

from dataqa.constants import (ES_TEXT_FIELD_NAME,
                              ES_GROUND_TRUTH_LABEL_FIELD)

from dataqa.elasticsearch.client import queries
from collections import namedtuple

QueryResults = namedtuple('QueryResults',
                          ['total', 'documents', 'doc_ids', 'ground_truth_labels'])


def get_es_uri(config):
    return f"{config['ES_HOST']}:{config['ES_HTTP_PORT']}"


def bulk_upload(es_uri, request_body):
    response = requests.post(es_uri + "/_bulk",
                             headers={"Content-type": "application/x-ndjson"},
                             data=request_body)
    if response.status_code != 200:
        raise Exception("Upload did not work")
    if response.json()["errors"]:
        raise Exception("Errors during ES upload")


def get_total_documents(es_uri, index_name):
    response = requests.get(f"{es_uri}/{index_name}/_count")
    count = response.json()["count"]
    return count


def search_docs(es_uri, index_name, query):
    response = requests.get(f"{es_uri}/{index_name}/_search",
                            headers={"Content-type": "application/json"},
                            json=query)
    return response.json()


def get_unlabelled_docs_query(from_,
                              size,
                              session_id):
    """
    Read documents from ES that do not have a manual label.

    We return manual labels because the user might have labelled some docs during the
    current session and we would like to return them if queried.
    """
    query = queries.all_docs_query(from_,
                                   size,
                                   session_id,
                                   ES_TEXT_FIELD_NAME,
                                   ES_GROUND_TRUTH_LABEL_FIELD)
    return query


def scroll_through(es_uri, index_name, query):
    response = requests.post(f"{es_uri}/{index_name}/_search?scroll=1m",
                             headers={"Content-type": "application/json"},
                             json=query)

    if response.status_code != 200:
        raise Exception(f"Error doing initial scrolling through index.")

    response_json = response.json()
    hits = response_json["hits"]["hits"]
    results = [hit["_source"] for hit in hits]

    scroll_id = response_json["_scroll_id"]
    while (hits):
        response = requests.post(f"{es_uri}/_search/scroll",
                                 headers={"Content-type": "application/json"},
                                 json={"scroll": "1m", "scroll_id": scroll_id})
        response_json = response.json()
        hits = response_json["hits"]["hits"]
        scroll_id = response_json["_scroll_id"]

        results.extend([hit["_source"] for hit in hits])

    return results


def fill_manual_spans(manual_label):
    if manual_label is None:
        # no manual label
        return None
    if not "label" in manual_label:
        # manual_label exists but does not have a label (this document has been labelled
        # but has no entities
        return []
    return manual_label["label"]


def create_new_index(es_uri, index_name, mapping, settings=None):
    json_data = {"mappings": mapping}

    if settings is not None:
        json_data["settings"] = settings

    response = requests.put(f"{es_uri}/{index_name}",
                            headers={'Content-Type': 'application/json'},
                            json=json_data)

    if response.status_code != 200:
        raise Exception(f"Error doing creation of index {index_name}.")


def delete_index(es_uri, index_name):
    response = requests.delete(f"{es_uri}/{index_name}",
                               headers={'Content-Type': 'application/json'})

    if response.status_code != 200:
        print(f"Failed to delete index {index_name}", response)


def format_rules_array(rules_array):
    rules_dict = {}
    for rule in rules_array:
        rules_dict[rule["rule_id"]] = rule["label"]
    return rules_dict