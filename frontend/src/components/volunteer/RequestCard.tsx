import { motion } from "framer-motion";
import { MapPin, Users } from "lucide-react";

import { TYPE_LABELS, waitedLabel } from "../../lib/format";
import { stockProblems } from "../../lib/stock";
import type { Incident, Resource } from "../../lib/types";
import UrgencyBadge from "../UrgencyBadge";
import Button from "../ui/Button";

interface RequestCardProps {
  incident: Incident;
  rank: number;
  resources: Resource[];
  now: number;
  blockedReason: string | null;
  claiming: boolean;
  onClaim: (incidentId: number) => void;
}

export default function RequestCard({
  incident,
  rank,
  resources,
  now,
  blockedReason,
  claiming,
  onClaim,
}: RequestCardProps) {
  const short = stockProblems(incident, resources);
  const reason =
    blockedReason ?? (short.length > 0 ? `Not enough stock for: ${short.join(", ")}` : null);
  const critical = incident.urgency === 5;

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ type: "spring", stiffness: 380, damping: 34 }}
      className={`glass w-full min-w-0 rounded-[22px] border p-4 sm:p-5 ${
        critical ? "border-red-400/40" : "border-white/10"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 font-mono text-sm text-slate-300 ring-1 ring-white/10">
            #{rank}
          </div>
          <div className="min-w-0">
            <UrgencyBadge level={incident.urgency} />
            {critical && (
              <div className="mt-1 text-[11px] font-medium text-red-300">Highest priority</div>
            )}
          </div>
        </div>
        <div className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl bg-white/[0.04] px-3 py-2">
          <span className="font-mono text-xl font-semibold leading-none">{incident.score.total}</span>
          <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">priority</span>
        </div>
      </div>

      <div className="mt-3 flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-300">
        <span className="inline-flex min-w-0 items-center gap-1.5 break-words">
          <MapPin className="h-4 w-4 text-slate-500" />
          {incident.zone}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Users className="h-4 w-4 text-slate-500" />
          {incident.people_count} {incident.people_count === 1 ? "person" : "people"}
        </span>
        <span className="min-w-0 text-slate-500">
          {TYPE_LABELS[incident.type]} · waiting {waitedLabel(incident.created_at, now)}
        </span>
      </div>

      {incident.description && (
        <p className="mt-2 line-clamp-2 break-words text-sm text-slate-400">{incident.description}</p>
      )}

      {incident.resources.length > 0 && (
        <div className="mt-3">
          <div className="mb-1.5 text-xs text-slate-500">Supplies to bring</div>
          <div className="flex flex-wrap gap-2">
            {incident.resources.map((item) => (
              <span
                key={item.resource_id}
                className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${
                  short.includes(item.name)
                    ? "bg-red-500/10 text-red-300 ring-red-400/30"
                    : "bg-white/5 text-slate-300 ring-white/10"
                }`}
              >
                {item.quantity} × {item.name}
              </span>
            ))}
          </div>
        </div>
      )}

      <Button
        className="mt-4 w-full"
        disabled={reason !== null}
        loading={claiming}
        onClick={() => onClaim(incident.id)}
      >
        Take this request
      </Button>
      {reason && <p className="mt-2 text-xs text-amber-300/90">{reason}</p>}
    </motion.li>
  );
}
