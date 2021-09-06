from collections import namedtuple

from sqlalchemy import func
from sqlalchemy import or_

from dataqa.db import models as models
from dataqa.db.ops.common import add_project_to_db

EntityResult = namedtuple('EntityResult', ['id', 'text', 'total_docs', 'kb_id', 'kb_name'])


def add_ent_dis_project_to_db(session,
                              project_name,
                              project_type,
                              upload_dict):
    project = models.EntityDisambiguationProject(name=project_name,
                                                 type=project_type,
                                                 has_normalised_entities=True,
                                                 **upload_dict)

    add_project_to_db(session, project)
    return project


def get_top_entity_id(session, project_id):
    query = session.query(func.max(models.EntityDisambiguationMapping.id)).filter(
        models.EntityDisambiguationMapping.project_id == project_id
    )

    res = query.one()[0]
    max_id = res or 0
    return max_id


def delete_ent_mapping(session, project_id):
    session.query(models.EntityDisambiguationMapping).filter_by(project_id=project_id).delete()
    return


def add_ent_mapping_to_db(session, project_id, token_dict):
    session.bulk_insert_mappings(models.EntityDisambiguationMapping,
                                 [{"normalised_text": token,
                                   "number_docs": value["num_docs"],
                                   "id": value["id"],
                                   "project_id": project_id} for token, value in token_dict.items()])


def get_ent_mapping(session, entity_id, project_id):
    entity_mapping = session.query(models.EntityDisambiguationMapping).get((entity_id, project_id))
    return entity_mapping


def get_unmatched_entities(session, project, from_entity_offset, session_id, num_entities):
    """
    Get entities that do not have a match or that come from the session id session_id
    """
    query = session.query(models.EntityDisambiguationMapping) \
        .filter(models.EntityDisambiguationMapping.project_id == project.id) \
        .filter(or_(models.EntityDisambiguationMapping.kb_id == None,
                    models.EntityDisambiguationMapping.session_id == session_id))

    total_entities = query.count()

    query = query.order_by(models.EntityDisambiguationMapping.id) \
        .offset(from_entity_offset) \
        .limit(num_entities)

    entities = []
    for entity in query.all():
        entities.append(EntityResult(id=entity.id,
                                     text=entity.normalised_text,
                                     total_docs=entity.number_docs,
                                     kb_id=entity.kb_id,
                                     kb_name=entity.kb_name))

    return entities, total_entities


def get_matched_entities(session, project, from_entity_offset, session_id, num_entities):
    """
    Get entities that either have a match or have been modified in this session session_id.
    """
    query = session.query(models.EntityDisambiguationMapping) \
        .filter(models.EntityDisambiguationMapping.project_id == project.id) \
        .filter(or_(models.EntityDisambiguationMapping.kb_id!=None,
                    models.EntityDisambiguationMapping.session_id == session_id))

    total_entities = query.count()

    query = query.order_by(models.EntityDisambiguationMapping.id) \
        .offset(from_entity_offset) \
        .limit(num_entities)

    entities = []
    for entity in query.all():
        entities.append(EntityResult(id=entity.id,
                                     text=entity.normalised_text,
                                     total_docs=entity.number_docs,
                                     kb_id=entity.kb_id,
                                     kb_name=entity.kb_name))

    return entities, total_entities
