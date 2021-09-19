from collections import Counter
from itertools import cycle
import json
import sys

from dataqa.api.api_fns.project_creation.common import (check_file,
                                                        get_random_int_5_digits,
                                                        sanitise_string,
                                                        index_df,
                                                        process_file)
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
                                                 delete_ent_mapping,
                                                 get_top_entity_id)
from dataqa.elasticsearch.client.utils.common import create_new_index, delete_index
from dataqa.nlp.nlp_utils import normalise_text


def create_entity_disambiguation_project(session,
                                         es_uri,
                                         file_bytes,
                                         project_name,
                                         project_type,
                                         upload_id,
                                         file_type):
    column_specs = INPUT_FILE_SPECS[project_type][file_type]
    file = check_file(file_bytes, column_specs["required"])

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
                                  file,
                                  file_bytes.filename,
                                  index_name,
                                  project_type,
                                  column_specs)
        else:
            class_names = upload_kb_file(project,
                                         es_uri,
                                         file,
                                         file_bytes.filename,
                                         index_name,
                                         project_type,
                                         column_specs)
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


def upload_file(es_uri,
                index_name,
                df,
                mapping_specs,
                get_row):
    try:
        create_new_index(es_uri,
                         index_name,
                         mapping_specs["mapping_es"],
                         mapping_specs.get("settings_es"))
        index_df(es_uri, index_name, df, get_row)
    except:
        # clean up resources
        print("Error while creating ES index", sys.exc_info())
        delete_index(es_uri, index_name)
        raise


def add_entity_ids(df, max_id):
    df["mentions"] = df["mentions"].apply(json.loads)

    count_tokens = Counter()
    token_ids = Counter()
    total_mentions = 0
    entity_id = max_id + 1
    for mentions in df["mentions"]:
        total_mentions += len(mentions)
        for mention in mentions:
            normalised_text = normalise_text(mention["text"])
            count_tokens[normalised_text] += 1
            if token_ids[normalised_text]:
                mention["id"] = token_ids[normalised_text]
            else:
                mention["id"] = entity_id
                token_ids[normalised_text] = entity_id
                entity_id += 1

    token_dict = {}
    for token, num_docs in count_tokens.items():
        token_dict[token] = {"num_docs": num_docs, "id": token_ids[token]}

    return df, token_dict


def upload_documents_file(session,
                          project,
                          es_uri,
                          file,
                          filename,
                          index_name,
                          project_type,
                          column_specs):
    mapping_specs = MAPPINGS[project_type][FILE_TYPE_DOCUMENTS]
    get_row = lambda row: turn_doc_row_into_es_row(row, mapping_specs["mapping_columns"])

    if project.index_name:
        delete_index(es_uri, project.index_name)

    df = process_file(file, column_specs)

    # get the normalised_text, normalised_id
    max_id = get_top_entity_id(session, project.id)
    df, token_dict = add_entity_ids(df, max_id)

    upload_file(es_uri,
                index_name,
                df,
                mapping_specs,
                get_row)

    project.total_documents = len(df)
    project.index_name = index_name
    project.filename = filename

    project.total_mentions = sum([x["num_docs"] for x in token_dict.values()])
    project.total_entities = len(token_dict)
    project.total_matched_entities = 0

    add_ent_mapping_to_db(session, project.id, token_dict)


def get_class_names_from_kbs(df):
    class_names = []
    colours = []
    for (_, row), colour in zip(df.iterrows(), cycle(COLOURS)):
        class_names.append({"id": row["id"], "name": row["name"], "colour": colour})
        colours.append(colour)
    df["colour"] = colours
    return class_names


def upload_kb_file(project,
                   es_uri,
                   file,
                   filename,
                   index_name,
                   project_type,
                   column_specs):
    mapping_specs = MAPPINGS[project_type][FILE_TYPE_KB]
    get_row = lambda row: turn_kb_row_into_es_row(row, mapping_specs["mapping_columns"])

    if project.kb_index_name:
        delete_index(es_uri, project.kb_index_name)

    df = process_file(file, column_specs)
    df["id"] = df.index
    class_names = get_class_names_from_kbs(df)

    upload_file(es_uri,
                index_name,
                df,
                mapping_specs,
                get_row)

    project.total_bases = len(df)
    project.kb_index_name = index_name
    project.kb_filename = filename

    all_class_names = []
    for model_class in class_names:
        all_class_names.append(models.EntityDisambiguationKB(name=model_class["name"],
                                                             project_id=project.id,
                                                             id=model_class["id"],
                                                             colour=model_class["colour"]))
    project.kbs = all_class_names

    return class_names
