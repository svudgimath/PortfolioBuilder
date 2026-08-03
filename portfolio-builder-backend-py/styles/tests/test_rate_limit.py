import uuid
from datetime import datetime, timedelta, timezone

from django.test import TestCase

from styles import rate_limit
from styles.exceptions import RateLimitDailyExceededException, RateLimitMinuteExceededException
from styles.models import GenerationLog


class RateLimitTests(TestCase):
    def setUp(self):
        self.user_id = uuid.uuid4()

    def _log(self, status, minutes_ago=0):
        entry = GenerationLog.objects.create(user_id=self.user_id, status=status, model="gemini-2.5-flash")
        if minutes_ago:
            entry.created_at = datetime.now(timezone.utc) - timedelta(minutes=minutes_ago)
            entry.save()
        return entry

    def test_check_passes_when_under_both_limits(self):
        self._log(GenerationLog.Status.SUCCESS)
        rate_limit.check(self.user_id)  # should not raise

    def test_minute_limit_counts_all_statuses(self):
        for status in [
            GenerationLog.Status.SUCCESS,
            GenerationLog.Status.FAILED_PROVIDER,
            GenerationLog.Status.FAILED_TIMEOUT,
            GenerationLog.Status.FAILED_VALIDATION,
            GenerationLog.Status.SUCCESS,
        ]:
            self._log(status)
        with self.assertRaises(RateLimitMinuteExceededException) as ctx:
            rate_limit.check(self.user_id)
        self.assertEqual(ctx.exception.retry_after_seconds, 60)

    def test_minute_limit_ignores_attempts_older_than_60s(self):
        # FAILED_PROVIDER (not SUCCESS) so this doesn't also trip the daily cap —
        # isolates the minute-window behavior being tested here.
        for _ in range(5):
            self._log(GenerationLog.Status.FAILED_PROVIDER, minutes_ago=2)
        rate_limit.check(self.user_id)  # should not raise — all outside the 60s window

    def test_daily_limit_only_counts_successes(self):
        # minutes_ago=2 (not e.g. 90) to stay safely within "today" in UTC terms —
        # a large offset can spuriously cross the UTC midnight boundary.
        for _ in range(5):
            self._log(GenerationLog.Status.FAILED_PROVIDER, minutes_ago=2)
        rate_limit.check(self.user_id)  # 5 failures today should not trip the daily cap

    def test_daily_limit_trips_on_five_successes(self):
        for _ in range(5):
            self._log(GenerationLog.Status.SUCCESS, minutes_ago=2)
        with self.assertRaises(RateLimitDailyExceededException):
            rate_limit.check(self.user_id)

    def test_rate_limits_are_per_user(self):
        other_user = uuid.uuid4()
        for _ in range(5):
            GenerationLog.objects.create(user_id=other_user, status=GenerationLog.Status.SUCCESS)
        rate_limit.check(self.user_id)  # unaffected by other_user's usage

    def test_current_quota_reflects_usage(self):
        self._log(GenerationLog.Status.SUCCESS)
        self._log(GenerationLog.Status.FAILED_TIMEOUT)
        quota = rate_limit.current_quota(self.user_id)
        self.assertEqual(quota["remainingThisMinute"], 3)  # 5 - 2 attempts
        self.assertEqual(quota["remainingToday"], 4)  # 5 - 1 success
        self.assertIn("resetsAt", quota)

    def test_current_quota_never_goes_negative(self):
        for _ in range(8):
            self._log(GenerationLog.Status.SUCCESS)
        quota = rate_limit.current_quota(self.user_id)
        self.assertEqual(quota["remainingThisMinute"], 0)
        self.assertEqual(quota["remainingToday"], 0)
