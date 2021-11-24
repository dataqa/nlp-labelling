import os
import sys
import traceback

from werkzeug.utils import secure_filename

from dataqa.api.api_fns.project_creation.common import (ES_indexer,
                                                        get_random_index_name,
                                                        UploadedFile)
from dataqa.constants import MAPPINGS
from dataqa.db.ops.supervised import add_supervised_project_to_db
from dataqa.elasticsearch.client.utils.common import delete_index
from dataqa.nlp.spacy_file_utils import save_spacy_docs, SpacySerialiser

ALLOWED_EXTENSIONS = {'csv'}


class UploadedSupervisedFile(UploadedFile):

    def __init__(self, project_type, input_data, file_type, column_name_mapping):
        super().__init__(project_type, input_data, file_type, column_name_mapping)

    def process_file(self, es_uri, index_name, get_row, project_full_path, spacy_binary_filepath):
        if not os.path.exists(project_full_path):
            os.makedirs(project_full_path)

        spacy_serialiser = SpacySerialiser()

        with ES_indexer(es_uri, index_name, get_row, self.mapping_specs) as es_indexer:
            es_indexer.create_new_index()

            for line in self:
                spacy_serialiser.add_doc(line["text"])
                es_indexer.index_line(line)

        save_spacy_docs(spacy_serialiser.get_bytes(), spacy_binary_filepath)


def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def turn_doc_row_into_es_row(row, mapping_columns):
    new_row = dict((mapping_columns[col], row[col]) for col in row if col in mapping_columns)
    return new_row


def create_supervised_project(session,
                              es_uri,
                              file_bytes,
                              project_name,
                              project_type,
                              column_name_mapping,
                              upload_id,
                              file_type,
                              upload_folder):
    """
    Saves the file in the labelled folder, counts number of lines, saves project in database.

    #TODO: optimise so we don't need to iterate through file twice
    #TODO (once for saving, another time for counting lines)
    """
    uploaded_file = UploadedSupervisedFile(project_type,
                                           file_bytes,
                                           file_type,
                                           column_name_mapping)

    # perform document checks
    uploaded_file.do_all_file_checks()

    # Save project details in db
    project_full_path, spacy_binary_filepath = get_paths(upload_folder, project_name)
    index_name = get_random_index_name(project_name)
    project_id = None

    try:
        mapping_specs = MAPPINGS[project_type][file_type]

        get_row = lambda row: turn_doc_row_into_es_row(row, mapping_specs["mapping_columns"])

        uploaded_file.process_file(es_uri,
                                   index_name,
                                   get_row,
                                   project_full_path,
                                   spacy_binary_filepath)

        project_id = add_supervised_project_to_db(session,
                                                  project_name,
                                                  project_type,
                                                  file_bytes.filename,
                                                  upload_id,
                                                  index_name,
                                                  spacy_binary_filepath,
                                                  uploaded_file.total_documents,
                                                  uploaded_file.has_ground_truth_labels,
                                                  uploaded_file.is_wiki)
    except:
        # clean up resources
        print("Error while creating ES index & saving files to disk", sys.exc_info())
        traceback.print_exc()
        delete_index(es_uri, index_name)
        delete_files_from_disk(spacy_binary_filepath)

    return project_id


def delete_files_from_disk(spacy_binary_filepath):
    if os.path.exists(spacy_binary_filepath):
        os.remove(spacy_binary_filepath)


def get_paths(upload_folder, project_name):
    folder_name = secure_filename(project_name)
    project_full_path = os.path.join(upload_folder, folder_name)
    spacy_binary_filepath = os.path.join(project_full_path, 'spacy.bin')
    return project_full_path, spacy_binary_filepath
