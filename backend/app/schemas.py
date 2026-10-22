import re

from pydantic import BaseModel, Field, field_validator

from app.models import IncidentStatus, IncidentType, VolunteerStatus, ZONES

PHONE_PATTERN = re.compile(r"^\+?\d{10,13}$")


class ResourceRequest(BaseModel):
    resource_id: int = Field(ge=1)
    quantity: int = Field(ge=1, le=100)


class IncidentCreate(BaseModel):
    citizen_name: str = Field(min_length=1, max_length=60)
    phone: str | None = None
    type: IncidentType
    urgency: int = Field(ge=1, le=5)
    zone: str
    people_count: int = Field(default=1, ge=1, le=500)
    description: str = Field(default="", max_length=300)
    resources: list[ResourceRequest] = Field(default_factory=list, max_length=6)

    @field_validator("citizen_name")
    @classmethod
    def name_not_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Name cannot be blank")
        return value

    @field_validator("description")
    @classmethod
    def clean_description(cls, value: str) -> str:
        return value.strip()

    @field_validator("phone")
    @classmethod
    def clean_phone(cls, value: str | None) -> str | None:
        if value is None:
            return None
        digits = re.sub(r"[\s\-()]", "", value)
        if not digits:
            return None
        if not PHONE_PATTERN.match(digits):
            raise ValueError("Enter a valid phone number")
        return digits

    @field_validator("zone")
    @classmethod
    def zone_must_exist(cls, value: str) -> str:
        if value not in ZONES:
            raise ValueError(f"Zone must be one of: {', '.join(ZONES)}")
        return value

    @field_validator("resources")
    @classmethod
    def no_duplicate_resources(cls, value: list[ResourceRequest]) -> list[ResourceRequest]:
        ids = [item.resource_id for item in value]
        if len(ids) != len(set(ids)):
            raise ValueError("Each resource can be listed only once")
        return value


class ScoreBreakdown(BaseModel):
    urgency: int
    waiting: int
    resource: int
    total: int


class IncidentResourceOut(BaseModel):
    resource_id: int
    name: str
    quantity: int


class IncidentOut(BaseModel):
    id: int
    citizen_name: str
    phone: str | None
    type: IncidentType
    urgency: int
    zone: str
    people_count: int
    description: str
    status: IncidentStatus
    created_at: str
    updated_at: str
    score: ScoreBreakdown
    resources: list[IncidentResourceOut]
    volunteer_id: int | None = None
    volunteer_name: str | None = None


class StatusUpdate(BaseModel):
    status: IncidentStatus


class VolunteerJoin(BaseModel):
    name: str = Field(min_length=1, max_length=60)

    @field_validator("name")
    @classmethod
    def name_not_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Name cannot be blank")
        return value


class VolunteerOut(BaseModel):
    id: int
    name: str
    status: VolunteerStatus
    joined_at: str


class ResourceOut(BaseModel):
    id: int
    name: str
    total: int
    available: int
    criticality: int


class ResourceStockUpdate(BaseModel):
    total: int = Field(ge=0, le=10000)