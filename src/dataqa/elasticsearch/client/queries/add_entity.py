def add_entity_query(spans, session_id):
    query = {
        "script": {
            "lang": "painless",
            "inline": "ctx._source.manual_label = params.spans",
            "params":
                {
                    "spans":
                        {
                            "label": spans,
                            "session_id": session_id
                        }
                }
        }
    }
    return query
