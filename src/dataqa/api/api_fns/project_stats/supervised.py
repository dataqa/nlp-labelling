from dataqa.api.api_fns.rules import rule_fns
from dataqa.api.api_fns.label.supervised import get_labelled_docs
from dataqa.constants import PROJECT_TYPE_CLASSIFICATION
from dataqa.db.ops import supervised as db_ops
from dataqa.elasticsearch.client.utils import ner as ner_es
from dataqa.ml.metrics import ner as ner_metrics


def delete_update_rule_stats(project, es_uri, rule_id):
    if project.type == PROJECT_TYPE_CLASSIFICATION:
        rule_fns.delete_update_rule_stats_classification(project, es_uri, rule_id)
    else:
        rule_fns.delete_update_rule_stats_ner(project, es_uri, rule_id)


def update_rule_stats_classification(project, es_uri, rule_ids, entity_ids, update_id):
    """
    Update the rule accuracy statistics.

    When we call the update endpoint, we retrieve the latest set of manual labels and
    update the rule accuracy statistics.
    """
    # get all docs with manual_labels in ES: rules, predicted_labels, manual_labels
    (all_labels_mat,
     merged_labels,
     manual_labels,
     labelled_doc_ids) = get_labelled_docs(es_uri, project.index_name, rule_ids)

    # Compute rule stats and accuracy
    stats = rule_fns.get_rule_accuracy_stats_classification(project,
                                                            rule_ids,
                                                            all_labels_mat,
                                                            merged_labels,
                                                            manual_labels)

    if project.has_ground_truth_labels:
        stats["ground_truth"] = rule_fns.get_ground_truth_accuracy_stats_classification(entity_ids,
                                                                                        es_uri,
                                                                                        project.index_name)

    # Update the rule data
    db_ops.update_accuracy_stats_classification(project, stats, update_id, update_rules=True)


def update_accuracy_stats_ner(project, es_uri, rule_ids, entity_ids, update_id):
    # 1. download all the spans
    (rule_spans,
     predicted_label_spans,
     manual_labels) = ner_es.get_all_manual_entity_spans(es_uri,
                                                         project.index_name,
                                                         rule_ids,
                                                         project.total_documents)

    # 2. compute stats
    stats = ner_metrics.get_rule_accuracy_stats_ner(entity_ids,
                                                    rule_ids,
                                                    rule_spans,
                                                    predicted_label_spans,
                                                    manual_labels)

    # Update the rule data
    db_ops.update_rules_accuracy_project_ner(project,
                                             stats,
                                             update_id)


def update_rule_stats(project, es_uri, update_id):
    # based on the files
    rule_ids = [rule.id for rule in project.rules]
    entity_ids = [model_class.id for model_class in project.classes]

    if project.type == PROJECT_TYPE_CLASSIFICATION:
        update_rule_stats_classification(project, es_uri, rule_ids, entity_ids, update_id)
    else:
        update_accuracy_stats_ner(project, es_uri, rule_ids, entity_ids, update_id)
