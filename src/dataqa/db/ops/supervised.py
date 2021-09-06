import dataqa.db.models as models
from dataqa.constants import (PROJECT_TYPE_NER,
                              PROJECT_TYPE_CLASSIFICATION)
from dataqa.db.ops.common import add_project_to_db


def get_rule_by_create_rule_id(session, create_rule_id):
    rule = session.query(models.Rule).filter_by(create_rule_id=create_rule_id).first()
    return rule


def delete_rule(project, rule_index_to_delete):
    del project.rules[rule_index_to_delete]


def add_supervised_project_to_db(session,
                                 project_name,
                                 project_type,
                                 filename,
                                 upload_id,
                                 index_name,
                                 filepath,
                                 spacy_binary_filepath,
                                 total_documents,
                                 has_ground_truth_labels):
    """
    Create a new project with empty attributes (class names)
    """
    supervised_params = {"name": project_name,
                         "type": project_type,
                         "upload_id": upload_id,
                         "total_documents": total_documents,
                         "data_filepath": filepath,
                         "spacy_binary_filepath": spacy_binary_filepath,
                         "index_name": index_name,
                         "filename": filename}

    if project_type == PROJECT_TYPE_NER:
        project = models.NERProject(**supervised_params)
    elif project_type == PROJECT_TYPE_CLASSIFICATION:
        project = models.ClassificationProject(**supervised_params,
                                               has_ground_truth_labels=has_ground_truth_labels)
    else:
        raise Exception(f"Non-recognised project type: {project_type}")

    project_id = add_project_to_db(session, project)
    return project_id


def add_class_names(project, class_names):
    """
    Add class names to existing project

    :return:
    """
    all_class_names = []
    for model_class in class_names:
        all_class_names.append(models.SupervisedClass(name=model_class["name"],
                                                      project_id=project.id,
                                                      id=model_class["id"],
                                                      colour=model_class["colour"]))
    project.classes = all_class_names


def add_rule(project,
             rule_type,
             rule_name,
             params,
             class_id,
             class_name,
             create_rule_id):
    """
    Add a new rule linked to a project

    """
    if project.type == PROJECT_TYPE_CLASSIFICATION:
        rule = models.ClassificationRule(rule_type=rule_type,
                                         name=rule_name,
                                         params=params,
                                         class_id=class_id,
                                         class_name=class_name,
                                         create_rule_id=create_rule_id,
                                         project_id=project.id)
    elif project.type == PROJECT_TYPE_NER:
        rule = models.NERRule(rule_type=rule_type,
                              name=rule_name,
                              params=params,
                              class_id=class_id,
                              class_name=class_name,
                              create_rule_id=create_rule_id,
                              project_id=project.id)
    else:
        raise Exception(f"Non-recognised project type {project.type}.")

    project.rules.append(rule)

    return project, rule


def add_rules(project, rules):
    """
    Add a new rule linked to a project

    """
    initial_number_rules = len(project.rules)

    all_rules = []
    for rule in rules:
        if project.type == PROJECT_TYPE_CLASSIFICATION:
            all_rules.append(models.ClassificationRule(rule_type=rule["rule_type"],
                                                       name=rule["name"],
                                                       params=rule["params"],
                                                       class_id=rule["class_id"]))
        elif project.type == PROJECT_TYPE_NER:
            all_rules.append(models.NERRule(rule_type=rule["rule_type"],
                                            name=rule["name"],
                                            params=rule["params"],
                                            class_id=rule["class_id"]))
        else:
            raise Exception(f"Non-recognised project type {project.type}.")

    project.rules.extend(all_rules)

    final_number_rules = len(project.rules)
    print(f"Project had {initial_number_rules} initially and now has {final_number_rules}.")
    return project, all_rules


def update_rule_stats_classification(project, stats):
    project.total_rules_coverage = int(stats["total_rules"]["coverage"])
    project.total_rules_conflicts = int(stats["total_rules"]["conflicts"])
    project.total_rules_overlaps = int(stats["total_rules"]["overlaps"])

    project.total_predicted_docs = int(stats["total_merged"]["global_metrics"]["total_predicted_docs"])

    for rule in project.rules:
        rule.coverage = stats[rule.id]["coverage"]
        rule.conflicts = stats[rule.id]["conflicts"]
        rule.overlaps = stats[rule.id]["overlaps"]

    for supervised_class in project.classes:
        supervised_class.total_predicted = int(stats["total_merged"]["entity_metrics"][supervised_class.id])


def cast_nonable_to_int(value):
    if value is None:
        return None
    return int(value)


def update_accuracy_stats_classification(project, stats, update_id=None, update_rules=False):
    """
    Update the accuracy of the merged labels, and of the rules if updated_rules is True.

    When a rule gets deleted, we do not need to recompute the accuracy of all the rules,
    only of the merged labels.
    """
    if update_id:
        project.update_id = update_id

    if update_rules:
        for rule in project.rules:
            rule.accuracy = stats[rule.id]["accuracy"]

    for entity_id, entity_stats in stats["merged"].items():
        model_class = project.classes[entity_id]
        for metric_name, metric_val in entity_stats.items():
            setattr(model_class, metric_name, metric_val)

    for metric_name, metric_val in stats["merged_all"].items():
        setattr(project, metric_name, metric_val)

    if project.has_ground_truth_labels:
        for entity_id, entity_stats in stats["ground_truth"].items():
            model_class = project.classes[entity_id]
            for metric_name, metric_val in entity_stats.items():
                setattr(model_class, metric_name, metric_val)


def update_rules_accuracy_project_ner(project, stats, update_id=None):
    if update_id:
        project.update_id = update_id

    for rule in project.rules:
        rule.accuracy = f'{stats[rule.id]["total_correct"]}/{stats[rule.id]["total_labelled_predicted"]}'
        rule.missed = stats["merged"][rule.class_id]["total_manual_spans"] - stats[rule.id]["total_correct"]

    for entity_id, entity_stats in stats["merged"].items():
        model_class = project.classes[entity_id]
        for metric_name, metric_val in entity_stats.items():
            setattr(model_class, metric_name, metric_val)

    for metric_name, metric_val in stats["merged_all"].items():
        setattr(project, metric_name, metric_val)


def update_rules_project_ner(project, stats):
    """
    Only difference is there are no conflicts.

    :param project:
    :param stats:
    :return:
    """
    project.total_rules_coverage = int(stats["total_rules"]["coverage"])
    project.total_rules_overlaps = int(stats["total_rules"]["overlaps"])

    project.total_predicted_docs = int(stats["total_merged"]["coverage"])
    project.total_predicted_spans = int(stats["total_merged"]["coverage_spans"])

    for rule in project.rules:
        rule.coverage = int(stats[rule.id]["coverage"])
        rule.overlaps = int(stats[rule.id]["overlaps"])
