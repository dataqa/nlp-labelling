import uuid
from django.db import models
from django.contrib.auth.models import User


class Account(models.Model):
    uuid = models.UUIDField(default=uuid.uuid4)
    created_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return str(self.uuid)


class UserProfile(models.Model):
    account = models.ForeignKey(Account, null=True, on_delete=models.SET_NULL)
    uuid = models.UUIDField(default=uuid.uuid4)
    created_at = models.DateTimeField(auto_now=True)
    user = models.OneToOneField(User, on_delete=models.CASCADE)
