import { create } from "zustand";
import { persist } from "zustand/middleware";

interface VolunteerState {
  volunteerId: number | null;
  name: string;
  resolvedCount: number;
  join: (id: number, name: string) => void;
  leave: () => void;
  addResolved: () => void;
}

export const useVolunteerStore = create<VolunteerState>()(
  persist(
    (set) => ({
      volunteerId: null,
      name: "",
      resolvedCount: 0,
      join: (id, name) => set({ volunteerId: id, name, resolvedCount: 0 }),
      leave: () => set({ volunteerId: null, name: "", resolvedCount: 0 }),
      addResolved: () => set((state) => ({ resolvedCount: state.resolvedCount + 1 })),
    }),
    { name: "resqnet-volunteer" },
  ),
);