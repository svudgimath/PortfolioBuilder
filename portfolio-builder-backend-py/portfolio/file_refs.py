from files.cloudinary_ref import CloudinaryRef
from files.cloudinary_ref import parse as parse_cloudinary_ref


def _add(refs: set, url) -> None:
    ref = parse_cloudinary_ref(url)
    if ref is not None:
        refs.add(ref)


def collect(doc: dict | None) -> set[CloudinaryRef]:
    """Collects the Cloudinary refs (publicId + resourceType) referenced by a
    portfolio document. Used by orphan cleanup to delete assets a save removed.
    Non-Cloudinary URLs (external links, dev paths) are silently ignored."""
    refs: set[CloudinaryRef] = set()
    if not doc:
        return refs

    meta = doc.get("meta")
    if meta:
        _add(refs, meta.get("profilePhoto"))
        _add(refs, meta.get("resume"))

    experience = doc.get("experience")
    if experience and experience.get("items"):
        for item in experience["items"]:
            _add(refs, item.get("companyLogo"))

    education = doc.get("education")
    if education and education.get("items"):
        for item in education["items"]:
            _add(refs, item.get("logo"))

    projects = doc.get("projects")
    if projects and projects.get("items"):
        for item in projects["items"]:
            _add(refs, item.get("thumbnail"))

    certifications = doc.get("certifications")
    if certifications and certifications.get("items"):
        for item in certifications["items"]:
            _add(refs, item.get("thumbnail"))

    testimonials = doc.get("testimonials")
    if testimonials and testimonials.get("items"):
        for item in testimonials["items"]:
            _add(refs, item.get("avatar"))

    return refs
