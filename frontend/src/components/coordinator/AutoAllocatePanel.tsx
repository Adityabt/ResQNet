import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, CircleAlert, Sparkles } from "lucide-react";
import { useState } from "react";

import { api } from "../../lib/api";
import type { AllocateResult } from "../../lib/types";
import { useLiveStore } from "../../store/useLiveStore";
import Button from "../ui/Button";

export default function AutoAllocatePanel({ token }: { token: string }) {
  const incidents = useLiveStore((state) => state.data.incidents);
  const volunteers = useLiveStore((state) => state.data.volunteers);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<AllocateResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pending = incidents.filter((incident) => incident.status === "PENDING").length;
  const free = volunteers.filter((volunteer) => volunteer.status === "FREE").length;
  const zoneOf = (id: number) => incidents.find((incident) => incident.id === id)?.zone ?? "";

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      setResult(await api.allocate(token));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Auto-allocate failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="glass rounded-2xl border border-white/10 p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-violet-300">
            <Sparkles className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Auto-allocate</span>
          </div>
          <p className="mt-1 text-sm text-slate-400">
            Match the highest-priority pending requests with free volunteers.{" "}
            <span className="text-slate-200">
              {pending} pending · {free} free
            </span>
          </p>
        </div>
        <Button loading={busy} disabled={pending === 0 || free === 0} onClick={run}>
          Run allocation
        </Button>
      </div>

      {error && <p className="mt-3 text-sm text-red-300">{error}</p>}

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-4 space-y-2 border-t border-white/10 pt-4">
              {result.assigned.length === 0 && result.skipped.length === 0 && (
                <p className="text-sm text-slate-400">Nothing to allocate right now.</p>
              )}
              {result.assigned.map((item, index) => (
                <motion.div
                  key={item.incident_id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.08 }}
                  className="flex items-center gap-2 rounded-xl bg-emerald-500/10 px-4 py-2.5 text-sm ring-1 ring-emerald-400/25"
                >
                  <span className="font-mono text-emerald-300">#{item.incident_id}</span>
                  <span className="text-slate-400">{zoneOf(item.incident_id)}</span>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-500" />
                  <span className="font-medium text-slate-100">{item.volunteer_name}</span>
                  <span className="ml-auto font-mono text-xs text-slate-400">
                    score {item.score}
                  </span>
                </motion.div>
              ))}
              {result.skipped.map((item) => (
                <div
                  key={item.incident_id}
                  className="flex items-start gap-2 rounded-xl bg-amber-500/10 px-4 py-2.5 text-sm ring-1 ring-amber-400/25"
                >
                  <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                  <span className="text-slate-200">
                    <span className="font-mono text-amber-300">#{item.incident_id}</span> skipped:{" "}
                    <span className="text-slate-400">{item.reason}</span>
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}