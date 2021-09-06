import csv
import io
import json

from dataqa.constants import PROJECT_TYPE_CLASSIFICATION
from dataqa.elasticsearch.client.utils import classification as classification_es, ner as ner_es


def export_labels(project, es_uri):
    rules = sorted([(rule.id, rule.name) for rule in project.rules], key=lambda x: x[0])
    rule_cols = [x[1] for x in rules]
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["row_id", "manual_label", "merged_label"] + rule_cols)

    if project.type == PROJECT_TYPE_CLASSIFICATION:
        export_labels_classification(project, es_uri, rules, writer)
    else:
        export_spans(project, es_uri, rules, writer)

    return output


def export_labels_classification(project, es_uri, rules, writer):
    es_results = classification_es.export_labels(es_uri, project.index_name)
    for (row_id, manual_label, merged_label, rule_labels) in es_results:
        rule_row = [rule_labels.get(rule_id) for rule_id, _ in rules]
        writer.writerow([row_id, manual_label, merged_label] + rule_row)


def json_dump_rule_spans(rules_array):
    if not rules_array:
        return None
    spans = []
    for span in rules_array:
        spans.append({"start": span["start"],
                      "end": span["end"],
                      "text": span["text"]})
    return json.dumps(spans)


def json_dump_manual_spans(manual_array):
    if manual_array is None:
        return None
    spans = []
    for span in manual_array:
        spans.append({"start": span["start"],
                      "end": span["end"],
                      "text": span["text"]})
    return json.dumps(spans)


def export_spans(project, es_uri, rules, writer):
    es_results = ner_es.export_spans(es_uri, project.index_name)
    for (row_id, manual_spans, rule_spans) in es_results:
        rule_row = [json_dump_rule_spans(rule_spans.get(rule_id)) for rule_id, _ in rules]
        writer.writerow([row_id, json_dump_manual_spans(manual_spans)] + rule_row)


def export_rules(project):
    rules = project.rules
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["rule_type", "name", "params", "class_id"])
    for rule in rules:
        writer.writerow([rule.rule_type, rule.name, rule.params, rule.class_id])
    return output