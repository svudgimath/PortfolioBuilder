from rest_framework.authentication import BaseAuthentication

from core import jwt_service


class BearerJWTAuthentication(BaseAuthentication):
    """Reads `Authorization: Bearer <token>`, mirroring JwtAuthenticationFilter.java.

    Any missing/malformed header or invalid/non-access token is treated as
    "no credentials supplied" (returns None) rather than raising — DRF's
    IsAuthenticated permission (via core.exception_handler) is what turns
    that into the 401 response, same division of responsibility as the
    Java filter + Spring Security's authenticationEntryPoint.
    """

    def authenticate(self, request):
        auth_header = request.META.get("HTTP_AUTHORIZATION", "")
        if not auth_header.startswith("Bearer "):
            return None

        token = auth_header[len("Bearer "):]
        if not jwt_service.is_token_valid(token) or not jwt_service.is_access_token(token):
            return None

        user_id = jwt_service.get_user_id_from_token(token)

        from accounts.models import AppUser

        try:
            user = AppUser.objects.get(pk=user_id)
        except (AppUser.DoesNotExist, ValueError):
            return None

        return (user, token)
