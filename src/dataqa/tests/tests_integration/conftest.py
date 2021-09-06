import os
import requests
import shutil
import signal
import time

from pathlib import Path
import psutil
import pytest

from dataqa_es import start_es_server
from dataqa.constants import HOME
from dataqa.db.models import Base
from dataqa.db.utils import get_engine
from dataqa.api import create_app
from dataqa.config.config_reader import read_config
from dataqa.elasticsearch.client.utils.common import get_es_uri
from dataqa.api.blueprints.common import db

TEST_UPLOAD_FOLDER = str(Path(HOME, '.dataqa_data_test/'))
TEST_ROOT_PATH = Path(__file__).parent.parent.absolute()
DATABASE_FILE = str(Path(TEST_UPLOAD_FOLDER, "project.db"))


def kill_child_processes(parent_pid, sig=signal.SIGTERM):
    try:
        parent = psutil.Process(parent_pid)
    except psutil.NoSuchProcess:
        return None
    children = parent.children(recursive=True)
    for process in children:
        print(f"Killing child process {process.pid}")
        process.send_signal(sig)
    return parent


@pytest.fixture(scope="session")
def es_files():
    if not os.path.exists(TEST_UPLOAD_FOLDER):
        os.makedirs(TEST_UPLOAD_FOLDER)
    es_logs_path = str(Path(TEST_UPLOAD_FOLDER, 'elasticsearch_logs'))
    es_data_path = str(Path(TEST_UPLOAD_FOLDER, 'elasticsearch_data'))
    yield es_logs_path, es_data_path
    time.sleep(5)
    if os.path.exists(TEST_UPLOAD_FOLDER):
        shutil.rmtree(TEST_UPLOAD_FOLDER)


@pytest.fixture(scope="session")
def app_config(es_files):
    es_logs_path, es_data_path = es_files

    config = read_config()
    config['DEFAULT']['UPLOAD_FOLDER'] = TEST_UPLOAD_FOLDER
    config['DEFAULT']['ES_HTTP_PORT'] = '9201'
    config['DEFAULT']['ES_TRANSPORT_PORT'] = '9301'
    config['DEFAULT']['ES_DATA_PATH'] = es_data_path
    config['DEFAULT']['ES_LOGS_PATH'] = es_logs_path
    config['DEFAULT']['DATABASE_FILE'] = DATABASE_FILE

    return config


@pytest.fixture(scope="session")
def es_uri(app_config):
    es = start_es_server.main(app_config['DEFAULT']['ES_LOGS_PATH'],
                              app_config['DEFAULT']['ES_DATA_PATH'],
                              app_config["DEFAULT"]["ES_HTTP_PORT"],
                              app_config["DEFAULT"]["ES_TRANSPORT_PORT"])
    number_attempts = 10
    while number_attempts >= 0:
        try:
            requests.get(f'http://localhost:{app_config["DEFAULT"]["ES_HTTP_PORT"]}')
            break
        except requests.exceptions.ConnectionError:
            time.sleep(5)
            number_attempts -= 1
    yield get_es_uri(app_config["DEFAULT"])
    parent_process = kill_child_processes(es.pid)
    if parent_process is not None:
        print(f"Killing parent process {parent_process.pid}")
        parent_process.send_signal(signal.SIGTERM)


@pytest.fixture(scope="session")
def sql_db(app_config):
    if not os.path.exists(TEST_UPLOAD_FOLDER):
        os.makedirs(TEST_UPLOAD_FOLDER)
    db_file = app_config["DEFAULT"]["DATABASE_FILE"]
    engine = get_engine(db_file)
    Base.metadata.create_all(engine)
    db.init_session_maker(db_file)
    yield db


@pytest.fixture(scope="session")
def api(app_config, sql_db):
    application = create_app(app_config["DEFAULT"]["DATABASE_FILE"])
    application.config['TESTING'] = True
    application.config.from_mapping(app_config.items("DEFAULT"))
    with application.test_client() as client:
        yield client


@pytest.fixture(scope="session")
def test_file_path():
    yield str(Path(TEST_ROOT_PATH, "resources/test_data.csv"))


@pytest.fixture(scope="session")
def test_class_name_classification_file_path():
    yield str(Path(TEST_ROOT_PATH, "resources/test_data_class_names_classification.csv"))


@pytest.fixture(scope="session")
def test_class_name_ner_file_path():
    yield str(Path(TEST_ROOT_PATH, "resources/test_data_class_names_ner.csv"))


@pytest.fixture(scope="session")
def mentions_filepath():
    yield str(Path(TEST_ROOT_PATH, "resources/test_data_mentions.csv"))


@pytest.fixture(scope="session")
def kb_filepath():
    yield str(Path(TEST_ROOT_PATH, "resources/test_data_kb.csv"))

