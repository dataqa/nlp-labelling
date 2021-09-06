def script_delete_rules_predicted_label():
    script = {"script": {
        "source": "if(ctx._source.containsKey('rules')) "
                  "{ctx._source.remove('rules'); "
                  "ctx._source.remove('predicted_label')}",
        "lang": "painless",
    }}
    return script
