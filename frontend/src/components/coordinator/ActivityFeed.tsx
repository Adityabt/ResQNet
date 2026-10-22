import { AnimatePresence, motion } from "framer-motion";
import { Activity } from "lucide-react";

import { useNow } from "../../hooks/useNow";
import { agoLabel, describeEvent } from "../../lib/format";
import { useLiveStore } from "../../store/useLiveStore";

export default function ActivityFeed() {
  const events = useLiveStore((state) => state.data.events);
  const now = useNow();

  return (
    <section className="glass rounded-2xl border border-white/10 p-5">
      <div className="mb-4 flex items-center gap-2 text-slate-400">
        <Activity className="h-4 w-4" />
        <span className="text-xs font-medium uppercase tracking-wider">Live activity</span>
      </div>
      {events.length === 0 ? (
        <p className="text-sm text-slate-500">Nothing has happened yet.</p>
      ) : (
        <ul className="space-y-3">
          <AnimatePresence initial={false}>
            {events.map((event) => (
              <motion.li
                key={event.id}
                layout
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="flex gap-3 text-sm"
              >
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-400" />
                <div className="min-w-0">
                  <p className="text-slate-200">{describeEvent(event)}</p>
                  <p className="text-xs text-slate-500">{agoLabel(event.created_at, now)}</p>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </section>
  );
}