import { useEffect } from "react";

import type { ServerMessage } from "../lib/types";
import { useCoordinatorStore } from "../store/useCoordinatorStore";
import { useLiveStore } from "../store/useLiveStore";

const PING_INTERVAL_MS = 10000;
const PONG_TIMEOUT_MS = 5000;
const BASE_RETRY_MS = 500;
const MAX_RETRY_MS = 5000;

export function useLiveSocket(): void {
  const token = useCoordinatorStore((state) => state.token);

  useEffect(() => {
    useLiveStore.getState().beginConnection();

    let socket: WebSocket | null = null;
    let retryTimer: number | undefined;
    let pingTimer: number | undefined;
    let pongTimer: number | undefined;
    let attempts = 0;
    let stopped = false;

    const clearHeartbeat = () => {
      window.clearInterval(pingTimer);
      window.clearTimeout(pongTimer);
    };

    const scheduleReconnect = () => {
      if (stopped) {
        return;
      }
      useLiveStore.getState().setStatus("reconnecting");
      const delay = Math.min(MAX_RETRY_MS, BASE_RETRY_MS * 2 ** attempts);
      attempts += 1;
      retryTimer = window.setTimeout(connect, delay);
    };

    const connect = () => {
      const scheme = window.location.protocol === "https:" ? "wss://" : "ws://";
      const query = token ? `?token=${encodeURIComponent(token)}` : "";
      const current = new WebSocket(`${scheme}${window.location.host}/ws${query}`);
      socket = current;

      current.onopen = () => {
        attempts = 0;
        pingTimer = window.setInterval(() => {
          if (current.readyState !== WebSocket.OPEN) {
            return;
          }
          current.send("ping");
          pongTimer = window.setTimeout(() => current.close(), PONG_TIMEOUT_MS);
        }, PING_INTERVAL_MS);
      };

      current.onmessage = (event) => {
        const message = JSON.parse(event.data as string) as ServerMessage;
        if (message.type === "pong") {
          window.clearTimeout(pongTimer);
          return;
        }
        useLiveStore.getState().applySnapshot(message);
      };

      current.onclose = () => {
        clearHeartbeat();
        scheduleReconnect();
      };
    };

    connect();

    return () => {
      stopped = true;
      window.clearTimeout(retryTimer);
      clearHeartbeat();
      socket?.close();
    };
  }, [token]);
}