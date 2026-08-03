from rest_framework import serializers

from .sections import (
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
    TestimonialsSerializer,
)

SECTION_SERIALIZERS = {
    "meta": MetaSerializer,
    "hero": HeroSerializer,
    "about": AboutSerializer,
    "skills": SkillsSerializer,
    "experience": ExperienceSerializer,
    "education": EducationSerializer,
    "projects": ProjectsSerializer,
    "certifications": CertificationsSerializer,
    "research": ResearchSerializer,
    "testimonials": TestimonialsSerializer,
    "contact": ContactSerializer,
    "footer": FooterSerializer,
}


class PortfolioDocumentSerializer(serializers.Serializer):
    meta = MetaSerializer(required=False, allow_null=True)
    hero = HeroSerializer(required=False, allow_null=True)
    about = AboutSerializer(required=False, allow_null=True)
    skills = SkillsSerializer(required=False, allow_null=True)
    experience = ExperienceSerializer(required=False, allow_null=True)
    education = EducationSerializer(required=False, allow_null=True)
    projects = ProjectsSerializer(required=False, allow_null=True)
    certifications = CertificationsSerializer(required=False, allow_null=True)
    research = ResearchSerializer(required=False, allow_null=True)
    testimonials = TestimonialsSerializer(required=False, allow_null=True)
    contact = ContactSerializer(required=False, allow_null=True)
    footer = FooterSerializer(required=False, allow_null=True)
