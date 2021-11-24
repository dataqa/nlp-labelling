from dataqa.constants import (ES_TEXT_FIELD_NAME,
                              TABLE_COLUMN_NAMES_FIELD_NAME,
                              TABLE_ROWS_FIELD_NAME,
                              TABLE_ROWS_CHAR_STARTS_FIELD_NAME)


def docs_with_no_rule_query(from_,
                            size,
                            session_id,
                            label_field):
    """
    Get documents that have no rule labels and either no manual labels or a manual label from current session.

    We return manual_label because we want to display the latest manual_labels set by the user.
    """
    source = [
        ES_TEXT_FIELD_NAME,
        TABLE_COLUMN_NAMES_FIELD_NAME,
        TABLE_ROWS_FIELD_NAME,
        TABLE_ROWS_CHAR_STARTS_FIELD_NAME,
        "is_table",
        label_field,
        "manual_label",
        "id"
    ]

    query = {
        "query": {
            "bool": {
                "must_not": {
                    "nested": {
                        "path": "rules",
                        "query": {
                            "exists": {
                                "field": "rules"
                            }
                        }
                    }
                },
                "should": [
                    {
                        "bool": {
                            "must_not": {
                                "exists": {
                                    "field": "manual_label"
                                }
                            }
                        }
                    },
                    {
                        "match": {
                            "manual_label.session_id": session_id
                        }
                    }
                ],
                "minimum_should_match": 1
            }
        },
        "from": from_,
        "size": size,
        "_source": source,
        "sort": "id"
    }
    return query
