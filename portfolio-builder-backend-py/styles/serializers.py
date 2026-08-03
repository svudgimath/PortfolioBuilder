from rest_framework import serializers


class GenerateStyleRequestSerializer(serializers.Serializer):
    prompt = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        max_length=2000,
        error_messages={"max_length": "Prompt must be at most 2000 characters"},
    )
    model = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        max_length=100,
        error_messages={"max_length": "Model name must be at most 100 characters"},
    )
