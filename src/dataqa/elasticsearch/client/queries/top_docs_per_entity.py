
def top_docs_per_entity_query(entity_ids, docs_per_entity):

    query = {
        "size": 0,
        "query": {
            "terms": {
                "label.id": entity_ids
            }
        },
        "aggs": {
            "by_entity_name": {
                "terms": {
                    "field": "label.id",
                    "size": 10,  # how many term buckets should be returned out of the overall terms list
                    "include": entity_ids  # filter values for which buckets are created
                },
                "aggs": {
                    "first_doc": {
                        "top_hits": {
                            "size": docs_per_entity,  # how many results per bucket
                            "sort": {
                                "id": "asc"
                            }
                        }
                    }
                }
            }
        }
    }
    return query