from app.models import IncidentStatus, can_transition


def test_normal_lifecycle_is_allowed():
    assert can_transition(IncidentStatus.PENDING, IncidentStatus.ASSIGNED)
    assert can_transition(IncidentStatus.ASSIGNED, IncidentStatus.EN_ROUTE)
    assert can_transition(IncidentStatus.EN_ROUTE, IncidentStatus.RESOLVED)


def test_steps_cannot_be_skipped():
    assert not can_transition(IncidentStatus.PENDING, IncidentStatus.RESOLVED)
    assert not can_transition(IncidentStatus.PENDING, IncidentStatus.EN_ROUTE)


def test_finished_incidents_cannot_reopen():
    for finished in (IncidentStatus.RESOLVED, IncidentStatus.CANCELLED):
        for status in IncidentStatus:
            assert not can_transition(finished, status)