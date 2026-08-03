from datetime import datetime, timezone

from core.exceptions import NotFoundException, UnauthorizedException
from portfolio.repository import PortfolioRepository

from .repository import StyleRepository

MAX_STYLES_PER_USER = 5

STYLE_GROUP_KEYS = [
    "theme",
    "typography",
    "backdrop",
    "depth",
    "surface",
    "components",
    "sections",
    "motion",
]

_portfolio_repository = PortfolioRepository()
_style_repository = StyleRepository()


def _portfolio_id_for(user_id: str) -> str:
    """Mirrors Java's StyleService calling PortfolioService.getByUserId(userId).getId()
    — auto-creates an empty portfolio the same way Portfolio's own GET does."""
    doc = _portfolio_repository.get_or_create(user_id)
    return str(doc["_id"])


def get_active_style(user_id: str):
    portfolio_id = _portfolio_id_for(user_id)
    return _style_repository.find_active(portfolio_id)


def get_all_styles(user_id: str) -> list:
    portfolio_id = _portfolio_id_for(user_id)
    return _style_repository.find_all_by_portfolio(portfolio_id)


def save_style(user_id: str, incoming: dict) -> dict:
    portfolio_id = _portfolio_id_for(user_id)
    existing = _style_repository.find_all_by_portfolio(portfolio_id)

    next_version = 1 if not existing else existing[0]["version"] + 1

    if incoming.get("isActive") is True:
        for style in existing:
            if style.get("isActive") is True:
                style["isActive"] = False
                _style_repository.save(style)

    incoming.pop("_id", None)
    incoming["portfolioId"] = portfolio_id
    incoming["userId"] = user_id
    incoming["version"] = next_version
    incoming["generatedAt"] = datetime.now(timezone.utc)

    if incoming.get("isActive") is None:
        incoming["isActive"] = len(existing) == 0

    saved = _style_repository.save(incoming)

    all_styles = _style_repository.find_all_by_portfolio(portfolio_id)
    if len(all_styles) > MAX_STYLES_PER_USER:
        inactive = [s for s in all_styles if s.get("isActive") is not True]
        for style in inactive[MAX_STYLES_PER_USER - 1:]:
            _style_repository.delete(style)

    return saved


def activate_style(user_id: str, style_id: str) -> dict:
    portfolio_id = _portfolio_id_for(user_id)

    for style in _style_repository.find_all_by_portfolio(portfolio_id):
        style["isActive"] = False
        _style_repository.save(style)

    style = _style_repository.find_by_id(style_id)
    if style is None:
        raise NotFoundException("Style not found")
    if style.get("userId") != user_id:
        raise UnauthorizedException("You don't have access to this style")

    style["isActive"] = True
    return _style_repository.save(style)


def delete_style(user_id: str, style_id: str) -> None:
    style = _style_repository.find_by_id(style_id)
    if style is None:
        raise NotFoundException("Style not found")
    if style.get("userId") != user_id:
        raise UnauthorizedException("You don't have access to this style")
    _style_repository.delete(style)


def serialize_style(doc: dict) -> dict:
    """Mirrors Java's @JsonInclude(NON_NULL) on StyleDocument — omits null fields
    entirely rather than including them as null."""
    result = {"id": str(doc["_id"])}
    for key in ["portfolioId", "userId", "templateId", "version", "isActive", "prompt", *STYLE_GROUP_KEYS]:
        value = doc.get(key)
        if value is not None:
            result[key] = value
    generated_at = doc.get("generatedAt")
    if generated_at is not None:
        result["generatedAt"] = generated_at.isoformat() if hasattr(generated_at, "isoformat") else generated_at
    return result
