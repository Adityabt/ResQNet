import { motion } from "framer-motion";
import { MapPinned, X } from "lucide-react";

import { useMeta } from "../../hooks/useMeta";
import type { Incident } from "../../lib/types";
import { useLiveStore } from "../../store/useLiveStore";

interface ZoneMapProps {
  selected: string | null;
  onSelect: (zone: string | null) => void;
}

function heat(maxUrgency: number): string {
  if (maxUrgency >= 5) {
    return "border-red-400/60 bg-red-500/15";
  }
  if (maxUrgency >= 4) {
    return "border-orange-400/50 bg-orange-500/12";
  }
  if (maxUrgency >= 3) {
    return "border-amber-400/40 bg-amber-500/10";
  }
  if (maxUrgency >= 1) {
    return "border-sky-400/35 bg-sky-500/8";
  }
  return "border-white/10 bg-white/[0.03]";
}

export default function ZoneMap({ selected, onSelect }: ZoneMapProps) {
  const { meta } = useMeta();
  const incidents = useLiveStore((state) => state.data.incidents);

  const open = incidents.filter(
    (incident) => incident.status !== "RESOLVED" && incident.status !== "CANCELLED",
  );
  const byZone = new Map<string, Incident[]>();
  for (const incident of open) {
    byZone.set(incident.zone, [...(byZone.get(incident.zone) ?? []), incident]);
  }

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-slate-400">
          <MapPinned className="h-4 w-4" />
          <span className="text-sm font-semibold tracking-tight text-slate-200">Requests by zone</span>
        </div>
        {selected && (
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-slate-300 ring-1 ring-white/15 hover:bg-white/5"
          >
            {selected}
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
        {(meta?.zones ?? []).map((zone, index) => {
          const items = byZone.get(zone) ?? [];
          const maxUrgency = items.reduce((max, item) => Math.max(max, item.urgency), 0);
          const active = selected === zone;
          return (
            <motion.button
              key={zone}
              type="button"
              onClick={() => onSelect(active ? null : zone)}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.03 }}
              whileTap={{ scale: 0.97 }}
              className={`relative min-h-32 rounded-[20px] border p-4 text-left transition-shadow ${heat(maxUrgency)} ${
                active ? "ring-2 ring-white/50" : ""
              }`}
            >
              {maxUrgency >= 5 && (
                <span className="absolute right-3 top-3 h-2.5 w-2.5 animate-pulse-ring rounded-full bg-red-500" />
              )}
              <div className="text-sm font-medium text-slate-100">{zone}</div>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="font-mono text-2xl font-semibold">{items.length}</span>
                <span className="text-xs text-slate-400">open</span>
              </div>
              <div className="mt-1 text-xs text-slate-500">
                {items.length === 0 ? "All clear" : `Highest urgency ${maxUrgency}`}
              </div>
            </motion.button>
          );
        })}
      </div>
    </section>
  );
}
