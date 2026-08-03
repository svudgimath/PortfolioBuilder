import uuid
from unittest.mock import patch

from django.test import TestCase

from core.exceptions import BadRequestException
from core.mongo import get_db
from portfolio.repository import PortfolioRepository
from styles.exceptions import (
    RateLimitMinuteExceededException,
    StyleGenerationFailedException,
    StyleGenerationTimeoutException,
    StyleProviderBusyException,
)
from styles.llm import generation_service
from styles.models import GenerationLog

VALID_STYLE_PAYLOAD = {"theme": {"mode": "dark"}, "typography": {"headingFont": "Sora"}}


class GenerationServiceTestsBase(TestCase):
    def setUp(self):
        self.user_id = str(uuid.uuid4())

    def tearDown(self):
        get_db()["portfolios"].delete_many({"userId": self.user_id})
        get_db()["styles"].delete_many({"userId": self.user_id})


class RequiresExistingPortfolioTests(GenerationServiceTestsBase):
    def test_raises_bad_request_when_no_portfolio_exists(self):
        """Unlike GET /portfolio, generate does NOT auto-create a portfolio."""
        with self.assertRaises(BadRequestException):
            generation_service.generate(self.user_id, None, None)

    def test_does_not_log_an_attempt_when_portfolio_missing(self):
        try:
            generation_service.generate(self.user_id, None, None)
        except BadRequestException:
            pass
        self.assertEqual(GenerationLog.objects.filter(user_id=self.user_id).count(), 0)


class RateLimitEnforcedBeforeProviderCallTests(GenerationServiceTestsBase):
    def setUp(self):
        super().setUp()
        PortfolioRepository().get_or_create(self.user_id)

    @patch("styles.llm.generation_service.gemini_generator.generate")
    def test_rate_limited_call_never_reaches_provider(self, mock_generate):
        for _ in range(5):
            GenerationLog.objects.create(user_id=self.user_id, status=GenerationLog.Status.SUCCESS)

        with self.assertRaises(RateLimitMinuteExceededException):
            generation_service.generate(self.user_id, None, None)

        mock_generate.assert_not_called()

    @patch("styles.llm.generation_service.gemini_generator.generate")
    def test_rejected_call_is_not_logged(self, mock_generate):
        for _ in range(5):
            GenerationLog.objects.create(user_id=self.user_id, status=GenerationLog.Status.SUCCESS)
        count_before = GenerationLog.objects.filter(user_id=self.user_id).count()

        try:
            generation_service.generate(self.user_id, None, None)
        except RateLimitMinuteExceededException:
            pass

        self.assertEqual(GenerationLog.objects.filter(user_id=self.user_id).count(), count_before)


class SuccessPathTests(GenerationServiceTestsBase):
    def setUp(self):
        super().setUp()
        PortfolioRepository().get_or_create(self.user_id)

    @patch("styles.llm.generation_service.gemini_generator.generate")
    def test_success_saves_style_logs_success_and_returns_quota(self, mock_generate):
        mock_generate.return_value = dict(VALID_STYLE_PAYLOAD)

        result = generation_service.generate(self.user_id, "warm editorial", None)

        self.assertEqual(result["style"]["theme"]["mode"], "dark")
        self.assertEqual(result["style"]["prompt"], "warm editorial")
        self.assertTrue(result["style"]["isActive"])
        self.assertIn("quota", result)
        self.assertEqual(result["quota"]["remainingToday"], 4)

        log = GenerationLog.objects.get(user_id=self.user_id)
        self.assertEqual(log.status, GenerationLog.Status.SUCCESS)

    @patch("styles.llm.generation_service.gemini_generator.generate")
    @patch("styles.llm.generation_service.random.choice")
    def test_no_prompt_uses_random_curated_direction(self, mock_choice, mock_generate):
        mock_choice.return_value = generation_service.STYLE_DIRECTIONS[0]
        mock_generate.return_value = dict(VALID_STYLE_PAYLOAD)

        result = generation_service.generate(self.user_id, None, None)

        mock_choice.assert_called_once_with(generation_service.STYLE_DIRECTIONS)
        self.assertEqual(result["style"]["prompt"], generation_service.STYLE_DIRECTIONS[0])

    @patch("styles.llm.generation_service.gemini_generator.generate")
    def test_blank_prompt_falls_back_to_random_direction(self, mock_generate):
        mock_generate.return_value = dict(VALID_STYLE_PAYLOAD)
        result = generation_service.generate(self.user_id, "   ", None)
        self.assertIn(result["style"]["prompt"], generation_service.STYLE_DIRECTIONS)


class FailurePathLoggingTests(GenerationServiceTestsBase):
    def setUp(self):
        super().setUp()
        PortfolioRepository().get_or_create(self.user_id)

    @patch("styles.llm.generation_service.gemini_generator.generate")
    def test_timeout_logs_failed_timeout_and_reraises(self, mock_generate):
        mock_generate.side_effect = StyleGenerationTimeoutException()
        with self.assertRaises(StyleGenerationTimeoutException):
            generation_service.generate(self.user_id, None, None)
        log = GenerationLog.objects.get(user_id=self.user_id)
        self.assertEqual(log.status, GenerationLog.Status.FAILED_TIMEOUT)

    @patch("styles.llm.generation_service.gemini_generator.generate")
    def test_generation_failed_logs_failed_validation_and_reraises(self, mock_generate):
        mock_generate.side_effect = StyleGenerationFailedException()
        with self.assertRaises(StyleGenerationFailedException):
            generation_service.generate(self.user_id, None, None)
        log = GenerationLog.objects.get(user_id=self.user_id)
        self.assertEqual(log.status, GenerationLog.Status.FAILED_VALIDATION)

    @patch("styles.llm.generation_service.gemini_generator.generate")
    def test_provider_busy_logs_failed_provider_and_reraises(self, mock_generate):
        mock_generate.side_effect = StyleProviderBusyException()
        with self.assertRaises(StyleProviderBusyException):
            generation_service.generate(self.user_id, None, None)
        log = GenerationLog.objects.get(user_id=self.user_id)
        self.assertEqual(log.status, GenerationLog.Status.FAILED_PROVIDER)

    @patch("styles.llm.generation_service.gemini_generator.generate")
    def test_unexpected_exception_wrapped_as_generation_failed(self, mock_generate):
        mock_generate.side_effect = RuntimeError("something broke")
        with self.assertRaises(StyleGenerationFailedException):
            generation_service.generate(self.user_id, None, None)
        log = GenerationLog.objects.get(user_id=self.user_id)
        self.assertEqual(log.status, GenerationLog.Status.FAILED_PROVIDER)

    @patch("styles.llm.generation_service.gemini_generator.generate")
    def test_no_style_persisted_on_failure(self, mock_generate):
        mock_generate.side_effect = StyleGenerationFailedException()
        try:
            generation_service.generate(self.user_id, None, None)
        except StyleGenerationFailedException:
            pass
        from styles.service import get_all_styles

        self.assertEqual(get_all_styles(self.user_id), [])
