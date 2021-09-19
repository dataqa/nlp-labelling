import csv
import json
import random

import pandas as pd

from dataqa.api.api_fns.utils import check_file_size, get_column_names, get_decoded_stream
from dataqa.constants import INPUT_FILE_SPECS
from dataqa.db.ops.common import get_project
from dataqa.elasticsearch.client.utils.common import (bulk_upload)
from dataqa.nlp.nlp_utils import clean_html


def bulk_load_documents(es_uri, index_name, list_docs, start_doc_ind):
    json_data = []
    num_docs = 0
    for doc in list_docs:
        json_data.append(json.dumps({"index": {"_index": index_name,
                                               "_id": start_doc_ind + num_docs}}))
        if "id" not in doc:
            doc["id"] = start_doc_ind + num_docs
        json_data.append(json.dumps(doc))
        num_docs += 1
    request_body = "\n".join(json_data) + "\n"
    bulk_upload(es_uri, request_body)


def index_df(es_uri, index_name, df, get_row):
    num_lines = 100
    rows = []
    start_doc_ind = 0

    for ind, row in df.iterrows():
        if (ind > 0) and (ind % num_lines == 0):
            try:
                bulk_load_documents(es_uri, index_name, rows, start_doc_ind)
                start_doc_ind = ind
                rows = []
            except:
                print(f"Error bulk loading lines "
                      f"{start_doc_ind} to {start_doc_ind + num_lines - 1} to elasticsearch")
                raise

        new_row = get_row(row)
        rows.append(new_row)

    if rows:
        bulk_load_documents(es_uri, index_name, rows, start_doc_ind)


def get_random_int_5_digits():
    return random.randint(10000, 99999)


def sanitise_string(s):
    return ''.join(e for e in s if (e.isalnum()) or e == '_').lower()


def get_random_index_name(prefix):
    index_name = sanitise_string(prefix)
    suffix = get_random_int_5_digits()
    index_name = f"{index_name}_{suffix}"
    return index_name


def check_file(file_bytes, required_columns):
    file = get_decoded_stream(file_bytes)
    check_file_size(file)
    check_column_names(file, column_names=required_columns)
    return file


def process_file(file, column_specs):
    df = read_file(file, column_specs["required"], column_specs.get("optional", []))
    df[column_specs["text"]] = df[column_specs["text"]].applymap(clean_html)
    return df

def check_upload_finished(session,
                          project_name,
                          project_type,
                          file_type,
                          upload_id):
    upload_key = INPUT_FILE_SPECS[project_type][file_type]["upload_key"]
    project = get_project(session, project_name, {upload_key: upload_id})
    if project:
        return project.id
    return None


def get_upload_key(project_type, file_type):
    if file_type not in INPUT_FILE_SPECS[project_type]:
        raise Exception(f"File type {file_type} not supported for project of type {project_type}.")
    return INPUT_FILE_SPECS[project_type][file_type]['upload_key']


def check_column_names(file, column_names):
    actual_column_names = get_column_names(file)
    for column_name in column_names:
        if not column_name in actual_column_names:
            raise Exception(f"File needs to contain a \"{column_name}\" column")


def read_file(file, required_columns, optional_columns):
    reader = csv.reader(file)
    headers = next(reader)
    file.seek(0)

    csvfile = csv.DictReader(file)

    data = []
    for line in csvfile:
        required_columns_line = [line[col] for col in required_columns]
        optional_columns_line = [line.get(col) for col in optional_columns]
        data.append(required_columns_line + optional_columns_line)

    df = pd.DataFrame(data, columns=required_columns + optional_columns)
    for col in optional_columns:
        if not col in headers:
            df.drop(columns=[col], inplace=True)

    return df