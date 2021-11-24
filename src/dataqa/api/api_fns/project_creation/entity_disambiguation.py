from collections import Counter
from itertools import cycle
import json

from dataqa.api.api_fns.project_creation.common import (ES_indexer,
                                                        get_random_int_5_digits,
                                                        sanitise_string,
                                                        UploadedFile)
from dataqa.constants import (COLOURS,
                              FILE_TYPE_DOCUMENTS,
                              FILE_TYPE_KB,
                              INPUT_FILE_SPECS,
                              MENTIONS_COLUMN_NAME,
                              TEXT_COLUMN_NAME,
                              MAPPINGS)
import dataqa.db.models as models
from dataqa.db.ops.common import get_project
from dataqa.db.ops.entity_disambiguation import (add_ent_dis_project_to_db,
                                                 add_ent_mapping_to_db,
                                                 delete_ent_mapping)
from dataqa.elasticsearch.client.utils.common import delete_index
from dataqa.nlp.nlp_utils import clean_html, normalise_text


class UploadedMentionsFile(UploadedFile):

    def __init__(self, project_type, input_data, file_type, column_name_mapping):
        super().__init__(project_type, input_data, file_type, column_name_mapping)
        self.total_mentions = 0
        self.token_ids = Counter()  # mapping of normalised entity text to entity_id
        self.count_tokens = Counter()  # mapping of normalised entity text to number of documents
        self.current_entity_id = 1

    def __iter__(self):
        for line in self.read_line():
            # Clean text
            for text_col in self.column_specs["text"]:
                line[text_col] = clean_html(line[text_col])

            mentions = json.loads(line["mentions"])
            self.total_mentions += len(mentions)
            for mention in mentions:
                normalised_text = normalise_text(mention["text"])
                self.count_tokens[normalised_text] += 1
                if self.token_ids[normalised_text]:
                    mention["id"] = self.token_ids[normalised_text]
                else:
                    mention["id"] = self.current_entity_id
                    self.token_ids[normalised_text] = self.current_entity_id
                    self.current_entity_id += 1

            line["mentions"] = mentions

            self.total_documents += 1
            yield line

    def process_file(self, es_uri, index_name, get_row, project_full_path=None, spacy_binary_filepath=None):
        with ES_indexer(es_uri, index_name, get_row, self.mapping_specs) as es_indexer:
            es_indexer.create_new_index()

            for line in self:
                es_indexer.index_line(line)


class UploadedKbFile(UploadedFile):

    def __init__(self, project_type, input_data, file_type, column_name_mapping):
        super().__init__(project_type, input_data, file_type, column_name_mapping)
        self.total_mentions = 0
        self.class_names = []  # list of class name attributes (id, name, colour)
        self.current_kb_id = 0

    def __iter__(self):
        for line, colour in zip(self.read_line(), cycle(COLOURS)):
            # Clean text
            for text_col in self.column_specs["text"]:
                line[text_col] = clean_html(line[text_col])
            line["colour"] = colour
            line["id"] = self.current_kb_id
            self.class_names.append({"id": self.current_kb_id,
                                     "name": line["name"],
                                     "colour": colour})
            self.current_kb_id += 1
            self.total_documents += 1
            yield line

    def process_file(self, es_uri, index_name, get_row, project_full_path=None, spacy_binary_filepath=None):
        with ES_indexer(es_uri, index_name, get_row, self.mapping_specs) as es_indexer:
            es_indexer.create_new_index()

            for line in self:
                es_indexer.index_line(line)


def create_entity_disambiguation_project(session,
                                         es_uri,
                                         file_bytes,
                                         project_name,
                                         project_type,
                                         column_name_mapping,
                                         upload_id,
                                         file_type):
    # perform document checks
    column_specs = INPUT_FILE_SPECS[project_type][file_type]

    if file_type == FILE_TYPE_DOCUMENTS:
        uploaded_file = UploadedMentionsFile(project_type,
                                             file_bytes,
                                             file_type,
                                             column_name_mapping)
    else:
        uploaded_file = UploadedKbFile(project_type,
                                       file_bytes,
                                       file_type,
                                       column_name_mapping)

    uploaded_file.do_all_file_checks()

    try:
        project = get_project(session, project_name)
        setattr(project, column_specs["upload_key"], upload_id)
    except:
        project = None

    if not project:
        project = add_ent_dis_project_to_db(session,
                                            project_name,
                                            project_type,
                                            {column_specs["upload_key"]: upload_id})

    project_id = project.id

    index_suffix = get_random_int_5_digits()
    project_name_index = sanitise_string(project_name)

    if file_type == FILE_TYPE_DOCUMENTS:
        index_name = f"{project_name_index}_mentions_{index_suffix}"
    else:
        index_name = f"{project_name_index}_kb_{index_suffix}"

    class_names = None
    try:
        if file_type == FILE_TYPE_DOCUMENTS:
            upload_documents_file(session,
                                  project,
                                  es_uri,
                                  uploaded_file,
                                  index_name,
                                  project_type)
        else:
            class_names = upload_kb_file(project,
                                         es_uri,
                                         uploaded_file,
                                         index_name,
                                         project_type)
    except Exception:
        delete_index(es_uri, index_name)
        delete_ent_mapping(session, project_id)
        raise Exception("Error during upload")

    return project_id, class_names


def turn_doc_row_into_es_row(row, mapping_columns):
    mentions_row = row[MENTIONS_COLUMN_NAME]
    new_row = {mapping_columns[TEXT_COLUMN_NAME]: row[TEXT_COLUMN_NAME],
               mapping_columns[MENTIONS_COLUMN_NAME]: mentions_row}
    return new_row


def turn_kb_row_into_es_row(row, mapping_columns):
    new_row = dict((value, row[key]) for key, value in mapping_columns.items())
    new_row["id"] = row["id"]
    new_row["colour"] = row["colour"]
    return new_row


def upload_documents_file(session,
                          project,
                          es_uri,
                          uploaded_file,
                          index_name,
                          project_type):
    mapping_specs = MAPPINGS[project_type][FILE_TYPE_DOCUMENTS]
    get_row = lambda row: turn_doc_row_into_es_row(row, mapping_specs["mapping_columns"])

    if project.index_name:
        delete_index(es_uri, project.index_name)

    uploaded_file.process_file(es_uri,
                               index_name,
                               get_row)

    project.total_documents = uploaded_file.total_documents
    project.index_name = index_name
    project.filename = uploaded_file.filename

    project.total_mentions = sum([x for x in uploaded_file.count_tokens.values()])
    project.total_entities = len(uploaded_file.token_ids)
    project.total_matched_entities = 0

    token_dict = {}
    for token, num_docs in uploaded_file.count_tokens.items():
        token_dict[token] = {"num_docs": num_docs, "id": uploaded_file.token_ids[token]}
    add_ent_mapping_to_db(session, project.id, token_dict)


def upload_kb_file(project,
                   es_uri,
                   uploaded_file,
                   index_name,
                   project_type):
    mapping_specs = MAPPINGS[project_type][FILE_TYPE_KB]
    get_row = lambda row: turn_kb_row_into_es_row(row, mapping_specs["mapping_columns"])

    if project.kb_index_name:
        delete_index(es_uri, project.kb_index_name)

    uploaded_file.process_file(es_uri,
                               index_name,
                               get_row)

    class_names = uploaded_file.class_names

    project.total_bases = uploaded_file.total_documents
    project.kb_index_name = index_name
    project.kb_filename = uploaded_file.filename

    all_class_names = []
    for model_class in class_names:
        all_class_names.append(models.EntityDisambiguationKB(name=model_class["name"],
                                                             project_id=project.id,
                                                             id=model_class["id"],
                                                             colour=model_class["colour"]))
    project.kbs = all_class_names

    return class_names
