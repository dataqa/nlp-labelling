from abc import ABC, abstractmethod
import csv
import json
from pathlib import Path
import random

from dataqa.api.api_fns.utils import check_file_size, get_column_names, get_decoded_stream
from dataqa.constants import (ES_GROUND_TRUTH_NAME_FIELD,
                              FILE_TYPE_DOCUMENTS,
                              FILE_TYPE_DOCUMENTS_WIKI,
                              INPUT_FILE_SPECS,
                              MAPPINGS,
                              PROJECT_TYPE_CLASSIFICATION,
                              PROJECT_TYPE_NER)
from dataqa.db.ops.common import get_project
from dataqa.elasticsearch.client.utils.common import (bulk_upload, create_new_index)
from dataqa.nlp.nlp_utils import clean_html
from dataqa.wiki.utils import extract_wikipedia_paragraphs


class UploadedFile(ABC):

    def __init__(self, project_type, input_data, file_type, column_name_mapping):
        # run input param checks
        if project_type in [PROJECT_TYPE_CLASSIFICATION, PROJECT_TYPE_NER]:
            if file_type not in [FILE_TYPE_DOCUMENTS, FILE_TYPE_DOCUMENTS_WIKI]:
                raise Exception(f"File type {file_type} is not supported for project type {project_type}.")

        if file_type == FILE_TYPE_DOCUMENTS_WIKI and project_type != PROJECT_TYPE_NER:
            raise Exception(f"Using urls is not supported for project type {project_type}.")

        self.column_name_mapping = column_name_mapping
        self.column_specs = INPUT_FILE_SPECS[project_type][file_type]
        self.total_allowed_documents = self.column_specs.get('max_rows')
        self.mapping_specs = MAPPINGS[project_type][file_type]
        self.project_type = project_type
        self.input_data = input_data
        self.filename = Path(input_data.filename).name
        self.total_documents = 0
        self.file_type = file_type  # documents, kb or documents_wiki
        self.is_wiki = (file_type == FILE_TYPE_DOCUMENTS_WIKI)
        self.actual_column_names = None
        self.processed_data = None
        self.has_ground_truth_labels = None

    def do_all_file_checks(self):
        required_columns = self.column_specs["required"]
        self.input_data = get_decoded_stream(self.input_data)
        check_file_size(self.input_data)
        mapped_columns = [self.column_name_mapping[col] for col in required_columns]
        actual_column_names = check_column_names(self.input_data, column_names=mapped_columns)
        self.actual_column_names = actual_column_names
        if self.project_type == PROJECT_TYPE_CLASSIFICATION:
            self.has_ground_truth_labels = ES_GROUND_TRUTH_NAME_FIELD in actual_column_names

    def read_line(self):
        expected_columns = [self.column_name_mapping[col] for col in self.column_specs["required"]]
        expected_columns.extend(self.column_specs.get("optional", []))
        actual_to_mapped_column = dict((val, key) for key, val in self.column_name_mapping.items())

        mapped_columns = [actual_to_mapped_column.get(col, col) for col in self.actual_column_names]
        csvfile = csv.DictReader(self.input_data, fieldnames=mapped_columns)
        _ = next(csvfile)

        num_lines = 0
        for line in csvfile:
            if self.is_wiki:
                for chunk in extract_wikipedia_paragraphs(line["url"]):
                    yield chunk
            else:
                yield line
            num_lines += 1

            if self.total_allowed_documents and num_lines > self.total_allowed_documents:
                raise Exception(f"The file contains more than the allowed number of rows: "
                                f"{self.total_allowed_documents}")

    def __iter__(self):
        for line in self.read_line():
            # Clean text
            for text_col in self.column_specs["text"]:
                line[text_col] = clean_html(line[text_col])
            self.total_documents += 1
            yield line

    @abstractmethod
    def process_file(self, es_uri, index_name, get_row, project_full_path, spacy_binary_filepath):
        pass


class ES_indexer(object):

    def __init__(self, es_uri, index_name, get_row, mapping_specs):
        self.es_uri = es_uri
        self.index_name = index_name
        self.mapping_es = mapping_specs["mapping_es"]
        self.settings_es = mapping_specs.get("settings_es")
        self.get_row = get_row
        self.bulk_line_size = 100
        self.num_read_lines = 0
        self.num_indexed_docs = 0
        self.current_rows = []

    def create_new_index(self):
        create_new_index(self.es_uri, self.index_name, self.mapping_es, self.settings_es)

    def __enter__(self):
        return self

    def index_line(self, line):
        if (self.num_read_lines > 0) and (self.num_read_lines % self.bulk_line_size == 0):
            try:
                bulk_load_documents(self.es_uri, self.index_name, self.current_rows, self.num_indexed_docs)
                self.num_indexed_docs = self.num_read_lines
                self.current_rows = []
            except Exception as e:
                print(f"Error bulk loading lines "
                      f"{self.num_indexed_docs} to {self.num_indexed_docs + len(self.current_rows) - 1} to elasticsearch")
                raise

        new_row = self.get_row(line)
        self.current_rows.append(new_row)
        self.num_read_lines += 1

    def __exit__(self, type, value, traceback):
        # do things at exit time
        if self.current_rows:
            try:
                bulk_load_documents(self.es_uri, self.index_name, self.current_rows, self.num_indexed_docs)
            except:
                print(f"Error bulk loading lines "
                      f"{self.num_indexed_docs} to {self.num_indexed_docs + len(self.current_rows) - 1} to elasticsearch")
                raise


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
    return actual_column_names
