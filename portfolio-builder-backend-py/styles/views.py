from rest_framework.response import Response
from rest_framework.views import APIView

from . import rate_limit, service
from .llm import generation_service
from .serializers import GenerateStyleRequestSerializer


class StyleActiveView(APIView):
    def get(self, request):
        doc = service.get_active_style(str(request.user.id))
        if doc is None:
            return Response(status=204)
        return Response(service.serialize_style(doc))


class StyleQuotaView(APIView):
    def get(self, request):
        return Response(rate_limit.current_quota(request.user.id))


class StyleGenerateView(APIView):
    def post(self, request):
        serializer = GenerateStyleRequestSerializer(data=request.data or {})
        serializer.is_valid(raise_exception=True)
        prompt = serializer.validated_data.get("prompt")
        model = serializer.validated_data.get("model")
        result = generation_service.generate(str(request.user.id), prompt, model)
        return Response(result)


class StyleActivateView(APIView):
    def patch(self, request, style_id):
        doc = service.activate_style(str(request.user.id), style_id)
        return Response(service.serialize_style(doc))


class StyleDetailView(APIView):
    def delete(self, request, style_id):
        service.delete_style(str(request.user.id), style_id)
        return Response(status=204)


class StyleListCreateView(APIView):
    def get(self, request):
        docs = service.get_all_styles(str(request.user.id))
        return Response([service.serialize_style(d) for d in docs])

    def post(self, request):
        incoming = dict(request.data)
        saved = service.save_style(str(request.user.id), incoming)
        return Response(service.serialize_style(saved))
