from rest_framework import serializers

from .common import (
    CtaButtonsSerializer,
    FlexibleStringListField,
    HighlightSerializer,
    SkillGroupSerializer,
    SocialSerializer,
    WhatIDoSerializer,
    optional_bool,
    optional_char,
    required_char,
    tag_list,
)

# ── Meta ─────────────────────────────────────────────────────────────────────


class MetaSerializer(serializers.Serializer):
    displayName = required_char(200, "Display name is required", "Display name must be at most 200 characters")
    title = optional_char(200, "Title must be at most 200 characters")
    shortIntro = optional_char(280, "Short intro must be at most 280 characters")
    location = optional_char(200, "Location must be at most 200 characters")
    profilePhoto = optional_char(1000, "Profile photo reference is too long")
    openToWork = optional_bool()
    resume = optional_char(1000, "Resume reference is too long")
    website = optional_char(1000, "Website URL is too long")


# ── Hero ─────────────────────────────────────────────────────────────────────


class HeroSerializer(serializers.Serializer):
    greeting = optional_char(200, "Greeting must be at most 200 characters")
    showProfilePhoto = optional_bool()
    cta = CtaButtonsSerializer(required=False, allow_null=True)
    socials = SocialSerializer(many=True, required=False, allow_null=True)


# ── About ────────────────────────────────────────────────────────────────────


class AboutSerializer(serializers.Serializer):
    sectionLabel = optional_char(200, "Section label must be at most 200 characters")
    sectionTitle = optional_char(200, "Section title must be at most 200 characters")
    description = tag_list(5000, "Each paragraph must be at most 5000 characters")
    whatIDo = WhatIDoSerializer(many=True, required=False, allow_null=True)
    highlights = HighlightSerializer(many=True, required=False, allow_null=True)
    interests = tag_list(100, "Each interest must be at most 100 characters")


# ── Skills ───────────────────────────────────────────────────────────────────


class SkillsSerializer(serializers.Serializer):
    sectionLabel = optional_char(200, "Section label must be at most 200 characters")
    sectionTitle = optional_char(200, "Section title must be at most 200 characters")
    categorized = optional_bool()
    items = SkillGroupSerializer(many=True, required=False, allow_null=True)


# ── Experience ───────────────────────────────────────────────────────────────


class ExperienceItemSerializer(serializers.Serializer):
    id = optional_char(100, "Item id is too long")
    company = optional_char(200, "Company must be at most 200 characters")
    role = optional_char(200, "Role must be at most 200 characters")
    startDate = optional_char(100, "Start date must be at most 100 characters")
    endDate = optional_char(100, "End date must be at most 100 characters")
    current = optional_bool()
    location = optional_char(200, "Location must be at most 200 characters")
    description = FlexibleStringListField(
        child=serializers.CharField(
            max_length=2000,
            allow_blank=True,
            error_messages={"max_length": "Each description point must be at most 2000 characters"},
        ),
        required=False,
        allow_null=True,
    )
    tags = tag_list(100, "Each tag must be at most 100 characters")
    companyLogo = optional_char(1000, "Company logo reference is too long")
    companyUrl = optional_char(1000, "Company URL is too long")


class ExperienceSerializer(serializers.Serializer):
    sectionLabel = optional_char(200, "Section label must be at most 200 characters")
    sectionTitle = optional_char(200, "Section title must be at most 200 characters")
    items = ExperienceItemSerializer(many=True, required=False, allow_null=True)


# ── Education ────────────────────────────────────────────────────────────────


class EducationItemSerializer(serializers.Serializer):
    id = optional_char(100, "Item id is too long")
    institution = required_char(200, "Institution is required", "Institution must be at most 200 characters")
    degree = required_char(200, "Degree is required", "Degree must be at most 200 characters")
    fieldOfStudy = optional_char(200, "Field of study must be at most 200 characters")
    startDate = optional_char(100, "Start date must be at most 100 characters")
    endDate = optional_char(100, "End date must be at most 100 characters")
    location = optional_char(200, "Location must be at most 200 characters")
    grade = optional_char(200, "Grade must be at most 200 characters")
    description = FlexibleStringListField(
        child=serializers.CharField(
            max_length=2000,
            allow_blank=True,
            error_messages={"max_length": "Each description point must be at most 2000 characters"},
        ),
        required=False,
        allow_null=True,
    )
    tags = tag_list(100, "Each tag must be at most 100 characters")
    logo = optional_char(1000, "Logo reference is too long")


class EducationSerializer(serializers.Serializer):
    sectionLabel = optional_char(200, "Section label must be at most 200 characters")
    sectionTitle = optional_char(200, "Section title must be at most 200 characters")
    items = EducationItemSerializer(many=True, required=False, allow_null=True)


# ── Projects ─────────────────────────────────────────────────────────────────


class ProjectItemSerializer(serializers.Serializer):
    id = optional_char(100, "Item id is too long")
    projectName = required_char(200, "Project name is required", "Project name must be at most 200 characters")
    description = required_char(5000, "Project description is required", "Description must be at most 5000 characters")
    tags = tag_list(100, "Each tag must be at most 100 characters")
    liveUrl = optional_char(1000, "Live URL is too long")
    repoUrl = optional_char(1000, "Repo URL is too long")
    thumbnail = optional_char(1000, "Thumbnail reference is too long")
    startDate = optional_char(100, "Start date must be at most 100 characters")
    endDate = optional_char(100, "End date must be at most 100 characters")
    featured = optional_bool()


class ProjectsSerializer(serializers.Serializer):
    sectionLabel = optional_char(200, "Section label must be at most 200 characters")
    sectionTitle = optional_char(200, "Section title must be at most 200 characters")
    items = ProjectItemSerializer(many=True, required=False, allow_null=True)


# ── Certifications ───────────────────────────────────────────────────────────


class CertificationItemSerializer(serializers.Serializer):
    id = optional_char(100, "Item id is too long")
    name = required_char(200, "Certification name is required", "Name must be at most 200 characters")
    description = optional_char(5000, "Description must be at most 5000 characters")
    issuer = required_char(200, "Issuer is required", "Issuer must be at most 200 characters")
    dateIssued = optional_char(100, "Date issued must be at most 100 characters")
    expiryDate = optional_char(100, "Expiry date must be at most 100 characters")
    credentialUrl = optional_char(1000, "Credential URL is too long")
    thumbnail = optional_char(1000, "Thumbnail reference is too long")
    tags = tag_list(100, "Each tag must be at most 100 characters")


class CertificationsSerializer(serializers.Serializer):
    sectionLabel = optional_char(200, "Section label must be at most 200 characters")
    sectionTitle = optional_char(200, "Section title must be at most 200 characters")
    items = CertificationItemSerializer(many=True, required=False, allow_null=True)


# ── Research ─────────────────────────────────────────────────────────────────


class ResearchItemSerializer(serializers.Serializer):
    id = optional_char(100, "Item id is too long")
    title = required_char(300, "Title is required", "Title must be at most 300 characters")
    authors = tag_list(200, "Each author must be at most 200 characters")
    publishedIn = optional_char(200, "Published-in must be at most 200 characters")
    date = optional_char(100, "Date must be at most 100 characters")
    description = optional_char(5000, "Description must be at most 5000 characters")
    tags = tag_list(100, "Each tag must be at most 100 characters")
    url = optional_char(1000, "URL is too long")
    doi = optional_char(200, "DOI must be at most 200 characters")


class ResearchSerializer(serializers.Serializer):
    sectionLabel = optional_char(200, "Section label must be at most 200 characters")
    sectionTitle = optional_char(200, "Section title must be at most 200 characters")
    items = ResearchItemSerializer(many=True, required=False, allow_null=True)


# ── Testimonials ─────────────────────────────────────────────────────────────


class TestimonialItemSerializer(serializers.Serializer):
    id = optional_char(100, "Item id is too long")
    name = required_char(200, "Name is required", "Name must be at most 200 characters")
    role = optional_char(200, "Role must be at most 200 characters")
    company = optional_char(200, "Company must be at most 200 characters")
    message = required_char(5000, "Message is required", "Message must be at most 5000 characters")
    avatar = optional_char(1000, "Avatar reference is too long")
    linkedinUrl = optional_char(1000, "LinkedIn URL is too long")


class TestimonialsSerializer(serializers.Serializer):
    sectionLabel = optional_char(200, "Section label must be at most 200 characters")
    sectionTitle = optional_char(200, "Section title must be at most 200 characters")
    items = TestimonialItemSerializer(many=True, required=False, allow_null=True)


# ── Contact ──────────────────────────────────────────────────────────────────


class ContactSerializer(serializers.Serializer):
    sectionLabel = optional_char(200, "Section label must be at most 200 characters")
    heading = optional_char(200, "Heading must be at most 200 characters")
    tagline = optional_char(500, "Tagline must be at most 500 characters")
    email = serializers.EmailField(
        required=False,
        allow_blank=True,
        allow_null=True,
        max_length=255,
        error_messages={
            "invalid": "Invalid email format",
            "max_length": "Email must be at most 255 characters",
        },
    )
    phone = optional_char(50, "Phone must be at most 50 characters")
    socials = SocialSerializer(many=True, required=False, allow_null=True)


# ── Footer ───────────────────────────────────────────────────────────────────


class FooterSerializer(serializers.Serializer):
    customNote = optional_char(500, "Closing note must be at most 500 characters")
