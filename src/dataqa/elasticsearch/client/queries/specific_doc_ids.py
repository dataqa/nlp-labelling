def specific_doc_ids_query(doc_ids):
    query = {
        "docs": [{"_id": id_, "_source": ["rules",
                                          "predicted_label",
                                          "id"]} for id_ in doc_ids]
    }
    return query
