import csv
from itertools import cycle

from dataqa.api.api_fns.utils import check_file_size, get_decoded_stream
from dataqa.constants import COLOURS
from dataqa.db.ops.supervised import add_class_names
from dataqa.elasticsearch.client.utils.classification import add_ground_truth_ids_to_es


def add_class_colours(class_names):
    for class_colour, class_item in zip(cycle(COLOURS), class_names):
        class_item['colour'] = class_colour


def get_class_names(file_bytes, column_name):
    file = get_decoded_stream(file_bytes)
    check_file_size(file)

    class_names = []
    reader = csv.DictReader(file)
    for line_ind, line in enumerate(reader):
        class_name = line[column_name]
        if len(class_name) == 0:
            raise Exception(f"There is an empty class name on line {line_ind + 1}.")
        class_names.append({"id": line_ind, "name": class_name})

    add_class_colours(class_names)
    return class_names


def set_class_names(project, file_bytes, es_uri, column_name):
    class_names = get_class_names(file_bytes, column_name)
    add_class_names(project, class_names)
    if project.supervised_type == "classification" and project.has_ground_truth_labels:
        class_mapping = dict((x["name"], x["id"]) for x in class_names)
        # class_mapping.pop("Appliances")
        successful_update = add_ground_truth_ids_to_es(es_uri, project.index_name, class_mapping)
        if not successful_update:
            project.has_ground_truth_labels = False
    return class_names
