import type { IncidentCreateBody, IncidentType } from "./types";

export interface SosDraft {
  zone: string | null;
  type: IncidentType | null;
  urgency: number | null;
  people: number;
  resources: Record<number, number>;
  description: string;
  name: string;
  phone: string;
}

export const EMPTY_DRAFT: SosDraft = {
  zone: null,
  type: null,
  urgency: null,
  people: 1,
  resources: {},
  description: "",
  name: "",
  phone: "",
};

export const STEP_TITLES = [
  "Where are you?",
  "What is happening?",
  "What do you need?",
  "Review and send",
];

export const STEP_SUBTITLES = [
  "Pick the area closest to you so a volunteer knows where to go.",
  "Tell us the kind of emergency and how serious it is.",
  "Request supplies if you need them. You can skip this step.",
  "Add your name so volunteers know who to look for.",
];

const PHONE_PATTERN = /^\+?\d{10,13}$/;

export function cleanPhone(value: string): string {
  return value.replace(/[\s\-()]/g, "");
}

export function isPhoneValid(value: string): boolean {
  const cleaned = cleanPhone(value);
  return cleaned === "" || PHONE_PATTERN.test(cleaned);
}

export function canContinue(step: number, draft: SosDraft): boolean {
  if (step === 0) {
    return draft.zone !== null;
  }
  if (step === 1) {
    return draft.type !== null && draft.urgency !== null;
  }
  if (step === 2) {
    return true;
  }
  return draft.name.trim().length > 0 && isPhoneValid(draft.phone);
}

export function toBody(draft: SosDraft): IncidentCreateBody {
  const phone = cleanPhone(draft.phone);
  return {
    citizen_name: draft.name.trim(),
    phone: phone === "" ? null : phone,
    type: draft.type as IncidentType,
    urgency: draft.urgency as number,
    zone: draft.zone as string,
    people_count: draft.people,
    description: draft.description.trim(),
    resources: Object.entries(draft.resources)
      .filter(([, quantity]) => quantity > 0)
      .map(([id, quantity]) => ({ resource_id: Number(id), quantity })),
  };
}