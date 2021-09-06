def docs_with_empty_manual_entities_query(from_,
                                          size,
                                          session_id,
                                          text_field):
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
            text_field,
            "manual_label",
            "id"
        ],
        "sort": "id"
    }
    return query
