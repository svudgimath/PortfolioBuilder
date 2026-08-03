from datetime import datetime, timedelta, timezone

from django.conf import settings

from .exceptions import RateLimitDailyExceededException, RateLimitMinuteExceededException
from .models import GenerationLog

MINUTE_WINDOW_SECONDS = 60


def _start_of_day_utc() -> datetime:
    now = datetime.now(timezone.utc)
    return datetime(now.year, now.month, now.day, tzinfo=timezone.utc)


def _next_midnight_utc() -> datetime:
    return _start_of_day_utc() + timedelta(days=1)


def _count_last_minute(user_id) -> int:
    since = datetime.now(timezone.utc) - timedelta(seconds=MINUTE_WINDOW_SECONDS)
    return GenerationLog.objects.filter(user_id=user_id, created_at__gt=since).count()


def _count_successful_today(user_id) -> int:
    return GenerationLog.objects.filter(
        user_id=user_id,
        status=GenerationLog.Status.SUCCESS,
        created_at__gte=_start_of_day_utc(),
    ).count()


def check(user_id) -> None:
    """Raises if the caller is over either limit. Call before invoking the LLM."""
    last_minute = _count_last_minute(user_id)
    if last_minute >= settings.LLM_RATE_PER_MINUTE:
        raise RateLimitMinuteExceededException(MINUTE_WINDOW_SECONDS)

    today = _count_successful_today(user_id)
    if today >= settings.LLM_RATE_PER_DAY:
        raise RateLimitDailyExceededException(_next_midnight_utc())


def current_quota(user_id) -> dict:
    last_minute = _count_last_minute(user_id)
    today = _count_successful_today(user_id)

    remaining_minute = max(0, settings.LLM_RATE_PER_MINUTE - last_minute)
    remaining_today = max(0, settings.LLM_RATE_PER_DAY - today)
    return {
        "remainingToday": remaining_today,
        "remainingThisMinute": remaining_minute,
        "resetsAt": _next_midnight_utc().isoformat(),
    }
