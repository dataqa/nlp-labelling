from datetime import datetime
from distutils.util import strtobool
import json

from flask import (current_app,
                   render_template,
                   request,
                   Blueprint)

from dataqa.api.api_fns.delete_project.supervised import delete_project_files
from dataqa.api.api_fns.export_results.supervised import export_labels
from dataqa.api.api_fns.project_creation.common import (check_upload_finished,
                                                        get_upload_key)

from dataqa.api.api_fns.project_creation.supervised import create_supervised_project
from dataqa.api.api_fns.project_creation.entity_disambiguation import create_entity_disambiguation_project

from dataqa.api.api_fns.label.entity_disambiguation import label_kb
from dataqa.db.connection import DB
from dataqa.constants import (ALL_PROJECT_TYPES,
                              PROJECT_TYPE_CLASSIFICATION,
                              PROJECT_TYPE_NER)
from dataqa.db.ops.common import (get_project, get_project_list, session_scope)
import dataqa.elasticsearch.client.utils.common as es
import dataqa.elasticsearch.client.utils.classification as classification_es

bp = Blueprint('api', __name__)
db = DB()


@bp.route("/")
def index():
    return render_template('index.html')


@bp.route('/', defaults={'path': ''})
@bp.route('/<path:path>')
def catch_all(path):
    print(f"Catching path {path}")
    return render_template('index.html')


@bp.route('/hello')
def hello_world():
    return 'Hello, World!'


@bp.route('/api/upload', methods=['POST'])
def upload():
    start_time = datetime.now()
    file = request.files['file']
    if not file:
        raise Exception("File is undefined")

    project_name = request.form['project_name']
    if not project_name:
        raise Exception("Project name undefined")

    project_type = request.form['project_type']
    if not project_type:
        raise Exception("Project type undefined")

    try:
        file_type = request.form['file_type']
        upload_key = get_upload_key(project_type, file_type)
    except:
        raise Exception(f"File type undefined or incorrect..")

    upload_id = request.form[upload_key]
    if not upload_id:
        raise Exception("Need upload id for polling")

    if project_type not in ALL_PROJECT_TYPES:
        raise Exception(f"Non-recognised project type {project_type}. "
                        f"Needs to be one of: {ALL_PROJECT_TYPES}")

    polling = bool(strtobool(request.form['polling']))

    print("Uploading with params", request.form)
    class_names = None

    with session_scope(db) as session:
        es_uri = es.get_es_uri(current_app.config)
        if polling:
            project_id = check_upload_finished(session,
                                               project_name,
                                               project_type,
                                               file_type,
                                               upload_id)
        else:
            input_params = (session,
                            es_uri,
                            file,
                            project_name,
                            project_type,
                            upload_id,
                            file_type)

            upload_folder = current_app.config["UPLOAD_FOLDER"]

            if project_type in [PROJECT_TYPE_CLASSIFICATION, PROJECT_TYPE_NER]:
                project_id = create_supervised_project(*input_params, upload_folder)
            else:
                project_id, class_names = create_entity_disambiguation_project(*input_params)

    if project_id:
        end_time = datetime.now()
        print(f"Upload took {(end_time - start_time).seconds / 60} minutes.")

    return json.dumps({"id": project_id, "class_names": class_names})


@bp.route('/api/delete-project/<project_name>', methods=['DELETE'])
def delete_project(project_name):
    if not project_name:
        raise Exception("Project name undefined")

    with session_scope(db) as session:
        es_uri = es.get_es_uri(current_app.config)
        project = get_project(session, project_name)
        # delete index
        es.delete_index(es_uri, project.index_name)
        # delete files
        delete_project_files(project)
        # delete project in db
        session.delete(project)

    return "success"


@bp.route('/api/search', methods=['POST'])
def search():
    request_json = request.json
    project_name = request_json['projectName']
    if not project_name:
        raise Exception("Project name undefined")

    with session_scope(db) as session:
        es_uri = es.get_es_uri(current_app.config)
        project = get_project(session, project_name)
        response = es.search_docs(es_uri, project.index_name, request_json["body"])
    return response


@bp.route('/api/get-projects', methods=['GET'])
def get_projects():
    project_list = get_project_list(db)
    return json.dumps(project_list)


@bp.route('/api/export-labels', methods=['POST'])
def export_labels_api():
    project_name = request.form['project_name']
    if not project_name:
        raise Exception("Project name undefined")

    with session_scope(db) as session:
        es_uri = es.get_es_uri(current_app.config)
        project = get_project(session, project_name)
        data = export_labels(project, es_uri)
    return data.getvalue()


@bp.route('/api/label-doc', methods=['POST'])
def label_doc():
    project_name = request.form['project_name']
    if not project_name:
        raise Exception("Project name undefined")

    doc_id = request.form['doc_id']
    if not doc_id:
        raise Exception("Doc id undefined")

    try:
        manual_label = json.loads(request.form['manual_label'])
        label = manual_label["label"]
    except:
        raise Exception("Manual label undefined or badly formed.")

    session_id = request.form['session_id']
    if not session_id:
        raise Exception("Session id undefined or badly formed.")

    with session_scope(db) as session:
        project = get_project(session, project_name)
        es_uri = es.get_es_uri(current_app.config)
        project_type = project.type
        if project_type in [PROJECT_TYPE_CLASSIFICATION, PROJECT_TYPE_NER]:
            classification_es.label_doc(es_uri,
                                        project.index_name,
                                        doc_id,
                                        label,
                                        session_id)
        else:
            label_kb(session, project, doc_id, manual_label, session_id)
    return "success"
