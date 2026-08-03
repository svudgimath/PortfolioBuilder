from django.urls import path

from .resume_views import ApplyResumeView, ParseResumeView
from .serializers.document import SECTION_SERIALIZERS
from .views import PortfolioSectionView, PortfolioView

urlpatterns = [
    path("portfolio", PortfolioView.as_view(), name="portfolio"),
    path("portfolio/parse-resume", ParseResumeView.as_view(), name="portfolio-parse-resume"),
    path("portfolio/apply-resume", ApplyResumeView.as_view(), name="portfolio-apply-resume"),
]

for _section_name, _serializer_cls in SECTION_SERIALIZERS.items():
    urlpatterns.append(
        path(
            f"portfolio/{_section_name}",
            PortfolioSectionView.as_view(section=_section_name, serializer_class=_serializer_cls),
            name=f"portfolio-{_section_name}",
        )
    )
