from django.test import TestCase

from model_bakery import baker
from annotateapp.models import DocumentLabel, Project, Document, Rule
from annotateapp.ruleengine import run_rule
from annotateapp.tests.fixtures import NSCLC_DOCUMENTS


class TestInterventionsRule(TestCase):
    def setUp(self):
        self.project = baker.make(Project)

        self.documents = [baker.make(Document, text=text) for text in NSCLC_DOCUMENTS]
        self.rule = baker.make(
            Rule, project=self.project, rule_engine="InterventionsRule"
        )

    def test_run_intervention_rules(self):
        run_rule(self.rule, self.documents)

        document = self.documents[0]
        document_labels = DocumentLabel.objects.filter(document=document)
        self.assertEquals(document_labels.count(), 4)
        self.assertEquals(document_labels[0].phrase, "pemetrexed")
        self.assertEquals(document_labels[0].start_pos, 32)
        self.assertEquals(document_labels[0].end_pos, 42)

        document = self.documents[1]
        document_labels = DocumentLabel.objects.filter(document=document)
        self.assertEquals(document_labels.count(), 3)
        self.assertEquals(document_labels[1].phrase, "SU")
        self.assertEquals(document_labels[1].phrase_normalised, "Sunitinib")
        self.assertEquals(document_labels[0].start_pos, 429)
        self.assertEquals(document_labels[0].end_pos, 440)
