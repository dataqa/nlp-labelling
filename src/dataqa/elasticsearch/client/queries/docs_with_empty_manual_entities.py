from dataqa.constants import (ES_TEXT_FIELD_NAME,
                              TABLE_COLUMN_NAMES_FIELD_NAME,
                              TABLE_ROWS_FIELD_NAME,
                              TABLE_ROWS_CHAR_STARTS_FIELD_NAME)

def docs_with_empty_manual_entities_query(from_,
                                          size,
                                          session_id):
    """
    Returns documents where manual_label is an empty list or from the same session_id.
    """
    manual_label_is_empty = {
        "bool": {
            "must": {
                "exists": {
                    "field": "manual_label"
                }
            },
            "must_not": {
                "nested": {
                    "path": "manual_label.label",
                    "query": {
                        "exists": {
                            "field": "manual_label.label"
                        }
                    }
                }
            }
        }
    }

    query = {
        "query": {
            "bool": {
                "should": [
                    manual_label_is_empty,
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
            ES_TEXT_FIELD_NAME,
            TABLE_COLUMN_NAMES_FIELD_NAME,
            TABLE_ROWS_FIELD_NAME,
            TABLE_ROWS_CHAR_STARTS_FIELD_NAME,
            "is_table",
            "manual_label",
            "id"
        ],
        "sort": "id"
    }
    return query
