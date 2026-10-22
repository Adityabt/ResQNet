import type { ConnectionStatus } from "../lib/types";
import { useLiveStore } from "../store/useLiveStore";

const PILL_STYLES: Record<ConnectionStatus, string> = {
  live: "bg-emerald-500/15 text-emerald-300 ring-emerald-400/30",
  connecting: "bg-amber-500/15 text-amber-300 ring-amber-400/30",
  reconnecting: "bg-red-500/15 text-red-300 ring-red-400/30",
};

const DOT_STYLES: Record<ConnectionStatus, string> = {
  live: "bg-emerald-400",
  connecting: "bg-amber-400",
  reconnecting: "bg-red-400",
};

const IDLE_LABELS = {
  connecting: "Connecting…",
  reconnecting: "Reconnecting…",
} as const;

const TOOLTIPS: Record<ConnectionStatus, string> = {
  live: "You are receiving updates in real time",
  connecting: "Reaching the ResQNet server",
  reconnecting: "Connection lost. Retrying automatically",
};

export default function ConnectionPill() {
  const status = useLiveStore((state) => state.status);
  const clients = useLiveStore((state) => state.clients);

  const label =
    status === "live"
      ? `Live · ${clients} ${clients === 1 ? "device" : "devices"}`
      : IDLE_LABELS[status];

  return (
    <span
      title={TOOLTIPS[status]}
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ring-1 ${PILL_STYLES[status]}`}
    >
      <span className="relative flex h-2 w-2">
        {status === "live" && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
        )}
        <span className={`relative inline-flex h-2 w-2 rounded-full ${DOT_STYLES[status]}`} />
      </span>
      {label}
    </span>
  );
}