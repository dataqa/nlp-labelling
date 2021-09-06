from dataqa.constants import ES_GROUND_TRUTH_NAME_FIELD, ES_GROUND_TRUTH_LABEL_FIELD


def add_ground_truth_ids_query(class_mapping):
    query = {
        "query": {
            "match_all": {}
        },
        "script": {
            "source": f"if (params.value.get(ctx._source.{ES_GROUND_TRUTH_NAME_FIELD}) == null) "
                      f"{{throw new Exception(ctx._source.{ES_GROUND_TRUTH_NAME_FIELD})}} "
                      f"else {{ctx._source.{ES_GROUND_TRUTH_LABEL_FIELD} = "
                      f"params.value.get(ctx._source.{ES_GROUND_TRUTH_NAME_FIELD})}}",
            "lang": "painless",
            "params": {
                "value": class_mapping
            }
        }
    }
    return query
