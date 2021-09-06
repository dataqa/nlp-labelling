from distutils.util import strtobool
import json
from flask import (current_app,
                   request,
                   Blueprint)

from dataqa.db.ops.common import (get_project, get_project_info, session_scope)
from dataqa.api.api_fns.import_rules.supervised import check_import_finished
from dataqa.api.api_fns.export_results.supervised import export_rules as export_rules_func
from dataqa.api.api_fns.label.supervised import (check_entity_form_input,
                                                 check_label_arg,
                                                 get_correct_spans,
                                                 read_docs_with_manual_labels,
                                                 read_docs_with_rules)
from dataqa.api.api_fns.project_settings.supervised import set_class_names
from dataqa.api.api_fns.project_stats.supervised import (update_rule_stats,
                                                         delete_update_rule_stats)
from dataqa.api.api_fns.rules import rule_fns
from dataqa.api.blueprints.common import db
from dataqa.constants import PROJECT_TYPE_CLASSIFICATION, PROJECT_TYPE_NER
import dataqa.elasticsearch.client.utils.common as es
import dataqa.elasticsearch.client.utils.ner as ner_es

supervised_bp = Blueprint('supervised', __name__)


def check_supervised_project(project):
    if not project.type in [PROJECT_TYPE_CLASSIFICATION, PROJECT_TYPE_NER]:
        raise Exception(f"Project type {project.type} is not supervised, calling the "
                        "wrong API.")


@supervised_bp.route('/api/classnames', methods=['POST'])
def set_classnames():
    project_name = request.form['project_name']
    if not project_name:
        raise Exception("Project name undefined")

    file = request.files['file']
    if not file:
        raise Exception("File is undefined")

    with session_scope(db) as session:
        project = get_project(session, project_name)
        es_uri = es.get_es_uri(current_app.config)
        check_supervised_project(project)
        class_names = set_class_names(project, file, es_uri)
    return json.dumps(class_names)


@supervised_bp.route('/api/create-rule', methods=['POST'])
def create_rule():
    rule_type = request.form['rule_type']
    if not rule_type:
        raise Exception("rule_type undefined")

    rule_name = request.form['rule_name']
    if not rule_name:
        raise Exception("rule_name undefined")

    project_name = request.form['project_name']
    if not project_name:
        raise Exception("Project name undefined")

    params = request.form['params']
    if not params:
        raise Exception("params undefined")

    try:
        class_id = int(request.form['class_id'])
    except:
        raise Exception("Missing or malformed class_id parameter.")

    class_name = request.form['class_name']
    if not class_name:
        raise Exception("class_name undefined")

    create_rule_id = request.form['create_rule_id']
    if not create_rule_id:
        raise Exception("Need id for polling")

    polling = bool(strtobool(request.form['polling']))

    with session_scope(db) as session:
        es_uri = es.get_es_uri(current_app.config)
        project = get_project(session, project_name)
        check_supervised_project(project)
        if polling:
            create_rule_id = rule_fns.check_create_rule_id(session,
                                                           create_rule_id)
        else:
            rule_fns.add_rule(session,
                              project,
                              es_uri,
                              rule_type,
                              rule_name,
                              params,
                              class_id,
                              class_name,
                              create_rule_id)
    return json.dumps({"create_rule_id": create_rule_id})


@supervised_bp.route('/api/delete-rule', methods=['POST'])
def delete_rule():
    rule_id = int(request.form['rule_id'])
    if rule_id is None:
        raise Exception("rule_id undefined")

    project_name = request.form['project_name']
    if not project_name:
        raise Exception("Project name undefined")

    with session_scope(db) as session:
        project = get_project(session, project_name)
        check_supervised_project(project)
        es_uri = es.get_es_uri(current_app.config)
        delete_update_rule_stats(project, es_uri, rule_id)
        session.flush()  # for the rule_ids
        project_info = get_project_info(project)
    return json.dumps(project_info)


@supervised_bp.route('/api/update-rules', methods=['POST'])
def update_rules():
    # the rules are updated when the project table is loaded
    # we also update information related to manual labels
    project_name = request.form['project_name']
    if not project_name:
        raise Exception("Project name undefined")

    update_id = request.form['update_id']
    if not update_id:
        raise Exception("Need update id for polling")

    polling = bool(strtobool(request.form['polling']))

    with session_scope(db) as session:
        project = get_project(session, project_name)
        check_supervised_project(project)
        es_uri = es.get_es_uri(current_app.config)
        if not polling:
            update_rule_stats(project, es_uri, update_id)
        project_info = get_project_info(project)
    return json.dumps(project_info)


@supervised_bp.route('/api/get-sentiment-distribution', methods=['GET'])
def get_sentiment_distribution():
    project_name = request.args['project_name']
    if not project_name:
        raise Exception("Project name undefined")

    with session_scope(db) as session:
        project = get_project(session, project_name)
        check_supervised_project(project)
        distribution = rule_fns.get_sentiment_distribution(project.data_filepath,
                                                           project.spacy_binary_filepath)
    return json.dumps(distribution)


@supervised_bp.route('/api/get-docs', methods=['GET'])
def get_docs():
    print(request.args)
    from_ = request.args['from']
    size = request.args['size']
    project_name = request.args['project_name']
    session_id = request.args['session_id']
    rule_id = request.args.get('rule_id')
    label = request.args.get('label')

    with session_scope(db) as session:
        project = get_project(session, project_name)
        check_supervised_project(project)
        es_uri = es.get_es_uri(current_app.config)
        inputs_params = (es_uri,
                         project.index_name,
                         project.type,
                         from_,
                         size,
                         session_id,
                         getattr(project, "has_ground_truth_labels", False))

        if rule_id:
            results = read_docs_with_rules(*inputs_params, rule_id)

        elif label:
            label = check_label_arg(label, project.type)
            results = read_docs_with_manual_labels(*inputs_params, label)

        else:
            raise Exception("Need to defined either rule or label.")

    return json.dumps({"total": results.total,
                       "docs": results.documents,
                       "labels": results.ground_truth_labels,
                       "doc_ids": results.doc_ids})


@supervised_bp.route('/api/label-entity', methods=['POST'])
def label_entity():
    project_name = request.form['project_name']
    if not project_name:
        raise Exception("Project name undefined")

    doc_id = request.form['doc_id']
    try:
        doc_id = int(doc_id)
    except:
        raise Exception("Doc id undefined")

    try:
        spans = check_entity_form_input(json.loads(request.form['spans']))
    except:
        raise Exception("Manual label undefined or badly formed.")

    session_id = request.form['session_id']
    if not session_id:
        raise Exception("Session id undefined or badly formed.")

    with session_scope(db) as session:
        project = get_project(session, project_name)
        check_supervised_project(project)
        es_uri = es.get_es_uri(current_app.config)
        spans_to_save = get_correct_spans(project, spans, doc_id)
        ner_es.add_entity(es_uri, project.index_name, doc_id, spans_to_save, session_id)
    return json.dumps(spans_to_save)


@supervised_bp.route('/api/export-rules', methods=['POST'])
def export_rules():
    project_name = request.form['project_name']
    if not project_name:
        raise Exception("Project name undefined")

    with session_scope(db) as session:
        project = get_project(session, project_name)
        check_supervised_project(project)
        data = export_rules_func(project)
    return data.getvalue()


@supervised_bp.route('/api/import-rules', methods=['POST'])
def import_rules():
    project_name = request.form['project_name']
    if not project_name:
        raise Exception("Project name undefined")

    file = request.files['file']
    if not file:
        raise Exception("File is undefined")

    print("Importing rules with params", request.form)
    polling = bool(strtobool(request.form['polling']))

    import_id = request.form['import_id']
    if not import_id:
        raise Exception("Need import id for polling")

    with session_scope(db) as session:
        project = get_project(session, project_name)
        check_supervised_project(project)
        if polling:
            import_id = check_import_finished(session,
                                              project_name,
                                              import_id)
        else:
            es_uri = es.get_es_uri(current_app.config)
            import_id = rule_fns.add_rules(session, project, es_uri, file, import_id)
    return json.dumps({"id": import_id})
