from contextlib import contextmanager

from dataqa.constants import (FILE_TYPE_DOCUMENTS,
                              PROJECT_TYPE_CLASSIFICATION,
                              PROJECT_TYPE_ED,
                              FILE_TYPE_KB,
                              PROJECT_TYPE_NER)
from dataqa.db import schemas as schemas, models as models


@contextmanager
def session_scope(db):
    """Provide a transactional scope around a series of operations."""
    session = db.get_session()
    try:
        yield session
        session.commit()
    except:
        session.rollback()
        raise
    finally:
        session.close()


def get_project(session, project_name, upload_dict=None):
    project = session.query(models.Project).filter_by(name=project_name).first()
    if upload_dict:
        if not project:
            return None

        upload_key, upload_id = list(upload_dict.items())[0]
        if getattr(project, upload_key) != upload_id:
            return None
    else:
        if not project:
            raise Exception(f"Project {project_name} does not exist.")
    return project


def get_project_info(project):
    if project.type == PROJECT_TYPE_ED:
        project_schema = schemas.EntityDisambiguationSchema()
        project_data = project_schema.dump(project)
    else:
        if project.type in PROJECT_TYPE_CLASSIFICATION:
            project_schema = schemas.ClassificationProjectSchema()
            rule_schema = schemas.ClassificationRuleSchema()
        else:
            project_schema = schemas.NERProjectSchema()
            rule_schema = schemas.NERRuleSchema()
        project_data = dump_supervised_info(project, project_schema, rule_schema)
    return project_data


def dump_supervised_info(project, project_schema, rule_schema):
    rules = []
    for rule in project.rules:
        rules.append(rule_schema.dump(rule))

    project_dict = project_schema.dump(project)

    project_data = {'docs': project_dict,
                    'rules': rules,
                    'update_id': project.update_id}
    return project_data


def get_project_list(db):
    all_projects = []
    with session_scope(db) as session:
        for project in session.query(models.Project).order_by(models.Project.id):
            if project.type in [PROJECT_TYPE_CLASSIFICATION, PROJECT_TYPE_NER]:
                all_projects.append({"project_id": project.id,
                                     "project_name": project.name,
                                     "project_type": project.type,
                                     "class_names": [{"id": class_name.id,
                                                      "name": class_name.name,
                                                      "colour": class_name.colour}
                                                     for class_name in project.classes],
                                     "project_upload_finished": project.index_name is not None,
                                     "filenames": {FILE_TYPE_DOCUMENTS: project.filename}})
            else:
                all_projects.append({"project_id": project.id,
                                     "project_name": project.name,
                                     "project_type": project.type,
                                     "project_upload_finished": project.kb_index_name is not None
                                                                and project.index_name is not None,
                                     "filenames": {FILE_TYPE_DOCUMENTS: project.filename,
                                                   FILE_TYPE_KB: project.kb_filename},
                                     "class_names": [{"id": class_name.id,
                                                      "name": class_name.name,
                                                      "colour": class_name.colour}
                                                     for class_name in project.kbs]})
    return all_projects


def add_project_to_db(session, project):
    session.add(project)
    session.flush()
    project_id = project.id
    return project_id
