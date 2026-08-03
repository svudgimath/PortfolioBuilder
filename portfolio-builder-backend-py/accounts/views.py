from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from core import jwt_service
from core.exceptions import BadRequestException, ConflictException, UnauthorizedException
from core.throttling import AuthRateThrottle

from .models import AppUser
from .serializers import LoginSerializer, RefreshSerializer, SignupSerializer


def _tokens_response(user, access_token, refresh_token):
    return Response(
        {
            "accessToken": access_token,
            "refreshToken": refresh_token,
            "name": user.name,
            "email": user.email,
        }
    )


class SignupView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [AuthRateThrottle]

    def post(self, request):
        serializer = SignupSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        if AppUser.objects.filter(email__iexact=data["email"]).exists():
            raise ConflictException("Email already registered")

        user = AppUser(email=data["email"], name=data["name"])
        user.set_password(data["password"])
        user.save()

        access_token = jwt_service.generate_access_token(str(user.id), user.email)
        refresh_token = jwt_service.generate_refresh_token(str(user.id), user.email)

        return _tokens_response(user, access_token, refresh_token)


class LoginView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [AuthRateThrottle]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            user = AppUser.objects.get(email__iexact=data["email"])
        except AppUser.DoesNotExist:
            raise UnauthorizedException("Invalid email or password")

        if not user.check_password(data["password"]):
            raise UnauthorizedException("Invalid email or password")

        access_token = jwt_service.generate_access_token(str(user.id), user.email)
        refresh_token = jwt_service.generate_refresh_token(str(user.id), user.email)

        return _tokens_response(user, access_token, refresh_token)


class RefreshView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [AuthRateThrottle]

    def post(self, request):
        serializer = RefreshSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        refresh_token = serializer.validated_data.get("refreshToken")

        if not refresh_token:
            raise BadRequestException("refreshToken is required")

        if not jwt_service.is_token_valid(refresh_token):
            raise UnauthorizedException("Invalid refresh token")

        if jwt_service.get_token_type(refresh_token) != "refresh":
            raise UnauthorizedException("Invalid token type")

        claims = jwt_service.parse_token(refresh_token)
        user_id = claims["sub"]
        email = claims.get("email")

        new_access_token = jwt_service.generate_access_token(user_id, email)

        return Response(
            {
                "accessToken": new_access_token,
                "refreshToken": refresh_token,
                "name": None,
                "email": email,
            }
        )
