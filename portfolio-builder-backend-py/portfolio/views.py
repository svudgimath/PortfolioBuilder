from rest_framework.response import Response
from rest_framework.views import APIView

from .repository import PortfolioRepository, serialize_document
from .serializers.document import PortfolioDocumentSerializer

repository = PortfolioRepository()


class PortfolioView(APIView):
    def get(self, request):
        doc = repository.get_or_create(str(request.user.id))
        return Response(serialize_document(doc))

    def put(self, request):
        serializer = PortfolioDocumentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        doc = repository.update_full(str(request.user.id), serializer.validated_data)
        return Response(serialize_document(doc))


class PortfolioSectionView(APIView):
    """Configured per-URL via .as_view(section=..., serializer_class=...) — mirrors
    the Java controller's 12 statically-typed @PutMapping methods rather than a
    single dynamic {section} path variable."""

    section = None
    serializer_class = None

    def put(self, request):
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)
        doc = repository.update_section(str(request.user.id), self.section, serializer.validated_data)
        return Response(serialize_document(doc))
