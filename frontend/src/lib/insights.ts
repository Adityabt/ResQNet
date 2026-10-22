import { TYPE_LABELS } from "./format";
import type { Incident, IncidentType } from "./types";

export interface Insights {
  total: number;
  open: number;
  resolved: number;
  cancelled: number;
  avgResolutionMinutes: number | null;
  byType: { name: string; count: number }[];
  byUrgency: { level: number; label: string; count: number }[];
}

export function computeInsights(incidents: Incident[]): Insights {
  const typeCounts = new Map<IncidentType, number>();
  const urgencyCounts = new Map<number, number>();
  let resolved = 0;
  let cancelled = 0;
  let open = 0;
  const resolutionTimes: number[] = [];

  for (const incident of incidents) {
    typeCounts.set(incident.type, (typeCounts.get(incident.type) ?? 0) + 1);
    urgencyCounts.set(incident.urgency, (urgencyCounts.get(incident.urgency) ?? 0) + 1);
    if (incident.status === "RESOLVED") {
      resolved += 1;
      const minutes = (Date.parse(incident.updated_at) - Date.parse(incident.created_at)) / 60000;
      if (Number.isFinite(minutes) && minutes >= 0) {
        resolutionTimes.push(minutes);
      }
    } else if (incident.status === "CANCELLED") {
      cancelled += 1;
    } else {
      open += 1;
    }
  }

  const average =
    resolutionTimes.length > 0
      ? resolutionTimes.reduce((sum, value) => sum + value, 0) / resolutionTimes.length
      : null;

  return {
    total: incidents.length,
    open,
    resolved,
    cancelled,
    avgResolutionMinutes: average,
    byType: (Object.keys(TYPE_LABELS) as IncidentType[]).map((type) => ({
      name: TYPE_LABELS[type],
      count: typeCounts.get(type) ?? 0,
    })),
    byUrgency: [1, 2, 3, 4, 5].map((level) => ({
      level,
      label: String(level),
      count: urgencyCounts.get(level) ?? 0,
    })),
  };
}