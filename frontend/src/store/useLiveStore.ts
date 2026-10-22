import { create } from "zustand";

import type {
  ConnectionStatus,
  EventLogEntry,
  Role,
  SnapshotData,
  SnapshotMessage,
} from "../lib/types";

interface LiveState {
  status: ConnectionStatus;
  clients: number;
  serverOffsetMs: number;
  hasSnapshot: boolean;
  snapshotSeq: number;
  role: Role;
  data: SnapshotData;
  freshEvents: EventLogEntry[];
  setStatus: (status: ConnectionStatus) => void;
  beginConnection: () => void;
  applySnapshot: (message: SnapshotMessage) => void;
}

const EMPTY_DATA: SnapshotData = {
  incidents: [],
  volunteers: [],
  resources: [],
  events: [],
  announcements: [],
};
const NO_EVENTS: EventLogEntry[] = [];

export const useLiveStore = create<LiveState>((set, get) => ({
  status: "connecting",
  clients: 0,
  serverOffsetMs: 0,
  hasSnapshot: false,
  snapshotSeq: 0,
  role: "public",
  data: EMPTY_DATA,
  freshEvents: NO_EVENTS,

  setStatus: (status) => set({ status }),

  beginConnection: () => set({ status: "connecting", hasSnapshot: false, role: "public" }),

  applySnapshot: (message) => {
    const previous = get();
    const previousNewestId = previous.data.events[0]?.id ?? 0;
    const fresh = previous.hasSnapshot
      ? message.data.events.filter((event) => event.id > previousNewestId)
      : NO_EVENTS;
    set({
      status: "live",
      clients: message.clients,
      serverOffsetMs: Date.parse(message.server_time) - Date.now(),
      hasSnapshot: true,
      snapshotSeq: previous.snapshotSeq + 1,
      role: message.role ?? "public",
      data: message.data,
      freshEvents: fresh.length > 0 ? fresh : NO_EVENTS,
    });
  },
}));