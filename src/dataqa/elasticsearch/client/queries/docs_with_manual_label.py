# Query to get documents with specific label
from dataqa.constants import (ES_GROUND_TRUTH_LABEL_FIELD, PROJECT_TYPE_NER)


def docs_with_manual_label_query(project_type,
                                 from_,
                                 size,
                                 session_id,
                                 text_field,
                                 label):
    """
    Find all the documents with a specific manual label or the ones with the current session_id.

    The latter case is when the label has been changed during the current session.
    """
    if project_type == PROJECT_TYPE_NER:
        first_clause = {
            "nested": {
                "path": "manual_label.label",
                "query": {
                    "term": {
                        "manual_label.label.entity_id": {
                            "value": label
                        }
                    }
                }
            }
        }
    else:
        first_clause = {
            "bool": {
                "must": {
                    "match": {"manual_label.label": label}
                }
            }
        }

    query = {
        "query": {
            "bool": {
                "should": [
                    first_clause,
                    {
                        "match": {
                            "manual_label.session_id": session_id
                        }
                    }
                ]
            }
        },
        "from": from_,
        "size": size,
        "_source": [
            text_field,
            ES_GROUND_TRUTH_LABEL_FIELD,
            "manual_label",
            "id"
        ],
        "sort": "id"
    }
    return query
