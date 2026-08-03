import uuid

from django.db import models

from accounts.models import AppUser


class GithubAuth(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(AppUser, on_delete=models.CASCADE, db_column="user_id")
    github_user_id = models.BigIntegerField(unique=True, db_column="github_user_id")
    github_login = models.CharField(max_length=100, db_column="github_login")
    # TODO: Encrypt access token before storing. Use AES-256 with a managed key.
    access_token = models.TextField(db_column="access_token")
    token_type = models.CharField(max_length=50, null=True, blank=True, db_column="token_type")
    scope = models.CharField(max_length=255, null=True, blank=True, db_column="scope")
    created_at = models.DateTimeField(auto_now_add=True, db_column="created_at")
    updated_at = models.DateTimeField(auto_now=True, db_column="updated_at")

    class Meta:
        db_table = "github_auth"
