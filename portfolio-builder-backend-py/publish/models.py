import uuid

from django.db import models

from accounts.models import AppUser


class Template(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    slug = models.CharField(max_length=100, unique=True)
    name = models.CharField(max_length=100)
    description = models.TextField(null=True, blank=True)
    dist_path = models.CharField(max_length=500, db_column="dist_path")
    data_path = models.CharField(max_length=100, db_column="data_path")
    portfolio_filename = models.CharField(max_length=100, db_column="portfolio_filename")
    style_filename = models.CharField(max_length=100, db_column="style_filename")
    is_active = models.BooleanField(default=True, db_column="is_active")
    created_at = models.DateTimeField(auto_now_add=True, db_column="created_at")
    updated_at = models.DateTimeField(auto_now=True, db_column="updated_at")

    class Meta:
        db_table = "template"
        indexes = [models.Index(fields=["is_active"])]


class PublishedPortfolio(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(AppUser, on_delete=models.CASCADE, db_column="user_id")
    repo_name = models.CharField(max_length=200, db_column="repo_name")
    repo_url = models.CharField(max_length=500, db_column="repo_url")
    default_branch = models.CharField(max_length=100, null=True, blank=True, db_column="default_branch")
    pages_enabled = models.BooleanField(default=False, db_column="pages_enabled")
    pages_url = models.CharField(max_length=500, null=True, blank=True, db_column="pages_url")
    last_published_at = models.DateTimeField(null=True, blank=True, db_column="last_published_at")
    created_at = models.DateTimeField(auto_now_add=True, db_column="created_at")
    updated_at = models.DateTimeField(auto_now=True, db_column="updated_at")

    class Meta:
        db_table = "published_portfolio"
