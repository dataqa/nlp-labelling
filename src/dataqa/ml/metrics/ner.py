import copy
from collections import Counter
from itertools import groupby

import numpy as np
from bootstrapped import bootstrap as bs
from intervaltree import IntervalTree

from dataqa.constants import (MIN_LABELLED_PRECISION,
                              MIN_LABELLED_RECALL,
                              NUM_ITERATIONS_BOOTSTRAP)


def get_rule_accuracy_stats_ner(entity_ids,
                                rule_ids,
                                rule_spans,
                                merged_label_spans,
                                manual_spans):
    """
    Accuracy of the entity spans.

    - Each rule can only impact a single entity_id.

    Note:
        - manual_spans[doc_id] can be either None (document has not been labelled), or [] (it has been labelled
        but there are no spans or [{span}] if there are spans

    Returns:
        - a dictionary with keys: rule_id and "merged"
            - rule_id: dictionary of {total_correct, total_labelled_predicted}
            - "merged": nested dictionary of {entity_id, {total_correct, total_incorrect, total_not_predicted,
              total_predicted, total_manual_spans, total_manual_docs}}
            - "merged_all": dictionary of global stats across all entities
    """
    # stats only holds the stats for docs that have been manually labelled
    rule_stats_dict = dict((rule_id, Counter({"total_correct": 0,
                                              "total_labelled_predicted": 0})) for rule_id in rule_ids)
    initial_entity_stats = {"total_correct": 0,
                            "total_incorrect": 0,
                            "total_not_predicted": 0,
                            "total_predicted": 0,
                            "total_manual_docs": 0,
                            "total_manual_spans": 0}

    predicted_stats_dict = dict((entity_id, Counter(initial_entity_stats)) for entity_id in entity_ids)
    predicted_stats_all_dict = Counter(initial_entity_stats)
    predicted_stats_all_dict.update({"total_manual_docs_empty": 0,
                                     "total_docs_rules_manual_labelled": 0})

    num_docs = len(rule_spans)
    all_doc_entity_stats = np.zeros((num_docs, len(entity_ids), 3))

    for doc_id in range(num_docs):
        if manual_spans[doc_id] is not None:
            # this document has been labelled manually
            t_manual, manual_metrics = get_manual_span_trees(entity_ids, manual_spans[doc_id])

            update_manual_metrics_counters(predicted_stats_dict,
                                           predicted_stats_all_dict,
                                           manual_metrics,
                                           manual_spans[doc_id])

            update_rule_metrics_counter(rule_stats_dict, rule_spans[doc_id], entity_ids, rule_ids, t_manual)

            update_merged_metrics_counters(predicted_stats_dict,
                                           predicted_stats_all_dict,
                                           all_doc_entity_stats,
                                           doc_id,
                                           entity_ids,
                                           t_manual,
                                           merged_label_spans[doc_id],
                                           manual_metrics)
        else:
            for span in merged_label_spans[doc_id]:
                predicted_stats_dict[span["entity_id"]]["total_predicted"] += 1
                predicted_stats_all_dict["total_predicted"] += 1

    update_entity_precision_recall(predicted_stats_dict, all_doc_entity_stats)

    all_stats = rule_stats_dict
    all_stats["merged"] = predicted_stats_dict
    all_stats["merged_all"] = predicted_stats_all_dict

    return all_stats


def update_entity_precision_recall(predicted_stats_dict, all_doc_entity_stats):
    bounds = get_confidence_bound_per_entity(all_doc_entity_stats)
    for entity_id in predicted_stats_dict:
        total_predicted_manual = (predicted_stats_dict[entity_id]["total_correct"]
                                  + predicted_stats_dict[entity_id]["total_incorrect"])
        if total_predicted_manual > 0:
            predicted_stats_dict[entity_id]["estimated_precision"] = (
                    predicted_stats_dict[entity_id]["total_correct"] / total_predicted_manual)
            if entity_id in bounds:
                predicted_stats_dict[entity_id]["estimated_precision_lower_bound"] = (
                    bounds[entity_id]["precision"].lower_bound)
                predicted_stats_dict[entity_id]["estimated_precision_upper_bound"] = (
                    bounds[entity_id]["precision"].upper_bound)
                predicted_stats_dict[entity_id]["estimated_recall_lower_bound"] = (
                    bounds[entity_id]["recall"].lower_bound)
                predicted_stats_dict[entity_id]["estimated_recall_upper_bound"] = (
                    bounds[entity_id]["recall"].upper_bound)

        if predicted_stats_dict[entity_id]["total_manual"] > 0:
            predicted_stats_dict[entity_id]["estimated_recall"] = (
                    predicted_stats_dict[entity_id]["total_correct"] / predicted_stats_dict[entity_id]["total_manual"])


def get_precision_in_sample(entity_doc_mat):
    if len(entity_doc_mat.shape) == 2:
        total_correct = entity_doc_mat[:, 1].sum()
        total_incorrect = entity_doc_mat[:, 2].sum()
        total_precision = [(total_correct) / (total_correct + total_incorrect)]
    else:
        total_correct = entity_doc_mat[:, :, 1].sum(axis=1)
        total_incorrect = entity_doc_mat[:, :, 2].sum(axis=1)
        total_precision = total_correct / (total_correct + total_incorrect)
    return total_precision


def get_recall_in_sample(entity_doc_mat):
    if len(entity_doc_mat.shape) == 2:
        total_correct = entity_doc_mat[:, 1].sum()
        total_positives = entity_doc_mat[:, 0].sum()
        total_recall = [total_correct / total_positives]
    else:
        total_correct = entity_doc_mat[:, :, 1].sum(axis=1)
        total_positives = entity_doc_mat[:, :, 0].sum(axis=1)
        total_recall = total_correct / total_positives
    return total_recall


def get_confidence_bound_per_entity(all_doc_entity_stats):
    """
    Get confidence bounds for each entity class.

    all_doc_entity_stats have all stats for all docs and entities, dimensions are num_docs x num_entites x 3.
    Columns are total_manual, total_correct, total_incorrect.

    We only provide confidence bounds if the total number of predicted and labelled spans is above MIN_LABELLED_PRECISION
    and the total number of manually labelled spans is above MIN_LABELLED_RECALL.
    """
    bounds = {}
    for entity_id in range(all_doc_entity_stats.shape[1]):
        docs_with_entities = all_doc_entity_stats[:, entity_id, :]
        total_manual_predicted = (docs_with_entities[:, 1] + docs_with_entities[:, 2]).sum()
        total_manual = (docs_with_entities[:, 0]).sum()
        docs_with_entities_mask = sorted(set(np.nonzero(docs_with_entities.sum(axis=1))[0]))
        if (len(docs_with_entities_mask)
                and total_manual_predicted >= MIN_LABELLED_PRECISION
                and total_manual >= MIN_LABELLED_RECALL):
            docs_with_entities = docs_with_entities[docs_with_entities_mask]
            precision_bounds = bs.bootstrap(docs_with_entities,
                                            stat_func=get_precision_in_sample,
                                            num_iterations=NUM_ITERATIONS_BOOTSTRAP)
            recall_bounds = bs.bootstrap(docs_with_entities,
                                         stat_func=get_recall_in_sample,
                                         num_iterations=NUM_ITERATIONS_BOOTSTRAP)
            bounds[entity_id] = {"precision": precision_bounds,
                                 "recall": recall_bounds}
    return bounds


def update_merged_metrics_counters(predicted_stats_dict,
                                   predicted_stats_all_dict,
                                   all_doc_entity_stats,
                                   doc_id,
                                   entity_ids,
                                   t_manual,
                                   doc_merged_labels,
                                   manual_metrics):
    predicted_label_stats = get_span_metrics(entity_ids,
                                             t_manual,
                                             doc_merged_labels)

    all_doc_entity_stats[doc_id] = np.array([[manual_metrics[entity_id]["total_manual"],
                                              predicted_label_stats[entity_id]["total_correct"],
                                              predicted_label_stats[entity_id]["total_incorrect"]]
                                             for entity_id in entity_ids])

    if len(doc_merged_labels) > 0:
        predicted_stats_all_dict["total_docs_rules_manual_labelled"] += 1

    # update all entity stats
    for entity_id, entity_stats in predicted_label_stats.items():
        predicted_stats_dict[entity_id].update(entity_stats)
        predicted_stats_all_dict.update(entity_stats)


def update_rule_metrics_counter(rule_stats_dict, doc_rule_spans, entity_ids, rule_ids, t_manual):
    for rule_ind, spans in enumerate(doc_rule_spans):
        # each rule is for a unique entity_id
        # rule_spans[doc_id] can be []
        if len(spans):
            rule_id = rule_ids[rule_ind]
            rule_stats = get_span_metrics(entity_ids, t_manual, spans)
            rule_entity_id = spans[0]['entity_id']
            rule_stats_dict[rule_id].update({"total_correct": rule_stats[rule_entity_id]['total_correct'],
                                             "total_labelled_predicted": rule_stats[rule_entity_id]['total_predicted']})


def update_manual_metrics_counters(predicted_stats_dict, predicted_stats_all_dict, manual_metrics, doc_manual_spans):
    predicted_stats_all_dict["total_manual_docs"] += 1
    if len(doc_manual_spans) == 0:
        predicted_stats_all_dict["total_manual_docs_empty"] += 1

    for entity_id in predicted_stats_dict:
        predicted_stats_dict[entity_id].update(manual_metrics[entity_id])
        predicted_stats_all_dict.update(manual_metrics[entity_id])
        if manual_metrics[entity_id]["total_manual_spans"] > 0:
            predicted_stats_dict[entity_id]["total_manual_docs"] += 1


def get_manual_span_trees(entity_ids, manual_spans):
    t_manual = IntervalTree()
    manual_metrics = dict((entity_id, Counter({"total_manual_spans": 0})) for entity_id in entity_ids)
    for span in manual_spans:
        t_manual[span["start"]:span["end"] + 1] = {"text": span["text"], "entity_id": span["entity_id"]}
        entity_id = span["entity_id"]
        manual_metrics[entity_id]["total_manual_spans"] += 1

    return t_manual, manual_metrics


def get_span_metrics(entity_ids, t_manual, spans):
    """
    Return the metrics across all spans for each entity_id.

    Input:
    - t_manual: all manual spans

    Algorithm:
    - for each entity_id:
        - for each predicted span of that entity:
            - if no overlap with any manual span (of any entity): incorrect
            - if overlap with any manual span, but only from other class: incorrect (for predicted class)
            - if overlap with any manual span, at least one from same class: correct
            - count the number of manual spans of that class with no overlap with any predicted span of any entity: not_predicted
    """
    t_manual_copy = copy.deepcopy(t_manual)
    stats = dict((entity_id, Counter({"total_correct": 0,
                                      "total_incorrect": 0,
                                      "total_not_predicted": 0,
                                      "total_predicted": 0})) for entity_id in entity_ids)

    for entity_id, span_group in groupby(spans, key=lambda x: x['entity_id']):
        incorrect_spans = 0
        correct_spans = 0
        total_predicted = 0

        for span in span_group:
            total_predicted += 1
            manual_span_overlaps = t_manual[span["start"]:span["end"] + 1]

            if not manual_span_overlaps:
                # no overlap of predicted span with any manual spans
                incorrect_spans += 1
            else:
                t_manual_copy.remove_overlap(span["start"], span["end"] + 1)
                if any([x.data["entity_id"] == entity_id for x in manual_span_overlaps]):
                    correct_spans += 1

        stats[entity_id].update({"total_correct": correct_spans,
                                 "total_incorrect": incorrect_spans,
                                 "total_predicted": total_predicted})

    for not_predicted in t_manual_copy:
        stats[not_predicted.data["entity_id"]]["total_not_predicted"] += 1

    return stats


def get_rule_entity_stats(rule_ids, all_rule_spans, predicted_label_spans):
    """
    Stats for the entity spans, except the accuracy.
    """
    stats = {}

    # merged spans
    stats["total_merged"] = {"coverage": sum([1 for spans in predicted_label_spans if len(spans)]),
                             "coverage_spans": sum([len(spans) for spans in predicted_label_spans])}

    rule_stats, total_rule_stats = get_spans_stats(all_rule_spans, rule_ids)

    stats.update(rule_stats)

    # total rules
    stats["total_rules"] = total_rule_stats
    return stats


def get_spans_stats(all_rule_spans, rule_ids):
    num_docs = len(all_rule_spans)
    rule_mat = np.zeros((num_docs, len(rule_ids)))

    for doc_id, rules in enumerate(all_rule_spans):
        rule_mat[doc_id] = [len(spans) > 0 for spans in rules]

    rule_stats = {}

    for rule_ind, rule_id in enumerate(rule_ids):
        # we mask the rows where there are no spans for rule_ind
        overlaps_rule = (rule_mat.T * (rule_mat[:, rule_ind] > 0).astype(int)).T
        overlaps_rule = (overlaps_rule.sum(axis=1) > 1)

        rule_stats[rule_id] = {"coverage": rule_mat[:, rule_ind].sum(),
                               "overlaps": overlaps_rule.sum()}

    total_rule_stats = {"coverage": (rule_mat.sum(axis=1) > 0).sum(),
                        "overlaps": (rule_mat.sum(axis=1) > 1).sum()}
    return rule_stats, total_rule_stats
