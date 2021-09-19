from dataqa.constants import ENTITY_PAGE_SIZE, MULTIPLE_ENTITY_DOCS_PAGE_SIZE
from dataqa.db.ops.common import get_project_info
from dataqa.db.ops.entity_disambiguation import (get_ent_mapping,
                                                 get_matched_entities,
                                                 get_unmatched_entities)
from dataqa.elasticsearch.client.utils.entity_disambiguation import (get_kb,
                                                                     get_suggestions,
                                                                     get_entity_documents,
                                                                     get_top_entity_documents)


def get_entity_disambiguation_stats(project):
    data = get_project_info(project)
    return data


def format_output_unmatched(entities, total_entities, docs, suggestions):
    result = {"total_entities": total_entities}
    all_entity_data = []
    for entity, entity_docs, entity_suggestions in zip(entities, docs, suggestions):
        entity_data = {"id": entity.id,
                       "text": entity.text,
                       "docs": entity_docs.documents,
                       "total_docs": entity.total_docs,
                       "kb_suggestions": [sugg._asdict() for sugg in entity_suggestions]}
        if entity.kb_id is not None:
            entity_data["label"] = {"name": entity.kb_name, "id": entity.kb_id}
        all_entity_data.append(entity_data)
    result["entities"] = all_entity_data
    return result


def get_entities_to_label(session, project, es_uri, from_entity_offset, session_id, unmatched):
    # 1. we will search in the sql db all entities that have kb_id null or session_id set to value
    # sorted by entity_id and using the from clause, paginated to 10
    if unmatched:
        entities, total_entities = get_unmatched_entities(session,
                                                          project,
                                                          from_entity_offset,
                                                          session_id,
                                                          ENTITY_PAGE_SIZE)
    else:
        entities, total_entities = get_matched_entities(session,
                                                        project,
                                                        from_entity_offset,
                                                        session_id,
                                                        ENTITY_PAGE_SIZE)

    # get documents with those normalised_id (top_hits=1)
    docs = get_top_entity_documents(es_uri, project.index_name, entities, MULTIPLE_ENTITY_DOCS_PAGE_SIZE)

    # for each entity/doc pair, do a batch query to get 1. top kb by doing text search on the normalised text
    suggestions = get_suggestions(es_uri, project.kb_index_name, entities)

    # return a data structure that is {entity: {docs: [{doc: "bla", suggestions: []}]}}
    result = format_output_unmatched(entities, total_entities, docs, suggestions)
    return result


def search_kb(project, es_uri, input):
    kb_index_name = project.kb_index_name
    results = get_kb(es_uri,
                     kb_index_name,
                     input)

    return results


def get_entity_docs_from_es(project, es_uri, entity_id, from_doc):
    results = get_entity_documents(es_uri, project.index_name, entity_id, from_doc)
    return results


def label_kb(session, project, entity_id, kb, session_id):
    entity = get_ent_mapping(session, entity_id, project.id)
    if not entity:
        raise Exception("Entity was not found in database.")
    if entity.kb_id is None:
        project.total_matched_entities = project.total_matched_entities + 1
    entity.kb_id = kb["label"]
    entity.kb_name = kb["name"]
    entity.session_id = session_id
