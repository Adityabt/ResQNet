import { create } from "zustand";

import { api } from "../lib/api";

interface HostState {
  isHost: boolean | null;
  check: () => Promise<void>;
}

export const useHostStore = create<HostState>((set) => ({
  isHost: null,
  check: async () => {
    try {
      const result = await api.whoAmI();
      set({ isHost: result.is_host });
    } catch {
      set({ isHost: false });
    }
  },
}));