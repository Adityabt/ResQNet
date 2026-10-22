import { motion } from "framer-motion";
import { LogOut } from "lucide-react";

import type { VolunteerStatus } from "../../lib/types";
import Button from "../ui/Button";

interface VolunteerHeaderProps {
  name: string;
  status: VolunteerStatus | null;
  busy: boolean;
  onToggleDuty: () => void;
  onSignOut: () => void;
}

const PILLS: Record<VolunteerStatus, { label: string; box: string; dot: string }> = {
  FREE: {
    label: "Ready to help",
    box: "bg-emerald-500/15 text-emerald-300 ring-emerald-400/30",
    dot: "bg-emerald-400",
  },
  BUSY: {
    label: "On a request",
    box: "bg-amber-500/15 text-amber-300 ring-amber-400/30",
    dot: "bg-amber-400",
  },
  OFF_DUTY: {
    label: "Off duty",
    box: "bg-slate-500/15 text-slate-300 ring-slate-400/30",
    dot: "bg-slate-400",
  },
};

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export default function VolunteerHeader({
  name,
  status,
  busy,
  onToggleDuty,
  onSignOut,
}: VolunteerHeaderProps) {
  const pill = status ? PILLS[status] : null;
  const onDuty = status !== "OFF_DUTY";
  const canToggle = status !== null && status !== "BUSY" && !busy;

  return (
    <div className="glass flex flex-col gap-4 rounded-[24px] border border-white/10 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/15 font-semibold text-emerald-300 ring-1 ring-emerald-400/30">
          {initials(name)}
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold tracking-tight">{name}</h1>
          {pill ? (
            <span
              className={`mt-1 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${pill.box}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${pill.dot}`} />
              {pill.label}
            </span>
          ) : (
            <span className="mt-1 inline-block text-xs text-slate-500">Connecting…</span>
          )}
        </div>
      </div>

      <div className="flex w-full flex-wrap items-center justify-between gap-3 sm:w-auto sm:justify-end">
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-300">On duty</span>
          <button
            type="button"
            role="switch"
            aria-checked={onDuty}
            aria-label="On duty"
            disabled={!canToggle}
            onClick={onToggleDuty}
            className={`relative h-7 w-12 rounded-full transition-colors disabled:opacity-40 ${
              onDuty ? "bg-emerald-500" : "bg-white/15"
            }`}
          >
            <motion.span
              layout
              transition={{ type: "spring", stiffness: 500, damping: 32 }}
              className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow ${
                onDuty ? "right-1" : "left-1"
              }`}
            />
          </button>
        </div>
        <Button
          variant="ghost"
          className="min-h-10 px-3"
          disabled={status === "BUSY" || busy}
          onClick={onSignOut}
        >
          <LogOut className="h-4 w-4" />
          Leave team
        </Button>
      </div>
    </div>
  );
}
