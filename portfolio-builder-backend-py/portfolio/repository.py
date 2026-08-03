import logging
from datetime import datetime, timezone

from core.mongo import get_db
from files import service as file_service

from . import file_refs

logger = logging.getLogger(__name__)

SECTION_FIELDS = [
    "meta",
    "hero",
    "about",
    "skills",
    "experience",
    "education",
    "projects",
    "certifications",
    "research",
    "testimonials",
    "contact",
    "footer",
]


def _collection():
    return get_db()["portfolios"]


class PortfolioRepository:
    def find_by_user_id(self, user_id: str):
        return _collection().find_one({"userId": user_id})

    def create_empty(self, user_id: str) -> dict:
        now = datetime.now(timezone.utc)
        doc = {"userId": user_id, "createdAt": now, "updatedAt": now}
        for field in SECTION_FIELDS:
            doc[field] = None
        result = _collection().insert_one(doc)
        doc["_id"] = result.inserted_id
        return doc

    def get_or_create(self, user_id: str) -> dict:
        doc = self.find_by_user_id(user_id)
        return doc if doc is not None else self.create_empty(user_id)

    def save(self, doc: dict) -> dict:
        doc["updatedAt"] = datetime.now(timezone.utc)
        _collection().replace_one({"_id": doc["_id"]}, doc)
        return doc

    def update_full(self, user_id: str, sections: dict) -> dict:
        doc = self.get_or_create(user_id)
        before = file_refs.collect(doc)
        for field in SECTION_FIELDS:
            doc[field] = sections.get(field)
        saved = self.save(doc)
        _delete_orphaned_files(before, file_refs.collect(saved))
        return saved

    def update_section(self, user_id: str, section: str, data) -> dict:
        if section not in SECTION_FIELDS:
            raise ValueError(f"Unknown section: {section}")
        doc = self.get_or_create(user_id)
        before = file_refs.collect(doc)
        if section == "meta":
            _sync_resume_cta(doc, data)
        doc[section] = data
        saved = self.save(doc)
        _delete_orphaned_files(before, file_refs.collect(saved))
        return saved

    def apply_resume(self, user_id: str, sections: dict) -> dict:
        """Overlay only the non-null sections from a resume-parse selection onto
        the existing portfolio — sections the caller leaves out are untouched, so
        a partial selection never wipes existing data."""
        doc = self.get_or_create(user_id)
        before = file_refs.collect(doc)
        for field in SECTION_FIELDS:
            value = sections.get(field)
            if value is not None:
                doc[field] = value
        saved = self.save(doc)
        _delete_orphaned_files(before, file_refs.collect(saved))
        return saved


def _sync_resume_cta(doc: dict, new_meta: dict | None) -> None:
    """The Hero CTA picker copies meta.resume into hero.cta.{primary,secondary}.href
    at selection time rather than referencing it live (see CtaGroup in
    PortfolioEditor.jsx). Re-uploading a resume otherwise leaves the Download
    Resume button silently pointing at a now-deleted Cloudinary asset until the
    user happens to revisit the Hero tab and re-pick it. Keep it in sync here
    instead: if a CTA slot's href is the resume URL that's about to change,
    update it (or clear the slot if the resume was removed)."""
    old_resume = (doc.get("meta") or {}).get("resume")
    new_resume = (new_meta or {}).get("resume")
    if not old_resume or old_resume == new_resume:
        return

    hero = doc.get("hero")
    cta = hero.get("cta") if hero else None
    if not cta:
        return

    for slot in ("primary", "secondary"):
        entry = cta.get(slot)
        if entry and entry.get("href") == old_resume:
            cta[slot] = {**entry, "href": new_resume} if new_resume else None


def _delete_orphaned_files(before: set, after: set) -> None:
    """Remove Cloudinary assets referenced before an update but no longer are.
    Best-effort — a failed deletion must not fail the user's save."""
    for ref in before:
        if ref in after:
            continue
        try:
            file_service.delete(ref.public_id, ref.resource_type)
            logger.info("Deleted orphaned asset: %s", ref.public_id)
        except Exception as e:
            logger.warning("Failed to delete orphaned asset %s: %s", ref.public_id, e)


def serialize_document(doc: dict) -> dict:
    result = {
        "id": str(doc["_id"]),
        "userId": doc.get("userId"),
        "createdAt": doc["createdAt"].isoformat() if doc.get("createdAt") else None,
        "updatedAt": doc["updatedAt"].isoformat() if doc.get("updatedAt") else None,
    }
    for field in SECTION_FIELDS:
        result[field] = doc.get(field)
    return result
