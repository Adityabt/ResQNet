import { useCoordinatorStore } from "../store/useCoordinatorStore";
import type {
  AllocateResult,
  Announcement,
  AnnouncementLevel,
  Contact,
  Incident,
  IncidentCreateBody,
  IncidentStatus,
  LoginResult,
  Meta,
  Resource,
  Volunteer,
} from "./types";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

const OWNER_KEY = "resqnet-owner-";
const VOLUNTEER_KEY = "resqnet-volunteer-";

function readStored(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStored(key: string, value: string | null): void {
  if (!value) {
    return;
  }
  try {
    localStorage.setItem(key, value);
  } catch {
    return;
  }
}

function ownerHeaders(incidentId: number): Record<string, string> {
  const value = readStored(`${OWNER_KEY}${incidentId}`);
  return value ? { "X-Owner-Token": value } : {};
}

function volunteerHeaders(volunteerId?: number): Record<string, string> {
  if (volunteerId === undefined) {
    return {};
  }
  const value = readStored(`${VOLUNTEER_KEY}${volunteerId}`);
  return value ? { "X-Volunteer-Token": value } : {};
}

function coordinatorToken(): string | null {
  return useCoordinatorStore.getState().token;
}

async function readError(response: Response): Promise<string> {
  try {
    const body = await response.json();
    if (typeof body.detail === "string") {
      return body.detail;
    }
    if (Array.isArray(body.detail)) {
      return body.detail
        .map((item: { msg?: string }) => item.msg ?? "Invalid input")
        .join(", ");
    }
  } catch {
    return `Request failed (${response.status})`;
  }
  return `Request failed (${response.status})`;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null,
  after?: (data: T, headers: Headers) => void,
): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  let response: Response;
  try {
    response = await fetch(path, { ...options, headers });
  } catch {
    throw new ApiError("Cannot reach the server", 0);
  }
  if (!response.ok) {
    throw new ApiError(await readError(response), response.status);
  }
  const data = (await response.json()) as T;
  after?.(data, response.headers);
  return data;
}

function post(body: unknown, headers?: Record<string, string>): RequestInit {
  return { method: "POST", body: JSON.stringify(body), headers };
}

export const api = {
  meta: () => request<Meta>("/api/meta"),
  whoAmI: () => request<{ is_host: boolean }>("/api/whoami"),
  createIncident: (body: IncidentCreateBody) =>
    request<Incident>("/api/incidents", post(body), undefined, (incident, headers) => {
      writeStored(`${OWNER_KEY}${incident.id}`, headers.get("X-Owner-Token"));
    }),
  joinVolunteer: (name: string) =>
    request<Volunteer>("/api/volunteers", post({ name }), undefined, (volunteer, headers) => {
      writeStored(`${VOLUNTEER_KEY}${volunteer.id}`, headers.get("X-Volunteer-Token"));
    }),
  getVolunteer: (id: number) => request<Volunteer>(`/api/volunteers/${id}`),
  setDuty: (volunteerId: number, onDuty: boolean) =>
    request<Volunteer>(
      `/api/volunteers/${volunteerId}/duty`,
      post({ on_duty: onDuty }, volunteerHeaders(volunteerId)),
    ),
  claim: (incidentId: number, volunteerId: number) =>
    request<Incident>(
      `/api/incidents/${incidentId}/claim`,
      post({ volunteer_id: volunteerId }, volunteerHeaders(volunteerId)),
      coordinatorToken(),
    ),
  release: (incidentId: number, volunteerId?: number, token?: string | null) =>
    request<Incident>(
      `/api/incidents/${incidentId}/release`,
      post({ volunteer_id: volunteerId ?? null }, volunteerHeaders(volunteerId)),
      token,
    ),
  setStatus: (
    incidentId: number,
    status: IncidentStatus,
    volunteerId?: number,
    token?: string | null,
  ) =>
    request<Incident>(
      `/api/incidents/${incidentId}/status`,
      post({ status, volunteer_id: volunteerId ?? null }, volunteerHeaders(volunteerId)),
      token,
    ),
  cancel: (incidentId: number) =>
    request<Incident>(
      `/api/incidents/${incidentId}/cancel`,
      { method: "POST", headers: ownerHeaders(incidentId) },
      coordinatorToken(),
    ),
  contact: (incidentId: number, volunteerId?: number, token?: string | null) =>
    request<Contact>(
      `/api/incidents/${incidentId}/contact${
        volunteerId !== undefined ? `?volunteer_id=${volunteerId}` : ""
      }`,
      { headers: volunteerHeaders(volunteerId) },
      token,
    ),
  allocate: (token: string) =>
    request<AllocateResult>("/api/allocate", { method: "POST" }, token),
  login: (pin: string) => request<LoginResult>("/api/admin/login", post({ pin })),
  logout: (token: string) =>
    request<{ ok: boolean }>("/api/admin/logout", { method: "POST" }, token),
  postAnnouncement: (message: string, level: AnnouncementLevel, token: string) =>
    request<Announcement>("/api/announcements", post({ message, level }), token),
  deleteAnnouncement: (id: number, token: string) =>
    request<{ ok: boolean }>(`/api/announcements/${id}`, { method: "DELETE" }, token),
  seedDemo: (token: string) =>
    request<{ incidents: number; volunteers: number }>("/api/demo/seed", { method: "POST" }, token),
  resetDemo: (token: string) =>
    request<{ ok: boolean }>("/api/demo/reset", { method: "POST" }, token),
  exportCsv: async (token: string): Promise<Blob> => {
    let response: Response;
    try {
      response = await fetch("/api/admin/export.csv", {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      throw new ApiError("Cannot reach the server", 0);
    }
    if (!response.ok) {
      throw new ApiError(await readError(response), response.status);
    }
    return response.blob();
  },
  updateStock: (resourceId: number, total: number, token: string) =>
    request<Resource>(
      `/api/resources/${resourceId}`,
      { method: "PATCH", body: JSON.stringify({ total }) },
      token,
    ),
};