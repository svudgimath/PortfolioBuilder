from rest_framework import serializers

REPO_NAME_PATTERN = r"^[a-zA-Z0-9._-]+$"
MODE_PATTERN = r"^(FULL|CONTENT_ONLY)$"


class ValidateRepoRequestSerializer(serializers.Serializer):
    repoName = serializers.CharField(
        required=True,
        allow_blank=False,
        error_messages={"blank": "Repository name is required", "required": "Repository name is required"},
    )


class PublishRequestSerializer(serializers.Serializer):
    repoName = serializers.RegexField(
        REPO_NAME_PATTERN,
        required=True,
        allow_blank=False,
        error_messages={
            "blank": "Repository name is required",
            "required": "Repository name is required",
            "invalid": "Repository name can only contain letters, numbers, hyphens, dots, and underscores",
        },
    )
    mode = serializers.RegexField(
        MODE_PATTERN,
        required=True,
        allow_blank=False,
        error_messages={
            "blank": "Mode is required",
            "required": "Mode is required",
            "invalid": "Mode must be FULL or CONTENT_ONLY",
        },
    )
