import uuid
from django.db import models
from django.db.models.deletion import CASCADE

from accountapp.models import Account


class Project(models.Model):
    uuid = models.UUIDField(default=uuid.uuid4, db_index=True)
    created_at = models.DateTimeField(auto_now=True)
    name = models.CharField(max_length=512)
    slug = models.SlugField(max_length=512)
    account = models.ForeignKey(Account, on_delete=CASCADE)

    def __str__(self):
        return str(self.uuid)


class Document(models.Model):
    uuid = models.UUIDField(default=uuid.uuid4, db_index=True)
    project = models.ForeignKey(Project, on_delete=CASCADE)
    created_at = models.DateTimeField(auto_now=True)
    text = models.TextField()


class Rule(models.Model):
    uuid = models.UUIDField(default=uuid.uuid4, db_index=True)
    project = models.ForeignKey(Project, on_delete=CASCADE)
    created_at = models.DateTimeField(auto_now=True)
    name = models.CharField(max_length=512)
    slug = models.SlugField(max_length=512)
    rule_engine = models.CharField(
        max_length=512, help_text="Choose a RuleEngine class to execute this rule"
    )


class Regex(models.Model):
    uuid = models.UUIDField(default=uuid.uuid4, db_index=True)
    rule = models.ForeignKey(Rule, on_delete=CASCADE)
    created_at = models.DateTimeField(auto_now=True)
    regex = models.TextField()


class DocumentLabel(models.Model):
    """
    A label created as result of rule applied to document
    """

    uuid = models.UUIDField(default=uuid.uuid4, db_index=True)
    created_at = models.DateTimeField(auto_now=True)
    document = models.ForeignKey(Document, on_delete=CASCADE)
    regex = models.ForeignKey(Regex, on_delete=CASCADE, null=True, blank=True)

    start_pos = models.IntegerField()
    end_pos = models.IntegerField()
    phrase = models.TextField()
    phrase_normalised = models.TextField()
