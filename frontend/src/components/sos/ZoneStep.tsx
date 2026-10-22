import { motion } from "framer-motion";
import { Check, MapPin } from "lucide-react";

import { useLiveStore } from "../../store/useLiveStore";

interface ZoneStepProps {
  zones: string[];
  value: string | null;
  onChange: (zone: string) => void;
}

export default function ZoneStep({ zones, value, onChange }: ZoneStepProps) {
  const incidents = useLiveStore((state) => state.data.incidents);

  const openByZone = new Map<string, number>();
  for (const incident of incidents) {
    if (incident.status !== "RESOLVED" && incident.status !== "CANCELLED") {
      openByZone.set(incident.zone, (openByZone.get(incident.zone) ?? 0) + 1);
    }
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-3">
        {zones.map((zone) => {
          const selected = zone === value;
          const open = openByZone.get(zone) ?? 0;
          return (
            <motion.button
              key={zone}
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={() => onChange(zone)}
              className={`relative flex min-h-24 flex-col items-start justify-between rounded-[20px] border p-4 text-left transition-colors sm:min-h-28 ${
                selected
                  ? "border-red-400/60 bg-red-500/10"
                  : "border-white/10 bg-white/[0.03] hover:border-white/25"
              }`}
            >
              <MapPin className={`h-5 w-5 ${selected ? "text-red-400" : "text-slate-500"}`} />
              <div className="mt-3">
                <span className="block text-sm font-medium">{zone}</span>
                <span className="mt-0.5 block text-xs text-slate-500">
                  {open === 0 ? "No requests waiting" : `${open} ${open === 1 ? "request" : "requests"} waiting`}
                </span>
              </div>
              {selected && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-red-500"
                >
                  <Check className="h-3 w-3 text-white" />
                </motion.span>
              )}
            </motion.button>
          );
        })}
      </div>
      <p className="mt-4 text-xs text-slate-500">
        Not sure? Choose the zone with the nearest landmark. You can describe your exact spot in a
        later step.
      </p>
    </div>
  );
}
