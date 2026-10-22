from datetime import datetime, timedelta, timezone

import pytest

from app.priority import (
    IncidentSnapshot,
    priority_score,
    rank_incidents,
    resource_score,
    waiting_score,
)

NOW = datetime(2026, 10, 14, 12, 0, tzinfo=timezone.utc)


def test_waiting_score_grows_every_five_minutes():
    assert waiting_score(NOW, NOW) == 0
    assert waiting_score(NOW - timedelta(minutes=4), NOW) == 0
    assert waiting_score(NOW - timedelta(minutes=5), NOW) == 1
    assert waiting_score(NOW - timedelta(minutes=17), NOW) == 3


def test_waiting_score_is_capped():
    assert waiting_score(NOW - timedelta(hours=5), NOW) == 5


def test_waiting_score_never_negative():
    assert waiting_score(NOW + timedelta(minutes=10), NOW) == 0


def test_resource_score_uses_most_critical_resource():
    assert resource_score([2, 5, 3]) == 5
    assert resource_score([]) == 1


def test_priority_formula():
    assert priority_score(5, 5, 5) == 50
    assert priority_score(1, 0, 1) == 8
    assert priority_score(3, 2, 4) == 31


def test_invalid_scores_are_rejected():
    with pytest.raises(ValueError):
        priority_score(0, 0, 1)
    with pytest.raises(ValueError):
        priority_score(6, 0, 1)
    with pytest.raises(ValueError):
        priority_score(3, 0, 9)


def test_ranking_orders_by_priority():
    low_old = IncidentSnapshot(1, 3, 3, NOW - timedelta(minutes=10))
    high_new = IncidentSnapshot(2, 5, 5, NOW)
    ranked = rank_incidents([low_old, high_new], NOW)
    assert [inc.id for inc, _ in ranked] == [2, 1]
    assert ranked[0][1] == 40
    assert ranked[1][1] == 28


def test_tie_is_broken_by_earliest_creation():
    newer = IncidentSnapshot(10, 3, 3, NOW - timedelta(minutes=6))
    older = IncidentSnapshot(11, 3, 3, NOW - timedelta(minutes=9))
    ranked = rank_incidents([newer, older], NOW)
    assert [inc.id for inc, _ in ranked] == [11, 10]
    assert ranked[0][1] == ranked[1][1] == 26


def test_ranking_is_deterministic():
    items = [IncidentSnapshot(i, 3, 3, NOW) for i in range(1, 6)]
    first = rank_incidents(items, NOW)
    second = rank_incidents(list(reversed(items)), NOW)
    assert [inc.id for inc, _ in first] == [inc.id for inc, _ in second]