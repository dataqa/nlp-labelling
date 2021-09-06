from dataqa.ml.metrics.ner import (get_manual_span_trees,
                                   get_rule_accuracy_stats_ner,
                                   get_span_metrics)


def assert_other_keys_are_zero(data, keys):
    assert all([data[k] == 0 for k in data if k not in keys])


def test_span_metrics__single_correct_overlap():
    manual_spans = [{"start": 10, "end": 14, "text": "", "entity_id": 1},
                    {"start": 15, "end": 17, "text": "", "entity_id": 1}]
    entity_ids = [1, 2]
    t_manual_all, _ = get_manual_span_trees(entity_ids, manual_spans)

    predicted_spans = [{"start": 9, "end": 11, "text": "", "entity_id": 1}]
    results = get_span_metrics(entity_ids, t_manual_all, predicted_spans)
    assert len(results.keys()) == 2
    assert results[1]["total_correct"] == 1
    assert results[1]["total_predicted"] == 1
    assert results[1]["total_not_predicted"] == 1
    assert_other_keys_are_zero(results[1], ["total_correct", "total_predicted", "total_not_predicted"])

    predicted_spans = [{"start": 15, "end": 16, "text": "", "entity_id": 1}]
    results = get_span_metrics(entity_ids, t_manual_all, predicted_spans)
    assert len(results.keys()) == 2
    assert results[1]["total_correct"] == 1
    assert results[1]["total_predicted"] == 1
    assert results[1]["total_not_predicted"] == 1
    assert_other_keys_are_zero(results[1], ["total_correct", "total_predicted", "total_not_predicted"])


def test_span_metrics__empty_predicted():
    manual_spans = [{"start": 10, "end": 14, "text": "", "entity_id": 1},
                    {"start": 15, "end": 17, "text": "", "entity_id": 1}]
    entity_ids = [1, 2]
    t_manual_all, _ = get_manual_span_trees(entity_ids, manual_spans)

    predicted_spans = []
    results = get_span_metrics(entity_ids, t_manual_all, predicted_spans)
    assert len(results.keys()) == 2
    assert results[1]["total_not_predicted"] == 2
    assert_other_keys_are_zero(results[1], ["total_not_predicted"])
    assert_other_keys_are_zero(results[2], [])


def test_span_metrics__empty_manual():
    manual_spans = []
    entity_ids = [1, 2]
    t_manual_all, _ = get_manual_span_trees(entity_ids, manual_spans)

    predicted_spans = [{"start": 14, "end": 16, "text": "", "entity_id": 1}]
    results = get_span_metrics(entity_ids, t_manual_all, predicted_spans)
    assert len(results.keys()) == 2
    assert results[1]["total_incorrect"] == 1
    assert results[1]["total_predicted"] == 1
    assert_other_keys_are_zero(results[1], ["total_incorrect", "total_predicted"])
    assert_other_keys_are_zero(results[2], [])


def test_span_metrics__multiple_correct_overlap():
    manual_spans = [{"start": 10, "end": 14, "text": "", "entity_id": 1},
                    {"start": 15, "end": 17, "text": "", "entity_id": 1}]
    entity_ids = [1, 2]
    t_manual_all, manual_metrics = get_manual_span_trees(entity_ids, manual_spans)
    assert len(manual_metrics.keys()) == 2
    assert manual_metrics[1]["total_manual_spans"] == 2

    predicted_spans = [{"start": 14, "end": 16, "text": "", "entity_id": 1}]
    results = get_span_metrics(entity_ids, t_manual_all, predicted_spans)
    assert len(results.keys()) == 2
    assert results[1]["total_correct"] == 1
    assert results[1]["total_predicted"] == 1
    assert_other_keys_are_zero(results[1], ["total_correct", "total_predicted"])


def test_span_metrics__wrong_class_overlap():
    manual_spans = [{"start": 10, "end": 15, "text": "", "entity_id": 1}]
    entity_ids = [1, 2]
    t_manual_all, _ = get_manual_span_trees(entity_ids, manual_spans)

    predicted_spans = [{"start": 9, "end": 11, "text": "", "entity_id": 2}]
    results = get_span_metrics(entity_ids, t_manual_all, predicted_spans)
    assert len(results.keys()) == 2
    assert results[2]["total_predicted"] == 1
    assert_other_keys_are_zero(results[2], ["total_predicted"])


def test_span_metrics__multiple_mixed_overlap():
    manual_spans = [{"start": 10, "end": 14, "text": "", "entity_id": 3},
                    {"start": 15, "end": 17, "text": "", "entity_id": 2}]
    entity_ids = [1, 2, 3]
    t_manual_all, _ = get_manual_span_trees(entity_ids, manual_spans)

    predicted_spans = [{"start": 14, "end": 15, "text": "", "entity_id": 2}]
    results = get_span_metrics(entity_ids, t_manual_all, predicted_spans)
    assert len(results.keys()) == 3
    assert results[2]["total_correct"] == 1
    assert results[2]["total_predicted"] == 1
    assert_other_keys_are_zero(results[2], ["total_correct", "total_predicted"])

    predicted_spans = [{"start": 15, "end": 16, "text": "", "entity_id": 3}]
    results = get_span_metrics(entity_ids, t_manual_all, predicted_spans)
    assert len(results.keys()) == 3
    assert results[3]["total_predicted"] == 1
    assert results[3]["total_not_predicted"] == 1
    assert_other_keys_are_zero(results[3], ["total_predicted", "total_not_predicted"])


def test_get_rule_accuracy_stats_ner__empty_manual_empty_rules():
    entity_ids = [1]
    manual_spans = [None, None]

    rule_ids = [1, 2]
    rule_spans = [[[], []], [[], []]]
    predicted_label_spans = [[], []]

    stats = get_rule_accuracy_stats_ner(entity_ids,
                                        rule_ids,
                                        rule_spans,
                                        predicted_label_spans,
                                        manual_spans)

    assert set(stats.keys()) == set(rule_ids + ["merged", "merged_all"])
    assert set(stats["merged"].keys()) == set(entity_ids)
    assert_other_keys_are_zero(stats["merged"][1], [])


def test_get_rule_accuracy_stats_ner__empty_manual_some_rules():
    entity_ids = [1]
    manual_spans = [None, None]

    rule_ids = [1, 2]
    rule_spans = [[[{"start": 1, "end": 4, "text": "", "entity_id": 1}], []],
                  [[], [{"start": 5, "end": 7, "text": "", "entity_id": 1}]]]
    predicted_label_spans = [[{"start": 1, "end": 4, "text": "", "entity_id": 1}],
                             [{"start": 5, "end": 7, "text": "", "entity_id": 1}]]

    stats = get_rule_accuracy_stats_ner(entity_ids,
                                        rule_ids,
                                        rule_spans,
                                        predicted_label_spans,
                                        manual_spans)

    assert set(stats.keys()) == set(rule_ids + ["merged", "merged_all"])
    assert set(stats["merged"].keys()) == set(entity_ids)
    assert_other_keys_are_zero(stats[1], [])
    assert_other_keys_are_zero(stats[2], [])
    assert stats["merged"][1]["total_predicted"] == 2
    assert_other_keys_are_zero(stats["merged"][1], ["total_predicted"])


def test_get_rule_accuracy_stats_ner__manual_some_rules():
    """
    - 2 rules, 3 documents, 2 entities
    """
    entity_ids = [1, 2]
    manual_spans = [[{"start": 3, "end": 7, "text": "", "entity_id": 2}],
                    [{"start": 5, "end": 7, "text": "", "entity_id": 1}],
                    []]

    rule_ids = [1, 2]
    rule_spans = [[[{"start": 1, "end": 5, "text": "", "entity_id": 1}], []],
                  [[], [{"start": 5, "end": 7, "text": "", "entity_id": 1}]],
                  [[], [{"start": 1, "end": 3, "text": "", "entity_id": 1}]]]
    predicted_label_spans = [[{"start": 1, "end": 5, "text": "", "entity_id": 1}],
                             [{"start": 5, "end": 7, "text": "", "entity_id": 1}],
                             [{"start": 1, "end": 3, "text": "", "entity_id": 1}]]

    stats = get_rule_accuracy_stats_ner(entity_ids,
                                        rule_ids,
                                        rule_spans,
                                        predicted_label_spans,
                                        manual_spans)

    assert set(stats.keys()) == set(rule_ids + ["merged", "merged_all"])
    assert set(stats["merged"].keys()) == set(entity_ids)
    # rule stats
    assert stats[1]["total_correct"] == 0
    assert stats[1]["total_labelled_predicted"] == 1
    assert stats[2]["total_correct"] == 1
    assert stats[2]["total_labelled_predicted"] == 2
    # merged-entity stats
    assert stats["merged"][1]["total_predicted"] == 3
    assert stats["merged"][1]["total_manual_spans"] == 1
    assert stats["merged"][1]["total_manual_docs"] == 1
    assert stats["merged"][1]["total_correct"] == 1
    assert stats["merged"][1]["total_incorrect"] == 1
    assert stats["merged"][1]["total_not_predicted"] == 0

    assert stats["merged"][2]["total_manual_spans"] == 1
    assert stats["merged"][2]["total_manual_docs"] == 1
    assert_other_keys_are_zero(stats["merged"][2], ["total_manual_spans", "total_manual_docs"])
    # project-wide stats
    assert stats["merged_all"]["total_manual_spans"] == 2
    assert stats["merged_all"]["total_manual_docs"] == 3
    assert stats["merged_all"]["total_manual_docs_empty"] == 1
    assert stats["merged_all"]["total_docs_rules_manual_labelled"] == 3
