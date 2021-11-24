import os


def delete_project_files(project):
    project_folder_path = os.path.dirname(os.path.abspath(project.spacy_binary_filepath))
    if os.path.exists(project.spacy_binary_filepath):
        os.remove(project.spacy_binary_filepath)
    os.rmdir(project_folder_path)