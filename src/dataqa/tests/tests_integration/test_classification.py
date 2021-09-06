from functools import partial
import json
from mock import patch
import time
from dataqa.db.ops.common import get_project, session_scope
from dataqa.elasticsearch.client.utils.classification import process_es_docs_classification

TEST_PROJECT_NAME = "test_project_classification"

patched = lambda query, es_uri, index_name, _: process_es_docs_classification(query, es_uri, index_name, False)

@patch('dataqa.elasticsearch.client.utils.classification.process_es_docs_classification',
       patched)
def check_file_upload(api, test_file_path):
    project_data = {"upload_id": 123,
                    "project_name": TEST_PROJECT_NAME,
                    "project_type": "classification"}

    data_dict = project_data
    data_dict["file_type"] = "documents"
    data_dict["polling"] = False
    data_dict["file"] = open(test_file_path, "rb")

    response = api.post('/api/upload', data=data_dict)
    assert response.status_code == 200

    number_attempts = 10
    project_id = None
    while number_attempts >= 0:
        data_dict["polling"] = True
        data_dict["file"] = open(test_file_path, "rb")
        response = api.post('/api/upload', data=data_dict)
        assert response.status_code == 200
        project_id = json.loads(response.data)["id"]
        if project_id is not None:
            break
        time.sleep(5)
        number_attempts -= 1

    assert project_id is not None
    response = api.get('/api/get-projects')
    project_list = json.loads(response.data)

    assert len(project_list) > 0
    assert any([project["project_id"] == project_id and
                project["project_name"] == project_data["project_name"] and
                project["project_type"] == project_data["project_type"]
                for project in project_list])

    docs = wait_until_docs_labelled(api, {"rule_id": "-2"}, 456)
    assert len(docs) == 10


def check_classnames(api, test_class_name_file_path):
    data_dict = {"project_name": TEST_PROJECT_NAME,
                 "file": open(test_class_name_file_path, "rb")}

    response = api.post('/api/classnames', data=data_dict)
    assert response.status_code == 200
    response = api.get('/api/get-projects')
    project_list = json.loads(response.data)
    assert len(project_list) > 0
    assert any([project['class_names'][0]['name'] == 'does not cause'
                and project['class_names'][1]['name'] == 'cause'
                for project in project_list if len(project.get("class_names", []))])


def check_rule_creation(api, sql_db):
    rule_data = {"create_rule_id": 123,
                 "project_name": TEST_PROJECT_NAME,
                 "rule_name": "test rule",
                 "rule_type": "ordered",
                 "class_id": 1,
                 "class_name": "cause",
                 "params": json.dumps({"rules": [{"word": "cause", "type": "lemma"}],
                                       "positive_class": True,
                                       "contains": True,
                                       "sentence": False})}

    data_dict = rule_data
    data_dict["polling"] = True

    response = api.post('/api/create-rule', data=data_dict)
    assert response.status_code == 200
    assert json.loads(response.data)["create_rule_id"] is None

    with session_scope(sql_db) as session:
        project = get_project(session, TEST_PROJECT_NAME)
        assert len(project.rules) == 0

        data_dict["polling"] = False
        response = api.post('/api/create-rule', data=data_dict)
        assert response.status_code == 200
        session.refresh(project)

        assert len(project.rules) == 1
        rule_id = project.rules[0].id
        assert project.rules[0].name == "test rule"
        assert project.rules[0].coverage == 1
        assert project.total_predicted_docs == 1

    docs = wait_until_docs_labelled(api, {"rule_id": rule_id}, 456)
    assert len(docs) > 0


def check_update_rules(api):
    data_dict = {"project_name": TEST_PROJECT_NAME,
                 "update_id": "123",
                 "polling": False}

    response = api.post('/api/update-rules', data=data_dict)
    assert response.status_code == 200

    number_attempts = 10
    update_id = None
    project_info = None
    while number_attempts >= 0:
        data_dict["polling"] = True
        response = api.post('/api/update-rules', data=data_dict)
        assert response.status_code == 200
        project_info = json.loads(response.data)
        update_id = int(project_info["update_id"])
        if update_id is not None and update_id == 123:
            break
        time.sleep(5)
        number_attempts -= 1

    assert update_id == 123
    return project_info


def get_docs(api, label_or_rule_dict, session_id):
    data_dict = {"project_name": TEST_PROJECT_NAME,
                 "from": 0,
                 "size": 10,
                 "session_id": session_id}
    data_dict.update(label_or_rule_dict)

    response = api.get('/api/get-docs', query_string=data_dict)
    assert response.status_code == 200
    docs = json.loads(response.data)["docs"]
    return docs


def wait_until_docs_labelled(api, label_or_rule_dict, session_id):
    number_attempts = 10
    docs = []
    while number_attempts >= 0:
        docs = get_docs(api, label_or_rule_dict, session_id)
        if len(docs) == 0:
            number_attempts -= 1
        else:
            break
        time.sleep(1)
    return docs


def check_label_docs(api):
    data_dict = {"project_name": TEST_PROJECT_NAME,
                 "doc_id": 0,
                 "manual_label": json.dumps({"label": 0}),
                 "session_id": 123}
    response = api.post('/api/label-doc', data=data_dict)
    assert response.status_code == 200

    data_dict["doc_id"] = 3
    data_dict["manual_label"] = json.dumps({"label": 1})
    response = api.post('/api/label-doc', data=data_dict)
    assert response.status_code == 200

    docs = wait_until_docs_labelled(api, {"label": 0}, 456)
    assert len(docs) == 1
    docs = wait_until_docs_labelled(api, {"label": 1}, 456)
    assert len(docs) == 1
    docs = wait_until_docs_labelled(api, {"label": "none"}, 456)
    assert len(docs) == 8

    project_info = check_update_rules(api)
    assert project_info["docs"]["total_correct"] == 1
    assert project_info["docs"]["total_predicted_docs"] == 1
    assert project_info["docs"]["total_not_predicted"] == 1
    assert project_info["docs"]["total_manual_docs"] == 2


def check_delete_rule(api):
    data_dict = {"project_name": TEST_PROJECT_NAME,
                 "rule_id": 1}
    response = api.post('/api/delete-rule', data=data_dict)

    project_info = json.loads(response.data)
    assert len(project_info["rules"]) == 0
    assert project_info["docs"]["total_not_predicted"] == 2
    assert project_info["docs"]["total_correct"] == 0


def test_end_to_end(api, sql_db, es_uri, test_file_path, test_class_name_classification_file_path):
    check_file_upload(api, test_file_path)
    check_classnames(api, test_class_name_classification_file_path)
    check_rule_creation(api, sql_db)
    check_update_rules(api)
    check_label_docs(api)
    check_delete_rule(api)
    return
