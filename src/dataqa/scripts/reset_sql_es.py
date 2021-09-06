from dataqa.db.scripts import reset as reset_sql
import dataqa.elasticsearch.client.scripts.create_index as reset_es
from dataqa.elasticsearch.client.utils.common import get_es_uri
import os
import shutil

from dataqa.config.config_reader import read_config


def remove_hidden_dirs(upload_folder):
    dirpath, dirnames, filenames = next(os.walk(upload_folder))
    for dirname in dirnames:
        if dirname not in ["elasticsearch_data", "elasticsearch_logs"]:
            path = os.path.join(dirpath, dirname)
            shutil.rmtree(path)




def main(es_uri, upload_folder, database_file):
    print("Resetting SQL tables")
    reset_sql.main(database_file)
    print("Resetting ES")
    reset_es.main(es_uri)
    print("Deleting hidden files")
    remove_hidden_dirs(upload_folder)



if __name__ == '__main__':
    config = read_config()
    config_dict = dict(config.items("DEFAULT"))
    es_uri = get_es_uri(config_dict)
    main(es_uri, config_dict["UPLOAD_FOLDER"], config_dict["DATABASE_FILE"])
