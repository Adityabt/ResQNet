import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface CoordinatorState {
  token: string | null;
  setToken: (token: string) => void;
  clear: () => void;
}

export const useCoordinatorStore = create<CoordinatorState>()(
  persist(
    (set) => ({
      token: null,
      setToken: (token) => set({ token }),
      clear: () => set({ token: null }),
    }),
    {
      name: "resqnet-coordinator",
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
);