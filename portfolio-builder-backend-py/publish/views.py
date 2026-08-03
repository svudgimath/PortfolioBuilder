from rest_framework.response import Response
from rest_framework.views import APIView

from . import service, template_service
from .serializers import PublishRequestSerializer, ValidateRepoRequestSerializer


class PublishStatusView(APIView):
    def get(self, request):
        return Response(service.get_publish_status(str(request.user.id)))


class RepoSuggestView(APIView):
    def get(self, request):
        return Response(service.suggest_repo_name(str(request.user.id)))


class ValidateRepoView(APIView):
    def post(self, request):
        serializer = ValidateRepoRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = service.validate_repo_name(str(request.user.id), serializer.validated_data["repoName"])
        return Response(result)


class PublishView(APIView):
    def post(self, request):
        serializer = PublishRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        published = service.publish(
            str(request.user.id),
            serializer.validated_data["repoName"],
            serializer.validated_data["mode"],
        )
        return Response(
            {
                "repoName": published.repo_name,
                "repoUrl": published.repo_url,
                "pagesUrl": published.pages_url,
                "lastPublishedAt": published.last_published_at.isoformat()
                if published.last_published_at
                else None,
            }
        )


class TemplateListView(APIView):
    def get(self, request):
        templates = template_service.get_active_templates()
        return Response([_serialize_template(t) for t in templates])


def _serialize_template(t):
    return {
        "id": str(t.id),
        "slug": t.slug,
        "name": t.name,
        "description": t.description,
        "distPath": t.dist_path,
        "dataPath": t.data_path,
        "portfolioFilename": t.portfolio_filename,
        "styleFilename": t.style_filename,
        "isActive": t.is_active,
        "createdAt": t.created_at.isoformat(),
        "updatedAt": t.updated_at.isoformat(),
    }
