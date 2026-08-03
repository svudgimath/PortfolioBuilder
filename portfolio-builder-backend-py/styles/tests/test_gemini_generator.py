import json
from unittest.mock import MagicMock, patch

import httpx
from django.test import SimpleTestCase
from google.genai import errors

from styles.exceptions import (
    GeminiRateLimitException,
    StyleGenerationFailedException,
    StyleGenerationTimeoutException,
)
from styles.llm import gemini_generator

VALID_STYLE_JSON = json.dumps({"theme": {"mode": "dark"}, "typography": {"headingFont": "Sora"}})


def _api_error(code):
    err = errors.APIError.__new__(errors.APIError)
    err.code = code
    err.message = "boom"
    err.status = "ERROR"
    err.details = {}
    return err


def _mock_client(text_sequence):
    """Returns a MagicMock client whose generate_content yields the given texts in order."""
    client = MagicMock()
    responses = []
    for item in text_sequence:
        if isinstance(item, Exception):
            responses.append(item)
        else:
            resp = MagicMock()
            resp.text = item
            responses.append(resp)

    def side_effect(*args, **kwargs):
        result = responses.pop(0)
        if isinstance(result, Exception):
            raise result
        return result

    client.models.generate_content.side_effect = side_effect
    return client


class GenerateHappyPathTests(SimpleTestCase):
    @patch("styles.llm.gemini_generator._get_client")
    def test_valid_json_on_first_attempt(self, mock_get_client):
        mock_get_client.return_value = _mock_client([VALID_STYLE_JSON])
        style = gemini_generator.generate('{"meta":{}}', "dark editorial")
        self.assertEqual(style["theme"]["mode"], "dark")
        self.assertEqual(mock_get_client.return_value.models.generate_content.call_count, 1)

    @patch("styles.llm.gemini_generator._get_client")
    def test_malformed_json_then_valid_on_strict_retry(self, mock_get_client):
        mock_get_client.return_value = _mock_client(["not json", VALID_STYLE_JSON])
        style = gemini_generator.generate('{"meta":{}}', "dark editorial")
        self.assertEqual(style["theme"]["mode"], "dark")
        self.assertEqual(mock_get_client.return_value.models.generate_content.call_count, 2)

    @patch("styles.llm.gemini_generator._get_client")
    def test_malformed_json_both_attempts_raises_generation_failed(self, mock_get_client):
        mock_get_client.return_value = _mock_client(["not json", "still not json"])
        with self.assertRaises(StyleGenerationFailedException):
            gemini_generator.generate('{"meta":{}}', "dark editorial")

    @patch("styles.llm.gemini_generator._get_client")
    def test_blank_response_raises_generation_failed(self, mock_get_client):
        mock_get_client.return_value = _mock_client(["", ""])
        with self.assertRaises(StyleGenerationFailedException):
            gemini_generator.generate('{"meta":{}}', "dark editorial")


class ExceptionMappingTests(SimpleTestCase):
    @patch("styles.llm.gemini_generator._get_client")
    def test_429_raises_rate_limit_after_exhausting_retries(self, mock_get_client):
        mock_get_client.return_value = _mock_client([_api_error(429)] * 10)
        with patch("styles.llm.gemini_generator.time.sleep"):
            with self.assertRaises(GeminiRateLimitException):
                gemini_generator.generate('{"meta":{}}', "dark editorial")
        # 1 initial attempt + 2 retries = 3 calls for the first prompt variant
        self.assertEqual(mock_get_client.return_value.models.generate_content.call_count, 3)

    @patch("styles.llm.gemini_generator._get_client")
    def test_429_then_success_recovers_without_exhausting(self, mock_get_client):
        mock_get_client.return_value = _mock_client([_api_error(429), VALID_STYLE_JSON])
        with patch("styles.llm.gemini_generator.time.sleep") as mock_sleep:
            style = gemini_generator.generate('{"meta":{}}', "dark editorial")
        self.assertEqual(style["theme"]["mode"], "dark")
        mock_sleep.assert_called_once_with(1.0)

    @patch("styles.llm.gemini_generator._get_client")
    def test_non_429_api_error_raises_generation_failed(self, mock_get_client):
        mock_get_client.return_value = _mock_client([_api_error(500)])
        with self.assertRaises(StyleGenerationFailedException):
            gemini_generator.generate('{"meta":{}}', "dark editorial")

    @patch("styles.llm.gemini_generator._get_client")
    def test_timeout_raises_generation_timeout(self, mock_get_client):
        mock_get_client.return_value = _mock_client([httpx.TimeoutException("timed out")])
        with self.assertRaises(StyleGenerationTimeoutException):
            gemini_generator.generate('{"meta":{}}', "dark editorial")


class PromptBuildingTests(SimpleTestCase):
    def test_strict_prompt_appends_instruction(self):
        prompt = gemini_generator._build_user_prompt('{"meta":{}}', "dark", strict=True)
        self.assertIn("ONLY valid minified JSON", prompt)

    def test_non_strict_prompt_omits_instruction(self):
        prompt = gemini_generator._build_user_prompt('{"meta":{}}', "dark", strict=False)
        self.assertNotIn("ONLY valid minified JSON", prompt)

    def test_prompt_includes_direction_and_portfolio(self):
        prompt = gemini_generator._build_user_prompt('{"meta":{"displayName":"Jane"}}', "warm editorial", strict=False)
        self.assertIn("warm editorial", prompt)
        self.assertIn("Jane", prompt)
