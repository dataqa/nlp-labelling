def docs_with_any_rule_query():
    query = {
        "query":
            {
                "nested": {
                    "path": "rules",
                    "query": {
                        "bool": {
                            "must": [
                                {
                                    "exists": {
                                        "field": "rules"
                                    }
                                }
                            ]
                        }
                    }
                }
            }

    }
    return query
