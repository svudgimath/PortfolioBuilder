from rest_framework.response import Response
from rest_framework.views import APIView

from core.exceptions import BadRequestException

from .llm import resume_parser
from .repository import PortfolioRepository, serialize_document
from .resume_serializers import ApplyResumeSerializer

_portfolio_repository = PortfolioRepository()


class ParseResumeView(APIView):
    """POST /api/portfolio/parse-resume — multipart file upload, nothing saved
    server-side. Returns a prefill payload for the frontend to let the user pick
    which sections to apply."""

    def post(self, request):
        upload = request.FILES.get("file")
        if upload is None:
            raise BadRequestException("file is required")
        result = resume_parser.parse(upload.read(), upload.content_type)
        return Response(result)


class ApplyResumeView(APIView):
    """POST /api/portfolio/apply-resume — applies the user's selected sections
    from a parsed resume in one atomic overlay. Sections absent/null are left
    untouched."""

    def post(self, request):
        serializer = ApplyResumeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        saved = _portfolio_repository.apply_resume(str(request.user.id), serializer.validated_data)
        return Response(serialize_document(saved))
