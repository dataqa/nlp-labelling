# Query to get documents with rule predicted labels but no old manual label
def docs_with_predicted_labels_query(from_,
                                     size,
                                     session_id,
                                     text_field,
                                     ground_truth_field=None,
                                     rule_id=None):
    """
    Get documents with either any rule label or if rule_id is set, have been labelled by a specific rule.

    If the rule_id is provided, then the rules field must contain that rule_id.
    Then, the manual_label field must either not exist (has never been labelled before) or
    it exists but the session_id is the current session.

    We return manual_label because we want to display the latest manual_labels set by the user.
    """
    source = [
        text_field,
        "predicted_label",
        "manual_label",
        "rules",
        "id"
    ]

    if ground_truth_field:
        source.append(ground_truth_field)

    if rule_id is not None:
        rules_match = {
            "match": {
                "rules.rule_id": rule_id
            }
        }
    else:
        rules_match = {
            "exists": {
                "field": "rules"
            }
        }

    query = {
        "query": {
            "bool": {
                "must": [
                    {
                        "nested": {
                            "path": "rules",
                            "query": {
                                "bool": {"must": rules_match}
                            }
                        }
                    },
                    {
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
                    }
                ]
            }
        },
        "from": from_,
        "size": size,
        "_source": source,
        "sort": "id"
    }
    return query
