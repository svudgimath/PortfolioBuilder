import base64
import json
import logging
from datetime import datetime, timezone

from accounts.models import AppUser
from core.exceptions import ApiException, BadRequestException, NotFoundException
from github_auth import api_client as github_api
from github_auth.exceptions import GithubNotConnectedException
from github_auth.service import get_github_auth
from portfolio.repository import PortfolioRepository, serialize_document
from styles.service import get_active_style, serialize_style

from . import template_service
from .models import PublishedPortfolio
from .template_service import TEMPLATE_FILES_DIR

logger = logging.getLogger(__name__)

_portfolio_repository = PortfolioRepository()


def get_publish_status(user_id: str) -> dict:
    user = _require_user(user_id)
    published = PublishedPortfolio.objects.filter(user=user).first()

    if published is None:
        return {"published": False, "repoExists": False}

    github_auth = get_github_auth(user_id)
    repo_exists = False
    if github_auth is not None:
        repo_exists = github_api.repo_exists(
            github_auth.access_token, github_auth.github_login, published.repo_name
        )

    return {
        "published": True,
        "repoExists": repo_exists,
        "repoName": published.repo_name,
        "repoUrl": published.repo_url,
        "pagesUrl": published.pages_url,
        "lastPublishedAt": published.last_published_at.isoformat() if published.last_published_at else None,
    }


def suggest_repo_name(user_id: str) -> dict:
    github_auth = _require_github_auth(user_id)
    token = github_auth.access_token
    owner = github_auth.github_login

    base_name = f"dzigned-portfolio-{owner}"
    if not github_api.repo_exists(token, owner, base_name):
        return {"suggestedName": base_name}
    for i in range(2, 11):
        candidate = f"{base_name}-{i}"
        if not github_api.repo_exists(token, owner, candidate):
            return {"suggestedName": candidate}
    return {"suggestedName": base_name}


def validate_repo_name(user_id: str, repo_name: str) -> dict:
    github_auth = _require_github_auth(user_id)
    token = github_auth.access_token
    owner = github_auth.github_login
    user = _require_user(user_id)

    existing = PublishedPortfolio.objects.filter(user=user).first()
    if existing is not None and existing.repo_name == repo_name:
        return {
            "available": False,
            "ownedByUs": True,
            "message": "This is your currently published repo. You can re-publish to it.",
        }

    if github_api.repo_exists(token, owner, repo_name):
        return {
            "available": False,
            "ownedByUs": False,
            "message": f"Repository '{repo_name}' already exists on your GitHub. Please choose a different name.",
        }

    return {"available": True, "ownedByUs": False, "message": "Repository name is available."}


def publish(user_id: str, repo_name: str, mode: str) -> PublishedPortfolio:
    github_auth = _require_github_auth(user_id)
    token = github_auth.access_token
    owner = github_auth.github_login

    is_full_publish = (mode or "").upper() != "CONTENT_ONLY"

    portfolio_doc = _portfolio_repository.get_or_create(user_id)
    style_doc = get_active_style(user_id)

    if not portfolio_doc.get("meta"):
        raise BadRequestException("Portfolio is empty. Please add some content before publishing")

    template_slug = (style_doc or {}).get("templateId") or template_service.get_default().slug
    template = template_service.get_by_slug(template_slug)

    if not github_api.repo_exists(token, owner, repo_name):
        github_api.create_repo(token, repo_name)
        is_full_publish = True  # a brand-new repo always gets the full asset push
        logger.info("Created repo: %s/%s", owner, repo_name)
    else:
        logger.info("Repo exists, pushing updates: %s/%s", owner, repo_name)

    if is_full_publish:
        _push_template_files(token, owner, repo_name, template.dist_path, template.data_path)

    # Media is served from Cloudinary's CDN — portfolio.json already carries absolute
    # https URLs, so the published site loads images directly with no copy step.
    _push_json_data(token, owner, repo_name, template, portfolio_doc, style_doc)

    if is_full_publish:
        _enable_pages(token, owner, repo_name)

    # Trailing slash matters: without it, the browser resolves the published
    # SPA's relative asset URLs (./assets/...) against the parent path instead
    # of the repo path, and every script/style 404s.
    pages_url = f"https://{owner}.github.io/{repo_name}/"

    return _save_published_portfolio(user_id, repo_name, owner, pages_url)


def _require_github_auth(user_id: str):
    auth = get_github_auth(user_id)
    if auth is None:
        raise GithubNotConnectedException()
    return auth


def _require_user(user_id: str) -> AppUser:
    try:
        return AppUser.objects.get(id=user_id)
    except AppUser.DoesNotExist:
        raise NotFoundException("User not found")


def _push_template_files(token: str, owner: str, repo_name: str, dist_path: str, data_path: str) -> None:
    # Template files live on disk under publish/template_files/<distPath>/. Walk them,
    # skipping the sample data/ folder — real user data is pushed separately below.
    base_dir = TEMPLATE_FILES_DIR / dist_path
    if not base_dir.is_dir():
        raise NotFoundException("Template not found. Please contact support")

    files = [p for p in base_dir.rglob("*") if p.is_file()]
    if not files:
        raise NotFoundException("Template not found. Please contact support")

    data_prefix = f"{data_path}/"
    for file_path in files:
        relative_path = file_path.relative_to(base_dir).as_posix()
        if relative_path.startswith(data_prefix):
            logger.info("Skipped template data file: %s", relative_path)
            continue

        try:
            content = file_path.read_bytes()
        except OSError as e:
            raise ApiException("Failed to read template files") from e

        base64_content = base64.b64encode(content).decode("ascii")
        github_api.upsert_file(token, owner, repo_name, relative_path, base64_content, f"Deploy: {relative_path}")
        logger.info("Pushed: %s", relative_path)


def _push_json_data(token: str, owner: str, repo_name: str, template, portfolio_doc: dict, style_doc) -> None:
    try:
        data_path = template.data_path

        portfolio_json = json.dumps(serialize_document(portfolio_doc))
        portfolio_base64 = base64.b64encode(portfolio_json.encode("utf-8")).decode("ascii")
        portfolio_file_path = f"{data_path}/{template.portfolio_filename}"
        github_api.upsert_file(token, owner, repo_name, portfolio_file_path, portfolio_base64, "Update portfolio data")
        logger.info("Pushed: %s", portfolio_file_path)

        if style_doc is not None:
            style_json = json.dumps(serialize_style(style_doc))
            style_base64 = base64.b64encode(style_json.encode("utf-8")).decode("ascii")
            style_file_path = f"{data_path}/{template.style_filename}"
            github_api.upsert_file(token, owner, repo_name, style_file_path, style_base64, "Update style data")
            logger.info("Pushed: %s", style_file_path)
    except ApiException:
        raise
    except Exception as e:
        raise ApiException("Failed to publish portfolio data") from e


def _enable_pages(token: str, owner: str, repo_name: str) -> None:
    try:
        github_api.enable_pages(token, owner, repo_name, "main")
        logger.info("GitHub Pages enabled for: %s/%s", owner, repo_name)
    except Exception as e:
        logger.warning("Could not enable Pages (may already be enabled): %s", e)


def _save_published_portfolio(user_id: str, repo_name: str, owner: str, pages_url: str) -> PublishedPortfolio:
    user = _require_user(user_id)

    published = PublishedPortfolio.objects.filter(user=user).first()
    if published is None:
        published = PublishedPortfolio(user=user)

    published.repo_name = repo_name
    published.repo_url = f"https://github.com/{owner}/{repo_name}"
    published.default_branch = "main"
    published.pages_enabled = True
    published.pages_url = pages_url
    published.last_published_at = datetime.now(timezone.utc)
    published.save()

    return published
