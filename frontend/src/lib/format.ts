import type { EventLogEntry, IncidentStatus, IncidentType } from "./types";

interface UrgencyStyle {
  label: string;
  text: string;
  bg: string;
  ring: string;
}

const URGENCY_STYLES: Record<number, UrgencyStyle> = {
  1: { label: "Low", text: "text-urgency-1", bg: "bg-urgency-1/15", ring: "ring-urgency-1/40" },
  2: { label: "Moderate", text: "text-urgency-2", bg: "bg-urgency-2/15", ring: "ring-urgency-2/40" },
  3: { label: "Serious", text: "text-urgency-3", bg: "bg-urgency-3/15", ring: "ring-urgency-3/40" },
  4: { label: "Severe", text: "text-urgency-4", bg: "bg-urgency-4/15", ring: "ring-urgency-4/40" },
  5: { label: "Critical", text: "text-urgency-5", bg: "bg-urgency-5/15", ring: "ring-urgency-5/40" },
};

export function urgencyStyle(level: number): UrgencyStyle {
  return URGENCY_STYLES[level] ?? URGENCY_STYLES[1];
}

export const STATUS_LABELS: Record<IncidentStatus, string> = {
  PENDING: "Waiting",
  ASSIGNED: "Assigned",
  EN_ROUTE: "On the way",
  RESOLVED: "Resolved",
  CANCELLED: "Cancelled",
};

export const STATUS_STYLES: Record<IncidentStatus, string> = {
  PENDING: "bg-slate-500/15 text-slate-300 ring-slate-400/30",
  ASSIGNED: "bg-sky-500/15 text-sky-300 ring-sky-400/30",
  EN_ROUTE: "bg-violet-500/15 text-violet-300 ring-violet-400/30",
  RESOLVED: "bg-emerald-500/15 text-emerald-300 ring-emerald-400/30",
  CANCELLED: "bg-zinc-500/15 text-zinc-400 ring-zinc-400/30",
};

export const TYPE_LABELS: Record<IncidentType, string> = {
  MEDICAL: "Medical",
  RESCUE: "Rescue",
  FOOD_WATER: "Food and water",
  SHELTER: "Shelter",
  OTHER: "Other",
};

export function waitedLabel(createdAt: string, nowMs: number): string {
  const seconds = Math.max(0, Math.floor((nowMs - Date.parse(createdAt)) / 1000));
  if (seconds < 60) {
    return "just now";
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes} min`;
  }
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

export function agoLabel(createdAt: string, nowMs: number): string {
  const label = waitedLabel(createdAt, nowMs);
  return label === "just now" ? label : `${label} ago`;
}

export function describeEvent(event: EventLogEntry): string {
  const ref = event.entity_id !== null ? `#${event.entity_id}` : "";
  switch (event.event_type) {
    case "INCIDENT_CREATED":
      return `New SOS ${ref} received: ${event.details}`;
    case "INCIDENT_ASSIGNED":
      return `Request ${ref} taken by ${event.details}`;
    case "INCIDENT_RELEASED":
      return `Request ${ref} handed back to the queue`;
    case "INCIDENT_EN_ROUTE":
      return `A volunteer is on the way to request ${ref}`;
    case "INCIDENT_RESOLVED":
      return `Request ${ref} resolved`;
    case "INCIDENT_CANCELLED":
      return `Request ${ref} cancelled`;
    case "VOLUNTEER_JOINED":
      return `${event.details} joined the response team`;
    case "VOLUNTEER_ON_DUTY":
      return `${event.details} is now on duty`;
    case "VOLUNTEER_OFF_DUTY":
      return `${event.details} went off duty`;
    case "STOCK_UPDATED":
      return `Supplies updated: ${event.details}`;
    case "AUTO_ALLOCATE":
      return `Auto-allocation ran: ${event.details}`;
    case "ANNOUNCEMENT_POSTED":
      return `Announcement sent: ${event.details}`;
    case "ANNOUNCEMENT_REMOVED":
      return "An announcement was removed";
    case "DEMO_SEEDED":
      return `Demo scenario loaded (${event.details})`;
    case "DEMO_RESET":
      return "System reset to a clean state";
    default:
      return event.details || event.event_type;
  }
}