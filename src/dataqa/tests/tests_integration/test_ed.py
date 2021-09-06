"""
End-to-end tests for entity disambiguation
"""
import json
import time

from dataqa.db.ops.common import get_project, session_scope
from dataqa.db.ops.entity_disambiguation import get_ent_mapping
from dataqa.elasticsearch.client.utils.common import get_total_documents

TEST_PROJECT_NAME = "test_project_ed"


def check_mentions_upload(api, sql_db, mentions_filepath):
    project_data = {"upload_id": 123,
                    "project_name": TEST_PROJECT_NAME,
                    "project_type": "entity_disambiguation"}

    data_dict = project_data
    data_dict["file_type"] = "documents"
    data_dict["polling"] = False
    data_dict["file"] = open(mentions_filepath, "rb")

    response = api.post('/api/upload', data=data_dict)
    assert response.status_code == 200

    number_attempts = 10
    project_id = None
    while number_attempts >= 0:
        data_dict["polling"] = True
        data_dict["file"] = open(mentions_filepath, "rb")
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

    with session_scope(sql_db) as session:
        project = get_project(session, TEST_PROJECT_NAME)
        assert project.id == project_id
        assert project.index_name is not None
        assert project.kb_index_name is None
        assert project.filename == mentions_filepath
        assert project.total_mentions == 17
        assert project.total_entities == 14
        assert project.total_documents == 6
        assert project.type == 'entity_disambiguation'


def check_kb_upload(api, sql_db, kb_filepath):
    project_data = {"kb_upload_id": 123,
                    "project_name": TEST_PROJECT_NAME,
                    "project_type": "entity_disambiguation"}

    data_dict = project_data
    data_dict["file_type"] = "kb"
    data_dict["polling"] = False
    data_dict["file"] = open(kb_filepath, "rb")

    response = api.post('/api/upload', data=data_dict)
    assert response.status_code == 200

    number_attempts = 10
    project_id = None
    while number_attempts >= 0:
        data_dict["polling"] = True
        data_dict["file"] = open(kb_filepath, "rb")
        response = api.post('/api/upload', data=data_dict)
        assert response.status_code == 200
        project_id = json.loads(response.data)["id"]
        if project_id is not None:
            break
        time.sleep(5)
        number_attempts -= 1

    assert project_id is not None

    with session_scope(sql_db) as session:
        project = get_project(session, TEST_PROJECT_NAME)
        assert project.kb_index_name is not None
        assert project.kb_filename == kb_filepath
        assert project.total_bases == 10


def wait_until_upload_finished(sql_db, es_uri):
    with session_scope(sql_db) as session:
        project = get_project(session, TEST_PROJECT_NAME)
        number_attempts = 10
        while number_attempts >= 0:
            total_mentions_docs = get_total_documents(es_uri, project.index_name)
            total_kb_docs = get_total_documents(es_uri, project.kb_index_name)
            if total_mentions_docs == 6 and total_kb_docs == 10:
                return
            else:
                number_attempts =- 1
                time.sleep(1)


def check_project_stats(api):
    response = api.get('/api/project-stats', query_string={"project_name": TEST_PROJECT_NAME})
    assert response.status_code == 200
    response_json = json.loads(response.data)

    assert response_json["total_bases"] == 10
    assert response_json["total_mentions"] == 17
    assert response_json["total_entities"] == 14
    assert response_json["total_documents"] == 6


def check_get_unmatched(api):
    data_dict = {"project_name": TEST_PROJECT_NAME,
                 "from_entity_offset": 0,
                 "session_id": 123,
                 "unmatched": True}

    response = api.get('/api/get-entities', query_string=data_dict)
    assert response.status_code == 200
    response_json = json.loads(response.data)

    assert len(response_json["entities"]) == 10
    assert response_json["total_entities"] == 14
    assert any([(x["id"] == 5) and
                (x["text"] == "pain") and
                (x["total_docs"] == 2) for x in response_json["entities"]])


def check_label_entity(api, sql_db):
    data_dict = {"project_name": TEST_PROJECT_NAME,
                 "doc_id": 5,
                 "manual_label": json.dumps({"label": 4, "name": "pain"}),
                 "session_id": 123}
    response = api.post('/api/label-doc', data=data_dict)
    assert response.status_code == 200

    with session_scope(sql_db) as session:
        project = get_project(session, TEST_PROJECT_NAME)
        number_attempts = 10
        while number_attempts >= 0:
            entity_mapping = get_ent_mapping(session, 5, project.id)
            if (entity_mapping.kb_id == 4) and (entity_mapping.kb_name == "pain"):
                return
            else:
                number_attempts =- 1
                time.sleep(1)


def check_get_matched_entities(api):
    data_dict = {"project_name": TEST_PROJECT_NAME,
                 "from_entity_offset": 0,
                 "session_id": 123,
                 "unmatched": False}

    response = api.get('/api/get-entities', query_string=data_dict)
    assert response.status_code == 200

    response_json = json.loads(response.data)
    assert len(response_json["entities"]) == 1
    assert response_json["total_entities"] == 1
    entity = response_json["entities"][0]
    assert entity["id"] == 5
    assert entity["text"] == "pain"
    assert entity["total_docs"] == 2


def check_search_kb(api):
    data_dict = {"project_name": TEST_PROJECT_NAME,
                 "input": "head"}

    response = api.get('/api/search-kb', query_string=data_dict)
    assert response.status_code == 200

    response_json = json.loads(response.data)
    assert any([(x["name"] == "migraines and headaches") and
                (x["id"] == 0) for x in response_json])


def test_end_to_end(api, sql_db, es_uri, mentions_filepath, kb_filepath):
    check_mentions_upload(api, sql_db, mentions_filepath)
    check_kb_upload(api, sql_db, kb_filepath)
    wait_until_upload_finished(sql_db, es_uri)
    check_project_stats(api)
    check_get_unmatched(api)
    check_label_entity(api, sql_db)
    check_get_matched_entities(api)
    check_search_kb(api)
    return