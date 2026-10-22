import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SessionState {
  trackedIncidentId: number | null;
  citizenName: string;
  citizenPhone: string;
  track: (id: number, name: string, phone: string) => void;
  clearTracked: () => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      trackedIncidentId: null,
      citizenName: "",
      citizenPhone: "",
      track: (id, name, phone) =>
        set({ trackedIncidentId: id, citizenName: name, citizenPhone: phone }),
      clearTracked: () => set({ trackedIncidentId: null }),
    }),
    { name: "resqnet-session" },
  ),
);