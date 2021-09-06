from collections import Counter
import numpy as np
from bootstrapped import bootstrap as bs
from dataqa.constants import (ABSTAIN,
                              MIN_LABELLED_PRECISION,
                              MIN_LABELLED_RECALL,
                              NUM_ITERATIONS_BOOTSTRAP)

NO_LABEL_VALUE = 0  # fill value to compute metrics for absence of label
LABEL_VALUE = 1  # fill value to compute metrics for presence of label


def get_rule_accuracy_from_mats(rules_mat, manual_labels, rule_ids):
    """
    Rule accuracy metrics.

    For each rule, compute its accuracy.
    """
    manual_label_indices = np.where(manual_labels != ABSTAIN)[0]

    if len(rules_mat) == 0:
        rules_labelled = np.ones((len(manual_label_indices), len(rule_ids))) * ABSTAIN
    else:
        rules_labelled = rules_mat[manual_label_indices, :]

    _, num_rules = rules_labelled.shape
    total_predicted = (rules_labelled != ABSTAIN).sum(axis=0)
    total_correct = (rules_labelled == np.tile(manual_labels, (num_rules, 1)).T).sum(axis=0)
    accuracy_dict = dict(zip(rule_ids, [f"{y}/{x}" for x, y in zip(total_predicted, total_correct)]))
    return accuracy_dict


def get_sample_stat(predicted_true_mat):
    if len(predicted_true_mat.shape) == 1:
        total_correct = predicted_true_mat.sum()
        total_precision = [total_correct / predicted_true_mat.shape[0]]
    else:
        total_correct = predicted_true_mat.sum(axis=1)
        total_precision = total_correct / predicted_true_mat.shape[1]
    return total_precision


def get_entity_performance_estimates(entity_metrics, entity_ids):
    performance_estimates = {}

    for entity_id in entity_ids:
        entity_performance_estimates = {"estimated_precision": None,
                                        "estimated_recall": None,
                                        "estimated_precision_lower_bound": None,
                                        "estimated_precision_upper_bound": None,
                                        "estimated_recall_lower_bound": None,
                                        "estimated_recall_upper_bound": None}

        total_correct = entity_metrics[entity_id]["total_correct"]
        total_incorrect = entity_metrics[entity_id]["total_incorrect"]
        total_manual_docs = entity_metrics[entity_id]["total_manual_docs"]

        if total_correct + total_incorrect > 0:
            precision = total_correct / (total_correct + total_incorrect)
            entity_performance_estimates["estimated_precision"] = precision

        if total_manual_docs > 0:
            recall = total_correct / total_manual_docs
            entity_performance_estimates["estimated_recall"] = recall

        if (total_correct + total_incorrect) >= MIN_LABELLED_PRECISION \
                and total_manual_docs >= MIN_LABELLED_RECALL:
            precision_labels = np.concatenate((np.ones(shape=total_correct), np.zeros(shape=total_incorrect)))

            precision_bounds = bs.bootstrap(precision_labels,
                                            stat_func=get_sample_stat,
                                            num_iterations=NUM_ITERATIONS_BOOTSTRAP)

            recall_labels = np.ones(shape=total_manual_docs) * 0
            recall_labels[:total_correct] = 1

            recall_bounds = bs.bootstrap(recall_labels,
                                         stat_func=get_sample_stat,
                                         num_iterations=NUM_ITERATIONS_BOOTSTRAP)

            entity_performance_estimates["estimated_precision_lower_bound"] = precision_bounds.lower_bound
            entity_performance_estimates["estimated_precision_upper_bound"] = precision_bounds.upper_bound
            entity_performance_estimates["estimated_recall_lower_bound"] = recall_bounds.lower_bound
            entity_performance_estimates["estimated_recall_upper_bound"] = recall_bounds.upper_bound

        performance_estimates[entity_id] = entity_performance_estimates

    return performance_estimates


def get_doc_class_matrix(entity_ids, label_array,
                         label_value=LABEL_VALUE, no_label_value=NO_LABEL_VALUE):
    doc_label_mat = np.ones((len(label_array), len(entity_ids))) * no_label_value
    label_indices = np.where(label_array != ABSTAIN)[0]
    if len(label_indices):
        doc_label_mat[label_indices, label_array[label_indices]] = label_value

    return doc_label_mat


def compute_entity_and_global_metrics(merged_labels_mat,
                                      manual_labels,
                                      entity_ids,
                                      compute_precision_recall):
    """
    Compute metrics at project level (this is called for both adding and deleting rules):

    - total_manual_docs,
    - total_manual_docs_empty,
    - total_correct,
    - total_incorrect,
    - total_not_predicted,
    - total_docs_rules_manual_labelled

    total_predicted and total_predicted_docs are updated separately, as they do not depend on manual labels.
    """
    # create matrix of num_docs x entity_stats (manual)
    entity_manual_labels_mat = get_doc_class_matrix(entity_ids, manual_labels)

    # create matrix of num_docs x entity_stats (predicted)
    entity_merged_labels_mat = get_doc_class_matrix(entity_ids, merged_labels_mat)

    # get rule accuracies
    manual_not_abstain = entity_manual_labels_mat != NO_LABEL_VALUE
    rule_not_abstain = entity_merged_labels_mat != NO_LABEL_VALUE
    docs_rule_labelled = np.logical_and(manual_not_abstain.sum(axis=1), rule_not_abstain.sum(axis=1))
    distribution_predicted = rule_not_abstain[docs_rule_labelled].sum(axis=0)
    distribution_manual = manual_not_abstain[docs_rule_labelled].sum(axis=0)

    total_correct = np.logical_and(entity_manual_labels_mat[docs_rule_labelled],
                                   entity_merged_labels_mat[docs_rule_labelled]).sum(axis=0).astype(int)
    total_incorrect = (distribution_predicted - total_correct)
    total_manual_docs = manual_not_abstain.sum(axis=0)
    total_not_predicted = (total_manual_docs - distribution_manual)

    entity_metrics = dict(zip(entity_ids,
                              [{"total_correct": int(total_correct[i]),
                                "total_incorrect": int(total_incorrect[i]),
                                "total_not_predicted": int(total_not_predicted[i]),
                                "total_manual_docs": int(total_manual_docs[i])} for i in range(len(total_correct))]))

    global_metrics = {"total_manual_docs": int(total_manual_docs.sum()),
                      "total_manual_docs_empty": int((manual_labels == ABSTAIN).sum()),
                      "total_correct": int(total_correct.sum()),
                      "total_incorrect": int(total_incorrect.sum()),
                      "total_not_predicted": int(total_not_predicted.sum()),
                      "total_docs_rules_manual_labelled": int(docs_rule_labelled.sum())}

    # get precision & recall estimates
    if compute_precision_recall:
        performance_estimates = get_entity_performance_estimates(entity_metrics, entity_ids)

        for entity_id in entity_ids:
            entity_metrics[entity_id].update(performance_estimates.get(entity_id))

    return entity_metrics, global_metrics


def get_merged_accuracy_from_mats(merged_labels_mat,
                                  manual_labels,
                                  entity_ids,
                                  compute_precision_recall=False):
    """
    Returns accuracy stats on labelled data.

    This is called when rules get updated or when a rule is deleted. When a rule gets deleted,
    we do not do performance estimate (because this is done later on the diff of the raw counts)
    and we do not update the rule accuracies because they do not change.
    """
    # there are no manual labels
    if len(manual_labels) == 0:
        return {}, {}

    entity_metrics, global_metrics = compute_entity_and_global_metrics(merged_labels_mat,
                                                                       manual_labels,
                                                                       entity_ids,
                                                                       compute_precision_recall)

    return entity_metrics, global_metrics


def get_ground_truth_distribution_stats(entity_ids,
                                        ground_truth_labels_mat,
                                        all_merged_labels_mat):
    """
    The inputs are matrices of dimensions: docs x number_entities
    """
    total_ground_truth = ground_truth_labels_mat.sum(axis=0)
    rule_labelled = (all_merged_labels_mat != NO_LABEL_VALUE).sum(axis=1)
    docs_rule_labelled = np.where(rule_labelled)[0]
    total_labelled = all_merged_labels_mat[docs_rule_labelled, :].sum(axis=0)
    total_correct = np.logical_and(ground_truth_labels_mat, all_merged_labels_mat)[docs_rule_labelled, :].sum(axis=0)

    entity_metrics = dict(zip(entity_ids,
                              [{"ground_truth_precision": total_correct[i] / total_labelled[i]
                              if total_labelled[i] > 0 else 0,
                                "ground_truth_recall": total_correct[i] / total_ground_truth[i]
                                if total_ground_truth[i] > 0 else 0,
                                "total_ground_truth": int(total_ground_truth[i]),
                                "total_ground_truth_correct": int(total_correct[i])} for i in range(len(entity_ids))]))

    return entity_metrics


def get_ground_truth_stats_from_diff_classification(project,
                                                    old_merged_labels,
                                                    new_merged_labels,
                                                    ground_truth_labels,
                                                    updated_entity_metrics):
    entity_ids = [supervised_class.id for supervised_class in project.classes]

    ground_truth_labels_mat = get_doc_class_matrix(entity_ids, ground_truth_labels)
    old_merged_labels_mat = get_doc_class_matrix(entity_ids, old_merged_labels)
    new_merged_labels_mat = get_doc_class_matrix(entity_ids, new_merged_labels)

    new_metric_ground_truth_stats = get_ground_truth_distribution_stats(entity_ids,
                                                                        ground_truth_labels_mat,
                                                                        new_merged_labels_mat)

    old_metric_ground_truth_stats = get_ground_truth_distribution_stats(entity_ids,
                                                                        ground_truth_labels_mat,
                                                                        old_merged_labels_mat)

    merged_dict = {}
    for entity_id in entity_ids:
        model_class = project.classes[entity_id]

        total_correct_old = old_metric_ground_truth_stats[entity_id]["total_ground_truth_correct"]
        total_correct_new = new_metric_ground_truth_stats[entity_id]["total_ground_truth_correct"]
        total_correct_current = getattr(model_class, "total_ground_truth_correct")

        total_predicted = updated_entity_metrics[entity_id]
        total_ground_truth = getattr(model_class, "total_ground_truth")

        updated_ground_truth_correct = (total_correct_current + total_correct_new - total_correct_old)
        updated_ground_truth_precision = updated_ground_truth_correct / total_predicted if total_predicted > 0 else 0
        updated_ground_truth_recall = updated_ground_truth_correct / total_ground_truth if total_ground_truth > 0 else 0

        merged_dict[entity_id] = {"total_ground_truth_correct": updated_ground_truth_correct,
                                  "ground_truth_precision": updated_ground_truth_precision,
                                  "ground_truth_recall": updated_ground_truth_recall}

    return merged_dict


def get_all_stats(L_train, merged_labels_mat, rule_ids, entity_ids):
    num_points, num_rules = L_train.shape
    covered = (L_train != ABSTAIN).sum(axis=0)
    # results_coverage = [cov / float(num_points) for cov in covered]
    results_coverage = covered
    total_covered = (L_train != ABSTAIN).any(axis=1).sum()

    overlaps = (L_train != ABSTAIN).sum(axis=1)
    repeated_overlaps = np.tile((overlaps > 1), (num_rules, 1)).T
    overlaps_absolute_num = np.logical_and((L_train != ABSTAIN), repeated_overlaps).sum(axis=0)
    # results_overlaps = [overlap / float(num_points) for overlap in overlaps_absolute_num]
    results_overlaps = overlaps_absolute_num
    total_overlaps = (overlaps > 1).sum()

    results_conflicts = []
    total_conflicts = np.zeros(num_points)
    for rule_ind in range(num_rules):
        other_rules_ind = [x for x in range(num_rules) if x != rule_ind]
        other_rules = L_train[:, other_rules_ind]

        repeated_rule = np.tile(L_train[:, rule_ind], (num_rules - 1, 1)).T
        x = np.logical_and((repeated_rule != ABSTAIN), (repeated_rule != other_rules))
        y = np.logical_and(x, (other_rules != ABSTAIN))

        conflicts_rule = (y.sum(axis=1) > 0)
        total_conflicts = np.logical_or(total_conflicts, conflicts_rule)
        total_conflicts_rule = conflicts_rule.sum()
        results_conflicts.append(total_conflicts_rule)

    total_conflicts = total_conflicts.sum()

    rule_results = [{"coverage": int(a), "conflicts": int(b), "overlaps": int(c)}
                    for a, b, c in zip(results_coverage, results_conflicts, results_overlaps)]

    rule_results = dict(zip(rule_ids, rule_results))

    total_rule_results = {"coverage": int(total_covered),
                          "overlaps": int(total_overlaps),
                          "conflicts": int(total_conflicts)}

    total_predicted_docs = (merged_labels_mat != ABSTAIN).sum()
    entity_distribution = Counter(merged_labels_mat[merged_labels_mat != ABSTAIN])

    total_merged = {"global_metrics": {"total_predicted_docs": total_predicted_docs},
                    "entity_metrics": {entity_id: entity_distribution.get(entity_id, 0) for entity_id in entity_ids}}
    return rule_results, total_rule_results, total_merged


def get_rule_stats_from_diff(project, old_rule_stats, new_rule_stats):
    """
    Return rule stats after a change has happened (a new rule has been created or rule deleted).
    """
    rule_stats = {}
    for rule in project.rules:
        rule_stats[rule.id] = {}
        if rule.id in old_rule_stats:
            if rule.id in new_rule_stats:
                # a rule has changed (else it has been deleted so no need to update)
                rule_stats[rule.id]["coverage"] = (rule.coverage
                                                   + new_rule_stats[rule.id]["coverage"]
                                                   - old_rule_stats[rule.id]["coverage"])
                rule_stats[rule.id]["conflicts"] = (rule.conflicts
                                                    + new_rule_stats[rule.id]["conflicts"]
                                                    - old_rule_stats[rule.id]["conflicts"])
                rule_stats[rule.id]["overlaps"] = (rule.overlaps
                                                   + new_rule_stats[rule.id]["overlaps"]
                                                   - old_rule_stats[rule.id]["overlaps"])
        else:
            # a rule has been created
            rule_stats[rule.id]["coverage"] = new_rule_stats[rule.id]["coverage"]
            rule_stats[rule.id]["conflicts"] = new_rule_stats[rule.id]["conflicts"]
            rule_stats[rule.id]["overlaps"] = new_rule_stats[rule.id]["overlaps"]

    return rule_stats


def get_total_rule_stats_from_diff(project, new_total_rule_stats, old_total_rule_stats):
    total_rules_coverage = (project.total_rules_coverage or 0) \
                           + int(new_total_rule_stats["coverage"] - old_total_rule_stats["coverage"])

    total_rules_conflicts = (project.total_rules_conflicts or 0) \
                            + int(new_total_rule_stats["conflicts"] - old_total_rule_stats["conflicts"])

    total_rules_overlaps = (project.total_rules_overlaps or 0) \
                           + int(new_total_rule_stats["overlaps"] - old_total_rule_stats["overlaps"])
    return {"coverage": total_rules_coverage, "conflicts": total_rules_conflicts,
            "overlaps": total_rules_overlaps}


def get_total_merged_stats_from_diff(project, new_total_merged_stats, old_total_merged_stats):
    """
    Get the statistics of the merged labels, that are independent of manual labels.
    """
    total_predicted_docs = (project.total_predicted_docs or 0) \
                           + int(new_total_merged_stats["global_metrics"]["total_predicted_docs"]
                                 - old_total_merged_stats["global_metrics"]["total_predicted_docs"])

    global_metrics = {"total_predicted_docs": total_predicted_docs}

    entity_metrics = {}
    for supervised_class in project.classes:
        entity_metrics[supervised_class.id] = (supervised_class.total_predicted
                                               + int(new_total_merged_stats["entity_metrics"][supervised_class.id])
                                               - int(old_total_merged_stats["entity_metrics"][supervised_class.id]))

    return {"global_metrics": global_metrics, "entity_metrics": entity_metrics}


def get_rule_stats_from_diff_classification(project,
                                            new_rules,
                                            new_merged,
                                            new_rule_ids,
                                            old_rules,
                                            old_merged,
                                            old_rule_ids):
    """
    Returns difference in rule and merged metrics between two set of rules and merged labels.
    """
    entity_ids = [supervised_class.id for supervised_class in project.classes]
    new_rule_stats, new_total_rule_stats, new_total_merged_stats = get_all_stats(new_rules,
                                                                                 new_merged,
                                                                                 new_rule_ids,
                                                                                 entity_ids)
    old_rule_stats, old_total_rule_stats, old_total_merged_stats = get_all_stats(old_rules,
                                                                                 old_merged,
                                                                                 old_rule_ids,
                                                                                 entity_ids)

    rule_stats = get_rule_stats_from_diff(project, old_rule_stats, new_rule_stats)
    total_rule_stats = get_total_rule_stats_from_diff(project, new_total_rule_stats, old_total_rule_stats)
    total_merged_stats = get_total_merged_stats_from_diff(project, new_total_merged_stats, old_total_merged_stats)

    rule_stats["total_rules"] = total_rule_stats
    rule_stats["total_merged"] = total_merged_stats

    return rule_stats


def get_merged_accuracy_stats_from_diff_classification(project,
                                                       new_merged,
                                                       old_merged,
                                                       manual_labels):
    """
    Return merged accuracy.

    After a rule is deleted, the merged result can change.
    """
    entity_ids = [supervised_class.id for supervised_class in project.classes]

    new_entity_metrics, new_global_metrics = get_merged_accuracy_from_mats(new_merged,
                                                                           manual_labels,
                                                                           entity_ids)

    old_entity_metrics, old_global_metrics = get_merged_accuracy_from_mats(old_merged,
                                                                           manual_labels,
                                                                           entity_ids)

    entity_metrics = {}
    for entity_id in entity_ids:
        model_class = project.classes[entity_id]

        entity_metric_merged_dict = {}
        for metric_name, metric_val in new_entity_metrics[entity_id].items():
            entity_metric_merged_dict[metric_name] = (
                    getattr(model_class, metric_name)
                    + new_entity_metrics[entity_id][metric_name]
                    - old_entity_metrics[entity_id][metric_name])

        entity_metrics[entity_id] = entity_metric_merged_dict

    global_metrics = {}
    for metric_name, metric_val in new_global_metrics.items():
        global_metrics[metric_name] = (getattr(project, metric_name)
                                       + new_global_metrics[metric_name]
                                       - old_global_metrics[metric_name])

    performance_estimates = get_entity_performance_estimates(entity_metrics, entity_ids)

    for entity_id in entity_ids:
        entity_metrics[entity_id].update(performance_estimates.get(entity_id))

    accuracy_stats = {"merged": entity_metrics, "merged_all": global_metrics}

    return accuracy_stats
