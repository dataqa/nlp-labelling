import json
import time
from dataqa.db.ops.common import get_project, session_scope

TEST_PROJECT_NAME = "test_project_ner"


def check_file_upload(api, test_file_path):
    project_data = {"upload_id": 123,
                    "project_name": TEST_PROJECT_NAME,
                    "project_type": "ner"}

    data_dict = project_data
    data_dict["polling"] = False
    data_dict["file_type"] = "documents"
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


def check_classnames(api, test_class_name_ner_file_path):
    data_dict = {"project_name": TEST_PROJECT_NAME,
                 "file": open(test_class_name_ner_file_path, "rb")}

    response = api.post('/api/classnames', data=data_dict)
    assert response.status_code == 200
    response = api.get('/api/get-projects')
    project_list = json.loads(response.data)
    assert len(project_list) > 0
    assert any([project['class_names'][0]['name'] == 'drug'
                and project['class_names'][1]['name'] == 'condition'
                for project in project_list if len(project.get("class_names", []))])


def check_rule_creation(api, sql_db):
    rule_data = {"create_rule_id": 123,
                 "project_name": TEST_PROJECT_NAME,
                 "rule_name": "test rule ner",
                 "rule_type": "noun_phrase_regex",
                 "class_id": 1,
                 "class_name": "condition",
                 "params": json.dumps({"text_regex": "patients with",
                                       "sentence": True,
                                       "noun_phrase_regex": ".*"})}

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
        assert project.rules[0].name == "test rule ner"
        assert project.rules[0].coverage == 3
        assert project.total_predicted_docs == 3

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
                 "doc_id": 6,
                 "spans": json.dumps([{"start": 57,
                                       "end": 64,
                                       "text": "propofol",
                                       "id": "abc",
                                       "entity_id": 0}]),
                 "session_id": 123}
    response = api.post('/api/label-entity', data=data_dict)
    assert response.status_code == 200

    data_dict["doc_id"] = 2
    data_dict["spans"] = json.dumps([{"start": 33,
                                       "end": 61,
                                       "text": "obsessive compulsive disorder",
                                       "entity_id": 1,
                                       "id": "def"}])
    response = api.post('/api/label-entity', data=data_dict)
    assert response.status_code == 200

    data_dict["doc_id"] = 0
    data_dict["spans"] = json.dumps([])
    response = api.post('/api/label-entity', data=data_dict)
    assert response.status_code == 200

    docs = wait_until_docs_labelled(api, {"label": 0}, 456)
    assert len(docs) == 1
    docs = wait_until_docs_labelled(api, {"label": 1}, 456)
    assert len(docs) == 1
    docs = wait_until_docs_labelled(api, {"label": "empty"}, 456)
    assert len(docs) == 1
    docs = wait_until_docs_labelled(api, {"label": "none"}, 456)
    assert len(docs) == 7

    project_info = check_update_rules(api)
    assert project_info["docs"]["classes"][1]["total_correct"] == 1
    assert project_info["docs"]["classes"][0]["total_correct"] == 0
    assert project_info["docs"]["classes"][1]["total_incorrect"] == 5

    assert project_info["docs"]["total_docs_rules_manual_labelled"] == 1
    assert project_info["docs"]["total_manual_docs"] == 3
    assert project_info["docs"]["total_manual_docs_empty"] == 1

    assert len(project_info["rules"]) == 1
    assert project_info["rules"][0]["missed"] == 0
    assert project_info["rules"][0]["accuracy"] == "1/6"


def check_delete_rule(api):
    data_dict = {"project_name": TEST_PROJECT_NAME,
                 "rule_id": 1}
    response = api.post('/api/delete-rule', data=data_dict)

    project_info = json.loads(response.data)
    assert len(project_info["rules"]) == 0
    assert project_info["docs"]["total_docs_rules_manual_labelled"] == 0

    for class_info in project_info["docs"]["classes"]:
        assert class_info["total_correct"] == 0
        assert class_info["total_incorrect"] == 0


def test_end_to_end(api, sql_db, es_uri, test_file_path, test_class_name_ner_file_path):
    check_file_upload(api, test_file_path)
    check_classnames(api, test_class_name_ner_file_path)
    check_rule_creation(api, sql_db)
    check_update_rules(api)
    check_label_docs(api)
    check_delete_rule(api)
    return
