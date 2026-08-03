from django.db import models


class GenerationLog(models.Model):
    """Log of LLM style-generation attempts — drives per-user rate limiting
    (per-minute burst across all statuses, per-day cap on successes)."""

    class Status(models.TextChoices):
        SUCCESS = "SUCCESS"
        FAILED_PROVIDER = "FAILED_PROVIDER"
        FAILED_VALIDATION = "FAILED_VALIDATION"
        FAILED_TIMEOUT = "FAILED_TIMEOUT"

    id = models.BigAutoField(primary_key=True)
    user_id = models.UUIDField(db_column="user_id")
    created_at = models.DateTimeField(db_column="created_at", auto_now_add=True)
    status = models.CharField(max_length=32, choices=Status.choices)
    model = models.CharField(max_length=100, null=True, blank=True)

    class Meta:
        db_table = "generation_log"
        indexes = [models.Index(fields=["user_id", "created_at"])]
