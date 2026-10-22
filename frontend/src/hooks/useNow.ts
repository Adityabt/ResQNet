import { useEffect, useState } from "react";

import { useLiveStore } from "../store/useLiveStore";

export function useNow(intervalMs = 5000): number {
  const offset = useLiveStore((state) => state.serverOffsetMs);
  const [tick, setTick] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setTick(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);

  return tick + offset;
}