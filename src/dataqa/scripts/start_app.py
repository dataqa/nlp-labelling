import argparse
import os
import webbrowser

from dataqa_es import start_es_server

from dataqa.api import create_app
from dataqa.db.scripts.create_tables import create_all_tables
from dataqa.config.config_reader import read_config


def get_arg_parser():
    parser = argparse.ArgumentParser(description='Start application.')
    parser.add_argument('--no-browser', action='store_true', help='Launch the app without a browser.')
    parser.add_argument('--no-es', action='store_true', help='Launch the app without elasticsearch.')
    parser.add_argument('--auto-reload-flask', action='store_true',
                        help='Auto-reload the flask app after code changes.')
    return parser


def main(no_browser=False, no_es=False, auto_reload_flask=False):

    config = read_config()
    upload_folder = config["DEFAULT"]["UPLOAD_FOLDER"]
    database_file = config["DEFAULT"]["DATABASE_FILE"]
    flask_port = config["DEFAULT"]["FLASK_PORT"]

    if not os.path.exists(upload_folder):
        os.makedirs(upload_folder)

    print("Starting the SQL server")
    create_all_tables(database_file)

    if not no_es:
        print("Starting the ES server")
        start_es_server.main(config["DEFAULT"]["ES_LOGS_PATH"],
                             config["DEFAULT"]["ES_DATA_PATH"])

    if not no_browser and not os.environ.get("WERKZEUG_RUN_MAIN"):
        webbrowser.open_new('http://127.0.0.1:5000/')

    print("Starting the application")
    application = create_app(database_file)
    application.config.from_mapping(config.items("DEFAULT"))

    application.run(debug=auto_reload_flask,
                    port=flask_port)


if __name__ == "__main__":
    parser = get_arg_parser()
    args = parser.parse_args()
    main(args.no_browser, args.no_es, args.auto_reload_flask)