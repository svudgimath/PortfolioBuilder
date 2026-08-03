from rest_framework import serializers

from .serializers.sections import (
    AboutSerializer,
    CertificationsSerializer,
    ContactSerializer,
    EducationSerializer,
    ExperienceSerializer,
    FooterSerializer,
    HeroSerializer,
    MetaSerializer,
    ProjectsSerializer,
    ResearchSerializer,
    SkillsSerializer,
)


class ApplyResumeSerializer(serializers.Serializer):
    """Doubles as the parse-resume response shape and the apply-resume request
    body — matches ResumeParseResult (11 sections; no testimonials)."""

    meta = MetaSerializer(required=False, allow_null=True)
    hero = HeroSerializer(required=False, allow_null=True)
    about = AboutSerializer(required=False, allow_null=True)
    skills = SkillsSerializer(required=False, allow_null=True)
    experience = ExperienceSerializer(required=False, allow_null=True)
    education = EducationSerializer(required=False, allow_null=True)
    projects = ProjectsSerializer(required=False, allow_null=True)
    certifications = CertificationsSerializer(required=False, allow_null=True)
    research = ResearchSerializer(required=False, allow_null=True)
    contact = ContactSerializer(required=False, allow_null=True)
    footer = FooterSerializer(required=False, allow_null=True)
