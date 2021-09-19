from collections import namedtuple
import requests

from dataqa.constants import SINGLE_ENTITY_DOCS_PAGE_SIZE
from dataqa.elasticsearch.client.queries import top_docs_per_entity_query
from dataqa.elasticsearch.client.utils.common import QueryResults

KbSuggestion = namedtuple('KbSuggestion', ['name', 'id', 'colour'])


def get_kb(es_uri,
           kb_index_name,
           input):
    query = {
        "query": {
            "wildcard": {
                "name": {
                    "value": f"*{input}*"
                }
            }
        },
        "_source": ["name", "id"],
        "size": 100
    }

    response = requests.get(f"{es_uri}/{kb_index_name}/_search",
                            headers={"Content-type": "application/json"},
                            json=query)

    response_json = response.json()
    total = response_json["hits"]["total"]["value"]

    if total > 0:
        results = [{"name": hit["_source"]["name"],
                    "id": hit["_source"]["id"]} for hit in response_json["hits"]["hits"]]
        return results
    return []


def filter_label(labels, filter_id):
    return [label for label in labels if label["id"] == filter_id]


def get_top_entity_documents(es_uri, mentions_index_name, entities, docs_per_entity):
    """
    Return the first document for a given list of entity ids
    """
    entity_ids = [x.id for x in entities]

    query = top_docs_per_entity_query(entity_ids, docs_per_entity)

    response = requests.post(f"{es_uri}/{mentions_index_name}/_search",
                             headers={"Content-type": "application/json"},
                             json=query)
    response_json = response.json()

    results = {}
    buckets = response_json["aggregations"]["by_entity_name"]["buckets"]
    for bucket in buckets:
        entity_id = int(bucket["key"])
        first_doc = bucket["first_doc"]
        hits = first_doc["hits"]
        total = hits["total"]["value"]
        documents = [{"id": hit["_source"]["id"],
                      "text": hit["_source"]["text"],
                      "mentions": filter_label(hit["_source"]["label"], entity_id)} for hit in hits["hits"]]
        results[entity_id] = QueryResults(total=total,
                                          documents=documents,
                                          doc_ids=None,
                                          ground_truth_labels=None)
    sorted_results = [results[entity_id] for entity_id in entity_ids]
    return sorted_results


def get_suggestions(es_uri, kb_index_name, entities):
    """
    Get the candidate knowledge bases matching the entities.
    """
    suggestions = []
    for entity in entities:
        entity_text = entity.text
        query = {
            "query": {
                "match": {
                    "text": entity_text
                }
            },
            "size": 5,
            "_source": ["name", "id", "colour"]
        }
        response = requests.get(f"{es_uri}/{kb_index_name}/_search",
                                headers={"Content-type": "application/json"},
                                json=query)
        response_json = response.json()
        hits = response_json["hits"]["hits"]
        entity_suggestions = [KbSuggestion(name=x["_source"]["name"],
                                           id=x["_source"]["id"],
                                           colour=x["_source"]["colour"]) for x in hits]
        suggestions.append(entity_suggestions)

    return suggestions


def get_entity_documents(es_uri, mentions_index_name, entity_id, from_doc):
    query = {
        "query": {
            "terms": {
                "label.id": [
                    entity_id
                ]
            }
        },
        "sort": [
            {
                "id": {
                    "order": "asc"
                }
            }
        ],
        "from": from_doc,
        "size": SINGLE_ENTITY_DOCS_PAGE_SIZE
    }

    response = requests.get(f"{es_uri}/{mentions_index_name}/_search",
                            headers={"Content-type": "application/json"},
                            json=query)
    response_json = response.json()

    hits = response_json["hits"]["hits"]
    documents = [{"id": hit["_source"]["id"],
                  "text": hit["_source"]["text"],
                  "mentions": filter_label(hit["_source"]["label"], entity_id)} for hit in hits]

    return documents
