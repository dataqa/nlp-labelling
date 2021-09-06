import os
import sys

from werkzeug.utils import secure_filename

from dataqa.api.api_fns import utils
from dataqa.api.api_fns.project_creation.common import (check_file,
                                                        get_random_index_name,
                                                        index_df, process_file)
from dataqa.constants import (INPUT_FILE_SPECS,
                              TEXT_COLUMN_NAME,
                              ES_GROUND_TRUTH_NAME_FIELD,
                              FILE_TYPE_DOCUMENTS,
                              MAPPINGS)
from dataqa.db.ops.supervised import add_supervised_project_to_db
from dataqa.elasticsearch.client.utils.common import create_new_index, delete_index
from dataqa.ml.sentiment import get_sentiment
from dataqa.nlp.spacy_file_utils import serialise_save_spacy_docs


ALLOWED_EXTENSIONS = {'csv'}


def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def turn_doc_row_into_es_row(row, mapping_columns, columns_specs, optional_columns_present):
    new_row = dict((mapping_columns[required_col], row[required_col])
                   for required_col in columns_specs["required"])
    for optional_col in optional_columns_present:
        new_row[mapping_columns[optional_col]] = row[optional_col]
    return new_row


def create_supervised_project(session,
                              es_uri,
                              file_bytes,
                              project_name,
                              project_type,
                              upload_id,
                              file_type,
                              upload_folder):
    """
    Saves the file in the labelled folder, counts number of lines, saves project in database.

    #TODO: optimise so we don't need to iterate through file twice
    #TODO (once for saving, another time for counting lines)
    """
    column_specs = INPUT_FILE_SPECS[project_type][FILE_TYPE_DOCUMENTS]
    required_columns = column_specs["required"]
    file = do_all_file_checks(file_type, file_bytes, required_columns)

    # run spacy
    project_full_path, filepath, spacy_binary_filepath = get_paths(upload_folder,
                                                                   file_bytes.filename,
                                                                   project_name)

    df = process_file(file, column_specs)
    has_ground_truth_labels = ES_GROUND_TRUTH_NAME_FIELD in df.columns
    total_documents = len(df)

    index_name = get_random_index_name(project_name)

    project_id = add_supervised_project_to_db(session,
                                              project_name,
                                              project_type,
                                              file_bytes.filename,
                                              upload_id,
                                              index_name,
                                              filepath,
                                              spacy_binary_filepath,
                                              total_documents,
                                              has_ground_truth_labels)

    try:
        save_files_to_disk(df, project_full_path, filepath, spacy_binary_filepath)
        mapping_specs = MAPPINGS[project_type][FILE_TYPE_DOCUMENTS]
        create_new_index(es_uri, index_name, mapping_specs["mapping_es"])
        optional_columns = column_specs.get("optional", [])
        optional_columns_present = [col for col in optional_columns if col in df.columns]
        get_row = lambda row: turn_doc_row_into_es_row(row,
                                                       mapping_specs["mapping_columns"],
                                                       column_specs,
                                                       optional_columns_present)
        index_df(es_uri, index_name, df, get_row)
    except:
        # clean up resources
        print("Error while creating ES index & saving files to disk", sys.exc_info())
        delete_index(es_uri, index_name)
        delete_files_from_disk(filepath, spacy_binary_filepath)
        raise

    return project_id


def do_all_file_checks(file_type, file_bytes, required_columns):
    if file_type != FILE_TYPE_DOCUMENTS:
        raise Exception(f"Supervised projects (classification, NER) do not accept files of type {file_type}")
    file = check_file(file_bytes, required_columns)
    return file


def save_files_to_disk(df, project_full_path, filepath, spacy_binary_filepath):
    if not os.path.exists(project_full_path):
        os.makedirs(project_full_path)
    serialise_save_spacy_docs(df, spacy_binary_filepath)
    df = get_sentiment(df)
    df.drop(columns=[TEXT_COLUMN_NAME]).to_csv(filepath)


def delete_files_from_disk(filepath, spacy_binary_filepath):
    if os.path.exists(filepath):
        os.remove(filepath)
    if os.path.exists(spacy_binary_filepath):
        os.remove(spacy_binary_filepath)


def get_paths(upload_folder, filename, project_name):
    folder_name = secure_filename(project_name)
    project_full_path = os.path.join(upload_folder, folder_name)
    if allowed_file(filename):
        filename = secure_filename(filename)
        filepath = os.path.join(project_full_path, filename)
    else:
        raise Exception("Name of file not allowed.")
    spacy_binary_filepath = os.path.join(project_full_path, 'spacy.bin')
    return project_full_path, filepath, spacy_binary_filepath