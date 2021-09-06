from distutils.util import strtobool
import json

from flask import (current_app,
                   request,
                   Blueprint)
from flask import Response

from dataqa.db.ops.common import get_project, session_scope
from dataqa.api.api_fns.label.entity_disambiguation import (get_entity_disambiguation_stats,
                                                            get_entities_to_label,
                                                            get_entity_docs_from_es,
                                                            search_kb)
from dataqa.api.blueprints.common import db
from dataqa.constants import PROJECT_TYPE_ED
import dataqa.elasticsearch.client.utils.common as es

kb_bp = Blueprint('kb', __name__)


def check_ed_project(project):
    if project.type != PROJECT_TYPE_ED:
        raise Exception(f"Project type {project.type} is not of type {PROJECT_TYPE_ED}, "
                        f"calling the wrong API.")


@kb_bp.route('/api/project-stats', methods=['GET'])
def project_stats():
    project_name = request.args['project_name']
    if not project_name:
        raise Exception("Project name undefined")

    with session_scope(db) as session:
        project = get_project(session, project_name)
        check_ed_project(project)
        data = get_entity_disambiguation_stats(project)

    return json.dumps(data)


@kb_bp.route('/api/get-entities', methods=['GET'])
def get_entities():
    project_name = request.args['project_name']
    if not project_name:
        raise Exception("Project name undefined")

    from_entity_offset = request.args['from_entity_offset']
    if not from_entity_offset:
        raise Exception("from_entity_offset undefined")

    session_id = request.args['session_id']
    if not project_name:
        raise Exception("Session id undefined")

    unmatched = strtobool(request.args['unmatched'])

    with session_scope(db) as session:
        project = get_project(session, project_name)
        check_ed_project(project)
        es_uri = es.get_es_uri(current_app.config)
        data = get_entities_to_label(session, project, es_uri, from_entity_offset, session_id, unmatched)

    return json.dumps(data)


@kb_bp.route('/api/get-entity-docs', methods=['GET'])
def get_entity_docs():
    project_name = request.args['project_name']
    if not project_name:
        raise Exception("Project name undefined")

    try:
        entity_id = int(request.args['entity_id'])
    except:
        raise Exception(f"entity_id {entity_id} undefined or not an integer")

    from_doc_offset = request.args['from_doc_offset']
    if not from_doc_offset:
        raise Exception("from_doc_offset undefined")

    with session_scope(db) as session:
        project = get_project(session, project_name)
        check_ed_project(project)
        es_uri = es.get_es_uri(current_app.config)
        results = get_entity_docs_from_es(project, es_uri, entity_id, from_doc_offset)

    return json.dumps(results)


@kb_bp.route('/api/search-kb', methods=['GET'])
def search_kb_api():
    project_name = request.args['project_name']
    if not project_name:
        raise Exception("Project name undefined")

    if 'input' in request.args:
        input = request.args['input']

        with session_scope(db) as session:
            project = get_project(session, project_name)
            check_ed_project(project)
            es_uri = es.get_es_uri(current_app.config)
            results = search_kb(project, es_uri, input)

        return json.dumps(results)
    else:
        return Response(status=200)
