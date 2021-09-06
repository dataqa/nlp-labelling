def docs_specific_rule_query(rule_id):
    rules_match = {"must": {"match": {"rules.rule_id": rule_id}}}
    query = {
        "query": {
            "bool": {
                "must": [
                    {
                        "nested": {
                            "path": "rules",
                            "query": {
                                "bool": rules_match
                            }
                        }
                    }
                ]
            }
        }
    }
    return query
