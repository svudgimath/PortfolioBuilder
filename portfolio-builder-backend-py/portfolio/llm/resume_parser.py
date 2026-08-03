import io
import json
import logging
import time
import uuid
from pathlib import Path

import httpx
from django.conf import settings
from google import genai
from google.genai import errors, types
from pypdf import PdfReader

from core.exceptions import (
    BadGatewayException,
    BadRequestException,
    GatewayTimeoutException,
    ServiceUnavailableException,
    TooManyRequestsException,
)

logger = logging.getLogger(__name__)

MIN_TEXT_LENGTH = 100
MAX_TEXT_LENGTH = 30_000
# Resume parsing sends much longer input than style generation and expects a large
# structured response — give it significantly more time than the shared LLM timeout.
PARSE_TIMEOUT_MS = 90_000
RETRY_MAX = 2
RETRY_BASE_SECONDS = 5  # 5s, then 10s

_RESOURCES_DIR = Path(__file__).resolve().parent / "resources"

_system_prompt = None
_response_schema = None
_client = None


def _load_resource_text(filename: str) -> str:
    return (_RESOURCES_DIR / filename).read_text(encoding="utf-8")


def _load_resource_json(filename: str):
    return json.loads(_load_resource_text(filename))


def _get_system_prompt() -> str:
    global _system_prompt
    if _system_prompt is None:
        _system_prompt = _load_resource_text("resume-parse-system-prompt.txt")
    return _system_prompt


def _get_response_schema():
    global _response_schema
    if _response_schema is None:
        _response_schema = _load_resource_json("resume-parse-schema.json")
    return _response_schema


def _get_client() -> genai.Client:
    global _client
    if _client is None:
        _client = genai.Client(api_key=settings.GEMINI_API_KEY)
    return _client


def parse(data: bytes, content_type: str | None) -> dict:
    _validate_content_type(content_type)

    resume_text = _extract_text(data)
    if len(resume_text) < MIN_TEXT_LENGTH:
        raise BadRequestException(
            "Could not extract readable text from the PDF. "
            "Scanned/image-only PDFs are not supported — please upload a text-based PDF."
        )

    if len(resume_text) > MAX_TEXT_LENGTH:
        resume_text = resume_text[:MAX_TEXT_LENGTH]

    json_text = _call_model(resume_text)
    result = _parse_response(json_text)
    _sanitize(result)
    _assign_ids(result)
    return result


def _validate_content_type(content_type: str | None) -> None:
    if not content_type or not content_type.startswith("application/pdf"):
        raise BadRequestException("Only PDF files are accepted for resume parsing.")


def _extract_text(data: bytes) -> str:
    try:
        reader = PdfReader(io.BytesIO(data))
        text = "\n".join(page.extract_text() or "" for page in reader.pages)
        return text.strip()
    except Exception as e:
        logger.debug("PDF text extraction failed: %s", e)
        raise BadRequestException("The uploaded file could not be read as a PDF. Please upload a valid PDF.")


def _call_model(resume_text: str) -> str:
    config = types.GenerateContentConfig(
        response_mime_type="application/json",
        response_json_schema=_get_response_schema(),
        system_instruction=_get_system_prompt(),
        http_options=types.HttpOptions(timeout=PARSE_TIMEOUT_MS),
    )

    for attempt in range(RETRY_MAX + 1):
        try:
            response = _get_client().models.generate_content(
                model=settings.LLM_DEFAULT_MODEL, contents=resume_text, config=config
            )
            text = response.text
            if not text or not text.strip():
                raise BadGatewayException("Resume parsing returned an empty response. Please try again.")
            return text

        except errors.APIError as e:
            if e.code == 429 and attempt < RETRY_MAX:
                wait = RETRY_BASE_SECONDS * (2**attempt)
                logger.warning(
                    "Gemini 429 on resume parse (attempt %d/%d) — backing off %ds",
                    attempt + 1, RETRY_MAX, wait,
                )
                time.sleep(wait)
                continue
            logger.warning("Gemini API error during resume parse: code=%s", e.code)
            if e.code == 429:
                raise TooManyRequestsException(
                    "The AI model is currently rate-limited. Please wait a moment and try again."
                ) from e
            if e.code == 503:
                raise ServiceUnavailableException(
                    "Resume parsing is temporarily unavailable. Please try again in a moment."
                ) from e
            raise BadGatewayException("Resume parsing failed. Please try again later.") from e

        except (httpx.TimeoutException, httpx.ConnectError) as e:
            logger.warning("Gemini timeout during resume parse: %s", e)
            raise GatewayTimeoutException("Resume parsing timed out. Please try again.") from e

    raise BadGatewayException("Resume parsing failed after retries. Please try again.")


def _parse_response(json_text: str) -> dict:
    try:
        return json.loads(json_text)
    except (json.JSONDecodeError, TypeError) as e:
        logger.warning("Failed to parse Gemini resume parse response: %s", e)
        raise BadGatewayException("Resume parsing returned malformed data. Please try again.") from e


def _trunc(value, max_len: int):
    """Truncate to max_len chars at the last word boundary within the limit.
    Falls back to a hard cut if no whitespace is found. None passes through."""
    if value is None or len(value) <= max_len:
        return value
    cut = value.rfind(" ", 0, max_len + 1)
    if cut > max_len // 2:
        return value[:cut].rstrip()
    return value[:max_len].rstrip()


def _sanitize(result: dict) -> None:
    """Truncate any field that exceeds its backend max-length so the result is
    always valid when the frontend applies it. Gemini treats JSON Schema
    maxLength as advisory — this is the hard enforcement layer."""
    meta = result.get("meta")
    if meta:
        meta["displayName"] = _trunc(meta.get("displayName"), 200)
        meta["title"] = _trunc(meta.get("title"), 200)
        meta["shortIntro"] = _trunc(meta.get("shortIntro"), 280)
        meta["location"] = _trunc(meta.get("location"), 200)
        meta["website"] = _trunc(meta.get("website"), 1000)

    about = result.get("about")
    if about:
        if about.get("description"):
            about["description"] = [_trunc(s, 5000) for s in about["description"]]
        if about.get("whatIDo"):
            for w in about["whatIDo"]:
                w["heading"] = _trunc(w.get("heading"), 200)
                w["brief"] = _trunc(w.get("brief"), 500)
        if about.get("highlights"):
            for h in about["highlights"]:
                h["name"] = _trunc(h.get("name"), 200)
                h["quant"] = _trunc(h.get("quant"), 100)
        if about.get("interests"):
            about["interests"] = [_trunc(s, 100) for s in about["interests"]]

    skills = result.get("skills")
    if skills and skills.get("items"):
        for g in skills["items"]:
            g["category"] = _trunc(g.get("category"), 100)
            if g.get("tags"):
                g["tags"] = [_trunc(t, 100) for t in g["tags"]]

    experience = result.get("experience")
    if experience and experience.get("items"):
        for e in experience["items"]:
            e["company"] = _trunc(e.get("company"), 200)
            e["role"] = _trunc(e.get("role"), 200)
            e["startDate"] = _trunc(e.get("startDate"), 100)
            e["endDate"] = _trunc(e.get("endDate"), 100)
            e["location"] = _trunc(e.get("location"), 200)
            e["companyUrl"] = _trunc(e.get("companyUrl"), 1000)
            if e.get("description"):
                e["description"] = [_trunc(s, 2000) for s in e["description"]]
            if e.get("tags"):
                e["tags"] = [_trunc(t, 100) for t in e["tags"]]

    education = result.get("education")
    if education and education.get("items"):
        for e in education["items"]:
            e["institution"] = _trunc(e.get("institution"), 200)
            e["degree"] = _trunc(e.get("degree"), 200)
            e["fieldOfStudy"] = _trunc(e.get("fieldOfStudy"), 200)
            e["grade"] = _trunc(e.get("grade"), 200)
            e["startDate"] = _trunc(e.get("startDate"), 100)
            e["endDate"] = _trunc(e.get("endDate"), 100)
            e["location"] = _trunc(e.get("location"), 200)
            if e.get("description"):
                e["description"] = [_trunc(s, 2000) for s in e["description"]]

    projects = result.get("projects")
    if projects and projects.get("items"):
        for p in projects["items"]:
            p["projectName"] = _trunc(p.get("projectName"), 200)
            p["description"] = _trunc(p.get("description"), 5000)
            p["liveUrl"] = _trunc(p.get("liveUrl"), 1000)
            p["repoUrl"] = _trunc(p.get("repoUrl"), 1000)
            if p.get("tags"):
                p["tags"] = [_trunc(t, 100) for t in p["tags"]]

    certifications = result.get("certifications")
    if certifications and certifications.get("items"):
        for c in certifications["items"]:
            c["name"] = _trunc(c.get("name"), 200)
            c["issuer"] = _trunc(c.get("issuer"), 200)
            c["dateIssued"] = _trunc(c.get("dateIssued"), 100)
            c["expiryDate"] = _trunc(c.get("expiryDate"), 100)
            c["credentialUrl"] = _trunc(c.get("credentialUrl"), 1000)
            c["description"] = _trunc(c.get("description"), 5000)

    research = result.get("research")
    if research and research.get("items"):
        for p in research["items"]:
            p["title"] = _trunc(p.get("title"), 300)
            p["publishedIn"] = _trunc(p.get("publishedIn"), 200)
            p["date"] = _trunc(p.get("date"), 100)
            p["doi"] = _trunc(p.get("doi"), 200)
            p["description"] = _trunc(p.get("description"), 5000)
            p["url"] = _trunc(p.get("url"), 1000)
            if p.get("authors"):
                p["authors"] = [_trunc(a, 200) for a in p["authors"]]
            if p.get("tags"):
                p["tags"] = [_trunc(t, 100) for t in p["tags"]]

    contact = result.get("contact")
    if contact:
        contact["heading"] = _trunc(contact.get("heading"), 200)
        contact["tagline"] = _trunc(contact.get("tagline"), 500)
        contact["phone"] = _trunc(contact.get("phone"), 50)
        if contact.get("socials"):
            for s in contact["socials"]:
                s["platform"] = _trunc(s.get("platform"), 100)
                s["url"] = _trunc(s.get("url"), 1000)

    footer = result.get("footer")
    if footer:
        footer["customNote"] = _trunc(footer.get("customNote"), 500)


def _assign_ids(result: dict) -> None:
    """Inject UUIDs into every item so the frontend gets usable IDs immediately."""
    for section_key in ("experience", "education", "projects", "certifications", "research"):
        section = result.get(section_key)
        if not section or not section.get("items"):
            continue
        for item in section["items"]:
            if not item.get("id"):
                item["id"] = str(uuid.uuid4())
