from rest_framework import serializers


def optional_char(max_length, message, allow_null=True):
    return serializers.CharField(
        max_length=max_length,
        required=False,
        allow_blank=True,
        allow_null=allow_null,
        error_messages={"max_length": message},
    )


def required_char(max_length, blank_message, size_message):
    return serializers.CharField(
        max_length=max_length,
        required=True,
        allow_blank=False,
        error_messages={
            "blank": blank_message,
            "required": blank_message,
            "max_length": size_message,
        },
    )


def optional_bool():
    return serializers.BooleanField(required=False, allow_null=True)


def tag_list(max_length, message):
    return serializers.ListField(
        child=serializers.CharField(
            max_length=max_length, allow_blank=True, error_messages={"max_length": message}
        ),
        required=False,
        allow_null=True,
    )


class FlexibleStringListField(serializers.ListField):
    """Accepts a JSON array of strings OR a single bare string (auto-wrapped into
    a one-element list) — mirrors Java's FlexibleStringListDeserializer, used for
    ExperienceItem.description / EducationItem.description."""

    def to_internal_value(self, data):
        if isinstance(data, str):
            data = [data]
        return super().to_internal_value(data)


class SocialSerializer(serializers.Serializer):
    platform = optional_char(100, "Platform must be at most 100 characters")
    url = optional_char(1000, "Social URL is too long")


class CtaButtonSerializer(serializers.Serializer):
    label = optional_char(100, "Button label must be at most 100 characters")
    href = optional_char(1000, "Button link is too long")


class CtaButtonsSerializer(serializers.Serializer):
    primary = CtaButtonSerializer(required=False, allow_null=True)
    secondary = CtaButtonSerializer(required=False, allow_null=True)


class WhatIDoSerializer(serializers.Serializer):
    heading = optional_char(200, "Heading must be at most 200 characters")
    brief = optional_char(500, "Brief must be at most 500 characters")


class HighlightSerializer(serializers.Serializer):
    name = optional_char(200, "Name must be at most 200 characters")
    quant = optional_char(100, "Value must be at most 100 characters")


class SkillGroupSerializer(serializers.Serializer):
    category = optional_char(100, "Category must be at most 100 characters")
    tags = tag_list(100, "Each tag must be at most 100 characters")
