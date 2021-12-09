import shutil


def delete_project_files(project):
    project_full_path = project.project_full_path
    shutil.rmtree(project_full_path)