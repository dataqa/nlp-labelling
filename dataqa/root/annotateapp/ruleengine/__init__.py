from annotateapp.ruleengine.interventions_rule import InterventionsRule
from annotateapp.ruleengine.regex_rule import RegexRule
from annotateapp.models import Document, DocumentLabel, Rule


rules = {"RegexRule": RegexRule, "InterventionsRule": InterventionsRule}


def run_rule(rule: Rule, documents: list[Document]) -> list[DocumentLabel]:
    rule_engine = rules.get(rule.rule_engine)
    return rule_engine.run_rule(rule, documents)
