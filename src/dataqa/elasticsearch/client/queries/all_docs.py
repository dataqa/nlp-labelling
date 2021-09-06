# Query to get all documents that have not been labelled yet

def all_docs_query(from_,
                   size,
                   session_id,
                   text_field,
                   label_field):
    """
    The manual_label field must either not exist (has never been labelled before) or
    it exists but the session_id is the current session.
    """

    query = {
        "query": {
            "bool": {
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
                ]
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
