import json
import logging
import time
from pathlib import Path

import httpx
from django.conf import settings
from google import genai
from google.genai import errors, types

from styles.exceptions import (
    GeminiRateLimitException,
    StyleGenerationFailedException,
    StyleGenerationTimeoutException,
)

logger = logging.getLogger(__name__)

TEMPERATURE = 0.70
TOP_P = 0.95
MAX_RETRIES = 2
INITIAL_RETRY_DELAY_SECONDS = 1.0

_RESOURCES_DIR = Path(__file__).resolve().parent / "resources"


def _load_resource_text(filename: str) -> str:
    return (_RESOURCES_DIR / filename).read_text(encoding="utf-8")


def _load_resource_json(filename: str):
    return json.loads(_load_resource_text(filename))


_system_prompt = None
_response_json_schema = None
_client = None


def _get_system_prompt() -> str:
    global _system_prompt
    if _system_prompt is None:
        _system_prompt = _load_resource_text("style-system-prompt.txt")
    return _system_prompt


def _get_response_json_schema():
    global _response_json_schema
    if _response_json_schema is None:
        _response_json_schema = _load_resource_json("style-schema.json")
    return _response_json_schema


def _get_client() -> genai.Client:
    global _client
    if _client is None:
        _client = genai.Client(api_key=settings.GEMINI_API_KEY)
    return _client


def model_name() -> str:
    return settings.LLM_DEFAULT_MODEL


def generate(portfolio_json: str, creative_direction: str) -> dict:
    """Generate the 8-group style payload from a portfolio + creative direction.
    Returns a plain dict of just the style groups (persistence fields are left
    for the save flow), mirroring StyleGenerator.generate() in Java."""
    text = _call_model_with_retry(_build_user_prompt(portfolio_json, creative_direction, strict=False))
    style = _try_parse(text)
    if style is not None:
        return style

    logger.warning("Gemini returned unparseable style JSON; retrying once with stricter prompt")
    text = _call_model_with_retry(_build_user_prompt(portfolio_json, creative_direction, strict=True))
    style = _try_parse(text)
    if style is not None:
        return style

    raise StyleGenerationFailedException()


def _call_model_with_retry(user_text: str) -> str:
    delay = INITIAL_RETRY_DELAY_SECONDS
    attempt = 0
    while True:
        try:
            return _call_model(user_text)
        except GeminiRateLimitException:
            if attempt >= MAX_RETRIES:
                raise
            time.sleep(delay)
            delay *= 2
            attempt += 1


def _call_model(user_text: str) -> str:
    config = types.GenerateContentConfig(
        response_mime_type="application/json",
        response_json_schema=_get_response_json_schema(),
        system_instruction=_get_system_prompt(),
        temperature=TEMPERATURE,
        top_p=TOP_P,
        http_options=types.HttpOptions(timeout=settings.LLM_TIMEOUT_SECONDS * 1000),
    )

    try:
        response = _get_client().models.generate_content(
            model=model_name(), contents=user_text, config=config
        )
        text = response.text
        if not text or not text.strip():
            raise StyleGenerationFailedException()
        return text
    except errors.APIError as e:
        if e.code == 429:
            raise GeminiRateLimitException() from e
        logger.warning("Gemini API error: code=%s message=%s", e.code, e.message)
        raise StyleGenerationFailedException() from e
    except (httpx.TimeoutException, httpx.ConnectError) as e:
        logger.warning("Gemini call timed out / IO error: %s", e)
        raise StyleGenerationTimeoutException() from e


def _try_parse(text: str):
    try:
        return json.loads(text)
    except (json.JSONDecodeError, TypeError):
        logger.debug("Failed to parse generated style JSON")
        return None


def _build_user_prompt(portfolio_json: str, creative_direction: str, strict: bool) -> str:
    parts = [f"Creative direction: {creative_direction}", "", f"Portfolio:\n{portfolio_json}"]
    if strict:
        parts.append(
            "\nIMPORTANT: respond with ONLY valid minified JSON matching the schema, no markdown fences."
        )
    return "\n".join(parts)
