def docs_with_no_rule_query(from_,
                            size,
                            session_id,
                            text_field,
                            label_field):
    """
    Get documents that have no rule labels and either no manual labels or a manual label from current session.

    We return manual_label because we want to display the latest manual_labels set by the user.
    """
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
        "_source": [
            text_field,
            label_field,
            "manual_label",
            "id"
        ],
        "sort": "id"
    }
    return query
