from urllib.parse import quote, urlencode

from django.conf import settings
from django.http import HttpResponse, HttpResponseRedirect
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from core import jwt_service

from . import service


class GithubStatusView(APIView):
    def get(self, request):
        auth = service.get_github_auth(str(request.user.id))
        if auth is None:
            return Response({"connected": False})
        return Response({"connected": True, "githubLogin": auth.github_login})


class GithubConnectView(APIView):
    """Public — the JWT arrives as a query param (not an Authorization header) since
    the browser navigates here via a full-page redirect, not an XHR call."""

    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        token = request.query_params.get("token")
        if not token or not jwt_service.is_token_valid(token):
            return HttpResponse("Invalid token", status=401)

        params = urlencode(
            {
                "client_id": settings.GITHUB_CLIENT_ID,
                "redirect_uri": settings.GITHUB_REDIRECT_URI,
                "scope": settings.GITHUB_SCOPE,
                "state": token,  # the app's own JWT doubles as CSRF state + identity carrier
            }
        )
        return HttpResponseRedirect(f"https://github.com/login/oauth/authorize?{params}")


class GithubCallbackView(APIView):
    """Public — GitHub redirects here after the user authorizes. Always responds with
    a redirect back to the frontend, never JSON."""

    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        code = request.query_params.get("code")
        state = request.query_params.get("state")
        error = request.query_params.get("error")

        frontend_url = settings.GITHUB_FRONTEND_SUCCESS_URL

        if error or not code or not state:
            return HttpResponseRedirect(f"{frontend_url}/publish?github=error")

        if not jwt_service.is_token_valid(state):
            return HttpResponseRedirect(f"{frontend_url}/publish?github=error")

        user_id = jwt_service.get_user_id_from_token(state)

        try:
            service.connect_github(user_id, code)
            return HttpResponseRedirect(f"{frontend_url}/publish?github=connected")
        except Exception as e:
            encoded_message = quote(str(e))
            return HttpResponseRedirect(f"{frontend_url}/publish?github=error&message={encoded_message}")
