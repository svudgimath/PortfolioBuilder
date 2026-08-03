from rest_framework.response import Response
from rest_framework.views import APIView

from portfolio.repository import SECTION_FIELDS, PortfolioRepository
from publish.models import PublishedPortfolio

_portfolio_repository = PortfolioRepository()


class DashboardView(APIView):
    def get(self, request):
        user = request.user
        portfolio_doc = _portfolio_repository.get_or_create(str(user.id))
        portfolio_updated_at = portfolio_doc.get("updatedAt")

        completed_sections = [field for field in SECTION_FIELDS if portfolio_doc.get(field)]

        published = PublishedPortfolio.objects.filter(user=user).first()

        return Response(
            {
                "user": {"name": user.name, "email": user.email},
                "portfolio": {
                    "updatedAt": portfolio_updated_at.isoformat() if portfolio_updated_at else None,
                    "completedSections": completed_sections,
                    "totalSections": len(SECTION_FIELDS),
                },
                "publish": _build_publish_info(portfolio_updated_at, published),
            }
        )


def _build_publish_info(portfolio_updated_at, published: PublishedPortfolio | None) -> dict:
    if published is None:
        return {
            "published": False,
            "repoExists": False,
            "pagesUrl": None,
            "lastPublishedAt": None,
            "hasUnpublishedChanges": False,
        }

    has_changes = False
    if portfolio_updated_at is not None and published.last_published_at is not None:
        has_changes = portfolio_updated_at > published.last_published_at

    return {
        "published": True,
        "repoExists": True,
        "pagesUrl": published.pages_url,
        "lastPublishedAt": published.last_published_at.isoformat() if published.last_published_at else None,
        "hasUnpublishedChanges": has_changes,
    }
