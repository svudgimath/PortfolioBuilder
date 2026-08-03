class GeminiRateLimitException(Exception):
    """Internal marker for a 429 from the Gemini provider — drives the retry loop.
    Never surfaced to clients directly; recovered into StyleProviderBusyException."""


class StyleProviderBusyException(Exception):
    def __init__(self):
        super().__init__("Style generation provider is busy")


class StyleGenerationTimeoutException(Exception):
    def __init__(self):
        super().__init__("Style generation timed out")


class StyleGenerationFailedException(Exception):
    def __init__(self):
        super().__init__("Could not generate a valid style")


class RateLimitMinuteExceededException(Exception):
    def __init__(self, retry_after_seconds: int):
        self.retry_after_seconds = retry_after_seconds
        super().__init__("Per-minute generation limit exceeded")


class RateLimitDailyExceededException(Exception):
    def __init__(self, resets_at):
        self.resets_at = resets_at
        super().__init__("Daily generation limit exceeded")
