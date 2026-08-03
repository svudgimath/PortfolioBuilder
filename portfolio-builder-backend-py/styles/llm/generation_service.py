import json
import logging
import random
import time
import uuid

from django.conf import settings

from core.exceptions import BadRequestException
from portfolio.repository import PortfolioRepository, serialize_document
from styles import rate_limit
from styles.exceptions import (
    GeminiRateLimitException,
    StyleGenerationFailedException,
    StyleGenerationTimeoutException,
    StyleProviderBusyException,
)
from styles.models import GenerationLog
from styles.service import save_style, serialize_style

from . import gemini_generator

logger = logging.getLogger(__name__)

# Curated creative directions. When the user supplies no direction we pick one at
# random so generated styles stay varied instead of converging on a model default.
STYLE_DIRECTIONS = [
    # dark, varied moods
    "dark editorial with elegant serifs, ambient depth, restrained palette",
    "neon cyberpunk: glass cards, vivid duotone backdrop, uppercase tracked headings",
    "moody dark academia, deep burgundy and cream, Crimson Pro serif",
    "midnight blue editorial, Fraunces serif, gradient-tone with grain",
    "developer-focused dark mode, mono-accent emerald, sharp radius, layered depth",
    "tech startup energy, Space Grotesk, electric accent, layered crisp shadows",
    "retro 80s synthwave: magenta and cyan, grid pattern, uppercase tracked",
    "indie game adjacent: bold sans, vibrant duotone, crisp shadows",
    # light, varied moods
    "warm pastel, friendly modern, soft serif headings, gentle motion",
    "elegant luxury, Cormorant Garamond, muted bronze and cream, soft radius",
    "academic formal, Spectral serif, restrained earth palette, list-heavy variants",
    "light corporate, clean grid, subtle shadows, Inter throughout",
    "nordic minimal: cool grays, hairline borders, soft motion, off-white bg",
    "scandinavian clean, Hanken Grotesk, generous whitespace",
    "soft pastel light: lavender and mint, round radius, gentle motion",
    "fashion magazine: Playfair Display + Jost, high contrast, expressive scale",
    "japanese editorial: generous whitespace, Noto Serif + Inter, restrained",
    "classic newspaper: Lora + Source Sans, numbered section labels",
    # distinctive / bold (either mode)
    "minimal brutalist: monochrome, sharp edges, flat depth, defined borders",
    "bold creative agency: expressive display fonts, vibrant accents, clay cards",
    "warm earthy palette: terracotta and sage, organic blob avatar shape",
    "vibrant maximalist: oversized type, clay cards, geometric-backdrop avatar",
    "warm sunset palette: orange to pink gradient, expressive motion",
    "monochrome zen: single grayscale plus one accent, flat depth, no glow",
    "art deco luxury: Bodoni Moda, gold and black, sharp radius",
    "playful y2k: gradient-heavy, blob avatar, expressive motion",
    "tactile clay: soft pastels, clay cards, round radius, organic feel",
]

_portfolio_repository = PortfolioRepository()


def generate(user_id: str, prompt: str | None, requested_model: str | None) -> dict:
    """Orchestrates: rate-limit check -> load portfolio -> resolve direction ->
    provider call -> attempt logging -> quota. Mirrors StyleGenerationService.generate()."""
    user_uuid = uuid.UUID(user_id)

    # Enforce limits before spending a provider call. Rejected calls are not logged
    # (no attempt was made), so they don't count toward the per-minute window.
    rate_limit.check(user_uuid)

    portfolio_json = _load_portfolio_json(user_id)
    direction = _resolve_direction(prompt)
    # Only one provider is registered (Gemini) — any requested model name resolves to
    # it, same as Java's StyleGeneratorRegistry falling back to the default when the
    # requested name isn't registered. `requested_model` is accepted but currently a no-op.
    model = gemini_generator.model_name()

    start = time.monotonic()
    try:
        style_payload = gemini_generator.generate(portfolio_json, direction)
        style_payload["prompt"] = direction
        style_payload["isActive"] = True
        saved = save_style(user_id, style_payload)

        _persist(user_uuid, GenerationLog.Status.SUCCESS, model)
        logger.info(
            "Style generation success userId=%s model=%s durationMs=%d",
            user_id, model, int((time.monotonic() - start) * 1000),
        )
        return {"style": serialize_style(saved), "quota": rate_limit.current_quota(user_uuid)}

    except GeminiRateLimitException as e:
        # Retries exhausted on provider 429 -> surface as "busy".
        _persist(user_uuid, GenerationLog.Status.FAILED_PROVIDER, model)
        _log_failure(user_id, model, "provider_rate_limited", e)
        raise StyleProviderBusyException() from e

    except StyleProviderBusyException as e:
        _persist(user_uuid, GenerationLog.Status.FAILED_PROVIDER, model)
        _log_failure(user_id, model, "provider_busy", e)
        raise

    except StyleGenerationTimeoutException as e:
        _persist(user_uuid, GenerationLog.Status.FAILED_TIMEOUT, model)
        _log_failure(user_id, model, "timeout", e)
        raise

    except StyleGenerationFailedException as e:
        _persist(user_uuid, GenerationLog.Status.FAILED_VALIDATION, model)
        _log_failure(user_id, model, "generation_failed", e)
        raise

    except Exception as e:
        _persist(user_uuid, GenerationLog.Status.FAILED_PROVIDER, model)
        _log_failure(user_id, model, "unexpected", e)
        raise StyleGenerationFailedException() from e


def _load_portfolio_json(user_id: str) -> str:
    """A portfolio must already exist — unlike GET /portfolio, this does NOT auto-create one."""
    doc = _portfolio_repository.find_by_user_id(user_id)
    if doc is None:
        raise BadRequestException("Create your portfolio before generating a style")
    return json.dumps(serialize_document(doc))


def _resolve_direction(prompt: str | None) -> str:
    if prompt and prompt.strip():
        return prompt.strip()
    return random.choice(STYLE_DIRECTIONS)


def _persist(user_id, status, model) -> None:
    try:
        GenerationLog.objects.create(user_id=user_id, status=status, model=model)
    except Exception as ex:  # Logging must never break the request flow.
        logger.warning("Failed to persist generation log userId=%s status=%s: %s", user_id, status, ex)


def _log_failure(user_id, model, error, cause) -> None:
    logger.warning(
        "Style generation failed userId=%s model=%s error=%s message=%s", user_id, model, error, cause
    )
