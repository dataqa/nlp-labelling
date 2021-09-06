
def all_docs_with_manual_entities():
    query = {
        "query": {
            "exists": {
                "field": "manual_label"
            }
        },
        "_source": ["manual_label", "id", "rules", "predicted_label"]
    }
    return query
