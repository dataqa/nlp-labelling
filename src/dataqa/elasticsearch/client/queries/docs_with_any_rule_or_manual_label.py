def docs_with_any_rule_or_manual_label_query():
    query = {
        "query": {
            "bool": {
                "should": [
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
                    },
                    {
                        "exists": {
                            "field": "manual_label"
                        }
                    }
                ]
            }
        }
    }
    return query
