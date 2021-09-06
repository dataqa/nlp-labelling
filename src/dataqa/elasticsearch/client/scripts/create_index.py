import json
import requests
import time

from dataqa.elasticsearch.client.utils.common import (bulk_upload,
                                                      create_new_index,
                                                      get_total_documents)
from dataqa.constants import (ES_TEXT_FIELD_NAME,
                              PROJECT_TYPE_CLASSIFICATION,
                              FILE_TYPE_DOCUMENTS,
                              MAPPINGS)


BULK = [{"index": {"_index": "documents"}},
        {ES_TEXT_FIELD_NAME: "This is one doc."},
        {"index": {"_index": "documents"}},
        {ES_TEXT_FIELD_NAME: "This is the other doc."},
        {"index": {"_index": "documents"}},
        {ES_TEXT_FIELD_NAME: "And again."}]


def delete_index(es_uri, index_name):
    response = requests.delete(f"{es_uri}/{index_name}")
    print(response.text)


def bulk_upload_docs(es_uri):
    json_data = "\n".join([json.dumps(line) for line in BULK]) + "\n"
    bulk_upload(es_uri, json_data)


def main(es_uri):
    delete_index(es_uri, "*")
    mapping = MAPPINGS[PROJECT_TYPE_CLASSIFICATION][FILE_TYPE_DOCUMENTS]["mapping_es"]
    create_new_index(es_uri, "documents", mapping)
    bulk_upload_docs(es_uri)
    time.sleep(1)
    print("Total docs: ", get_total_documents(es_uri, "documents"))
    delete_index(es_uri, "*")
