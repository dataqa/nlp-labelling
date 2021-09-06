from dataqa.db.ops.common import get_project


def check_import_finished(session, project_name, import_id):
    project = get_project(session, project_name, {'import_id': import_id})
    if project:
        return import_id
    return None