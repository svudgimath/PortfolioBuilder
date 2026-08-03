from rest_framework import serializers


class SignupSerializer(serializers.Serializer):
    name = serializers.CharField(
        max_length=100,
        error_messages={
            "blank": "Name is required",
            "required": "Name is required",
            "max_length": "Name must be at most 100 characters",
        },
    )
    email = serializers.EmailField(
        error_messages={
            "blank": "Email is required",
            "required": "Email is required",
            "invalid": "Invalid email format",
        },
    )
    password = serializers.CharField(
        min_length=8,
        error_messages={
            "blank": "Password is required",
            "required": "Password is required",
            "min_length": "Password must be at least 8 characters",
        },
    )


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField(
        error_messages={
            "blank": "Email is required",
            "required": "Email is required",
            "invalid": "Invalid email format",
        },
    )
    password = serializers.CharField(
        error_messages={
            "blank": "Password is required",
            "required": "Password is required",
        },
    )


class RefreshSerializer(serializers.Serializer):
    refreshToken = serializers.CharField(required=False, allow_blank=True, allow_null=True)
