from enum import Enum


class IncidentStatus(str, Enum):
    PENDING = "PENDING"
    ASSIGNED = "ASSIGNED"
    EN_ROUTE = "EN_ROUTE"
    RESOLVED = "RESOLVED"
    CANCELLED = "CANCELLED"


class VolunteerStatus(str, Enum):
    FREE = "FREE"
    BUSY = "BUSY"
    OFF_DUTY = "OFF_DUTY"


class IncidentType(str, Enum):
    MEDICAL = "MEDICAL"
    RESCUE = "RESCUE"
    FOOD_WATER = "FOOD_WATER"
    SHELTER = "SHELTER"
    OTHER = "OTHER"


ZONES = [
    "Main Gate",
    "Academic Block",
    "Hostel Block A",
    "Hostel Block B",
    "Library",
    "Mess Hall",
    "Sports Ground",
    "Medical Centre",
]

ACTIVE_STATUSES = (IncidentStatus.ASSIGNED, IncidentStatus.EN_ROUTE)

TRANSITIONS = {
    IncidentStatus.PENDING: {IncidentStatus.ASSIGNED, IncidentStatus.CANCELLED},
    IncidentStatus.ASSIGNED: {
        IncidentStatus.EN_ROUTE,
        IncidentStatus.PENDING,
        IncidentStatus.CANCELLED,
    },
    IncidentStatus.EN_ROUTE: {IncidentStatus.RESOLVED, IncidentStatus.CANCELLED},
    IncidentStatus.RESOLVED: set(),
    IncidentStatus.CANCELLED: set(),
}


def can_transition(current: IncidentStatus, new: IncidentStatus) -> bool:
    return new in TRANSITIONS[current]