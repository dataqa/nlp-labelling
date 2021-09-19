from sqlalchemy import Column, Float, Integer, String, Boolean, Text
from sqlalchemy import ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()


class Project(Base):
    __tablename__ = 'project'

    id = Column(Integer, primary_key=True)
    upload_id = Column(String)
    update_id = Column(String)
    type = Column(String)
    name = Column(String)
    total_documents = Column(Integer)
    index_name = Column(String)
    filename = Column(String)

    __mapper_args__ = {
        'polymorphic_identity': 'project',
        'polymorphic_on': type,
        'with_polymorphic': '*'
    }


class EntityDisambiguationProject(Project):
    __tablename__ = 'entity_disambiguation_project'

    id = Column(Integer, ForeignKey('project.id'), primary_key=True)

    has_normalised_entities = Column(Boolean)

    kb_index_name = Column(String)
    kb_filename = Column(String)
    kb_upload_id = Column(String)

    total_bases = Column(Integer)
    total_mentions = Column(Integer)  # use this if mentions are not entities
    total_entities = Column(Integer)
    total_matched_entities = Column(Integer)

    kbs = relationship("EntityDisambiguationKB",
                       order_by="EntityDisambiguationKB.id",
                       cascade="all, delete, delete-orphan")

    __mapper_args__ = {
        'polymorphic_identity': 'entity_disambiguation'
    }


class EntityDisambiguationMapping(Base):
    __tablename__ = 'entity_disambiguation_mapping'

    id = Column(Integer, primary_key=True)  # entity_id
    project_id = Column(Integer, ForeignKey('project.id'), primary_key=True)

    # either one of these two will be populated
    entity_text = Column(String)
    normalised_text = Column(String)

    number_docs = Column(Integer)
    kb_id = Column(Integer)
    kb_name = Column(String)
    session_id = Column(String)


class EntityDisambiguationKB(Base):
    __tablename__ = 'entity_disambiguation_kb'

    id = Column(Integer, primary_key=True)  # kb_id
    project_id = Column(Integer, ForeignKey('project.id'), primary_key=True)

    name = Column(String)
    colour = Column(String)


class SupervisedProject(Project):
    __tablename__ = 'supervised_project'

    id = Column(Integer, ForeignKey('project.id'), primary_key=True)
    import_id = Column(String)
    supervised_type = Column(String)

    data_filepath = Column(String)  # for sentiment and other file attributes
    spacy_binary_filepath = Column(String)

    # accuracy of merged label across all document classes (classification) or span classes (NER)
    total_manual_docs = Column(Integer, default=0)  # total manually labelled docs (includes next)
    # needed for label table only
    total_manual_docs_empty = Column(Integer,
                                     default=0)  # total number of manually labelled docs with no spans or label
    total_correct = Column(Integer, default=0)  # total correct out of predicted
    total_incorrect = Column(Integer, default=0)  # total incorrect out of predicted
    total_not_predicted = Column(Integer,
                                 default=0)  # NER: total manually labelled spans that were not detected by rules
    # classification: total manually labelled docs (with non-empty class) that got abstain

    # computed during rule creation
    total_predicted_docs = Column(Integer)  # total docs with predicted label (classification) or spans (NER)
    # NER only
    total_predicted_spans = Column(Integer, default=0)  # total number of predicted spans

    # needed for rule table only
    total_docs_rules_manual_labelled = Column(Integer, default=0)

    # single rule metrics (computed during rule creation)
    total_rules_coverage = Column(Integer)  # union of total coverage by all rules
    total_rules_overlaps = Column(Integer)  # total overlaps by all rules

    classes = relationship("SupervisedClass",
                           order_by="SupervisedClass.id",
                           cascade="all, delete, delete-orphan")

    __mapper_args__ = {
        'polymorphic_identity': 'supervised',
        'polymorphic_on': supervised_type,
        'with_polymorphic': '*'
    }


class ClassificationProject(SupervisedProject):
    __tablename__ = 'classification_project'

    id = Column(Integer, ForeignKey('supervised_project.id'), primary_key=True)

    has_ground_truth_labels = Column(Boolean)
    merged_method = Column(String)

    # single rule metrics
    total_rules_conflicts = Column(Integer)

    rules = relationship("ClassificationRule",
                         order_by="ClassificationRule.id",
                         cascade="all, delete, delete-orphan")

    __mapper_args__ = {
        'polymorphic_identity': 'classification',
    }


class NERProject(SupervisedProject):
    __tablename__ = 'ner_project'

    id = Column(Integer, ForeignKey('supervised_project.id'), primary_key=True)

    rules = relationship("NERRule",
                         order_by="NERRule.id",
                         cascade="all, delete, delete-orphan")
    __mapper_args__ = {
        'polymorphic_identity': 'ner',
    }


class SupervisedClass(Base):
    """
    All possibilities for class A:

    - predicted A, manually labelled B: incorrect
    - predicted A, manually labelled A: correct
    - predicted B, manually labelled A: wrong_class (not supported)
    - no prediction, manually labelled A: not_predicted
    - predicted A, no manual label: included in total_predicted
    """
    __tablename__ = 'supervised_class'

    id = Column(Integer, primary_key=True)  # class_name_id
    project_id = Column(Integer, ForeignKey('project.id'), primary_key=True)
    name = Column(String)
    colour = Column(String)

    # this is supervised class i (NER: spans, classification: docs)
    total_predicted = Column(Integer, default=0)  # predicted class i
    total_correct = Column(Integer, default=0)  # predicted class i, manual class i
    total_incorrect = Column(Integer, default=0)  # predicted class i, manual class other
    total_not_predicted = Column(Integer, default=0)  # no prediction, manual class i // not used anywhere

    # NER only
    total_manual_spans = Column(Integer, default=0)  # total number of manual spans of class i

    # NER: total number of documents that have manual spans of class i.
    # Classification: total number of manually labelled documents of class i.
    total_manual_docs = Column(Integer, default=0)

    estimated_precision = Column(Float)
    estimated_precision_lower_bound = Column(Float)
    estimated_precision_upper_bound = Column(Float)

    estimated_recall = Column(Float)
    estimated_recall_lower_bound = Column(Float)
    estimated_recall_upper_bound = Column(Float)

    # only applies to classification
    total_ground_truth = Column(Integer)  # total ground-truth instances of this class
    total_ground_truth_correct = Column(Integer)  # total ground-truth correct instances of this class
    ground_truth_precision = Column(Float)
    ground_truth_recall = Column(Float)


class Rule(Base):
    __tablename__ = 'rule'

    id = Column(Integer, primary_key=True)
    type = Column(String)
    create_rule_id = Column(String)
    project_id = Column(Integer, ForeignKey('project.id'))
    rule_type = Column(String)
    name = Column(String)
    params = Column(Text)
    class_id = Column(Integer)
    class_name = Column(String)
    coverage = Column(Integer)  # in terms of num docs (for entities, num docs with at least 1 entity)
    overlaps = Column(Integer)  # in terms of docs
    accuracy = Column(String)  # in terms of docs for classification, and entities for NER

    __mapper_args__ = {
        'polymorphic_identity': 'rule',
        'polymorphic_on': type,
        'with_polymorphic': '*'
    }


class ClassificationRule(Rule):
    __tablename__ = 'classification_rule'

    id = Column(Integer, ForeignKey('rule.id'), primary_key=True)
    conflicts = Column(Integer)

    __mapper_args__ = {
        'polymorphic_identity': 'classification',
    }


class NERRule(Rule):
    __tablename__ = 'ner_rule'

    id = Column(Integer, ForeignKey('rule.id'), primary_key=True)
    missed = Column(Integer)

    __mapper_args__ = {
        'polymorphic_identity': 'ner',
    }
