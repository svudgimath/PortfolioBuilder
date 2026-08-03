from django.conf import settings

from accounts.models import AppUser
from core.exceptions import BadRequestException, ConflictException, NotFoundException

from . import api_client, oauth_client
from .models import GithubAuth


def get_github_auth(user_id: str) -> GithubAuth | None:
    return GithubAuth.objects.filter(user_id=user_id).first()


def is_github_connected(user_id: str) -> bool:
    return get_github_auth(user_id) is not None


def connect_github(user_id: str, code: str) -> GithubAuth:
    token = oauth_client.exchange_code_for_token(
        settings.GITHUB_CLIENT_ID, settings.GITHUB_CLIENT_SECRET, code, settings.GITHUB_REDIRECT_URI
    )
    if not token or not token.get("access_token"):
        raise BadRequestException("Failed to obtain access token from GitHub")

    github_user = api_client.get_current_user(token["access_token"])
    if not github_user or not github_user.get("login"):
        raise BadRequestException("Failed to fetch GitHub user information")

    try:
        app_user = AppUser.objects.get(id=user_id)
    except AppUser.DoesNotExist:
        raise NotFoundException("User not found")

    # Reject if this GitHub account is already linked to a different Dzigned user.
    existing_by_github = GithubAuth.objects.filter(github_user_id=github_user["id"]).first()
    if existing_by_github is not None and str(existing_by_github.user_id) != str(app_user.id):
        raise ConflictException("This GitHub account is already linked to another Dzigned account")

    github_auth = GithubAuth.objects.filter(user=app_user).first()
    if github_auth is None:
        github_auth = GithubAuth(user=app_user)

    github_auth.github_user_id = github_user["id"]
    github_auth.github_login = github_user["login"]
    github_auth.access_token = token["access_token"]
    github_auth.token_type = token.get("token_type")
    github_auth.scope = token.get("scope")
    github_auth.save()

    return github_auth
