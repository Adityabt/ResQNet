export type IncidentStatus = "PENDING" | "ASSIGNED" | "EN_ROUTE" | "RESOLVED" | "CANCELLED";
export type VolunteerStatus = "FREE" | "BUSY" | "OFF_DUTY";
export type IncidentType = "MEDICAL" | "RESCUE" | "FOOD_WATER" | "SHELTER" | "OTHER";
export type ConnectionStatus = "connecting" | "live" | "reconnecting";
export type Role = "public" | "coordinator";

export interface ScoreBreakdown {
  urgency: number;
  waiting: number;
  resource: number;
  total: number;
}

export interface IncidentResource {
  resource_id: number;
  name: string;
  quantity: number;
}

export interface Incident {
  id: number;
  citizen_name: string;
  phone: string | null;
  type: IncidentType;
  urgency: number;
  zone: string;
  people_count: number;
  description: string;
  status: IncidentStatus;
  created_at: string;
  updated_at: string;
  score: ScoreBreakdown;
  resources: IncidentResource[];
  volunteer_id: number | null;
  volunteer_name: string | null;
}

export interface Volunteer {
  id: number;
  name: string;
  status: VolunteerStatus;
  joined_at: string;
}

export interface Resource {
  id: number;
  name: string;
  total: number;
  available: number;
  criticality: number;
}

export interface EventLogEntry {
  id: number;
  event_type: string;
  entity_type: string;
  entity_id: number | null;
  details: string;
  created_at: string;
}

export type AnnouncementLevel = "INFO" | "WARNING" | "CRITICAL";

export interface Announcement {
  id: number;
  message: string;
  level: AnnouncementLevel;
  created_at: string;
}

export interface SnapshotData {
  incidents: Incident[];
  volunteers: Volunteer[];
  resources: Resource[];
  events: EventLogEntry[];
  announcements: Announcement[];
}

export interface SnapshotMessage {
  type: "snapshot";
  role: Role;
  server_time: string;
  clients: number;
  data: SnapshotData;
}

export interface PongMessage {
  type: "pong";
}

export type ServerMessage = SnapshotMessage | PongMessage;

export interface Meta {
  zones: string[];
  incident_types: IncidentType[];
  urgency_levels: number[];
  weights: { urgency: number; waiting: number; resource: number };
  waiting_minutes_per_point: number;
  waiting_max_points: number;
}

export interface IncidentCreateBody {
  citizen_name: string;
  phone?: string | null;
  type: IncidentType;
  urgency: number;
  zone: string;
  people_count: number;
  description: string;
  resources: { resource_id: number; quantity: number }[];
}

export interface AllocateResult {
  assigned: { incident_id: number; volunteer_id: number; volunteer_name: string; score: number }[];
  skipped: { incident_id: number; score: number; reason: string }[];
}

export interface LoginResult {
  ok: boolean;
  token: string;
}

export interface Contact {
  citizen_name: string;
  phone: string | null;
}