import { motion } from "framer-motion";
import { Minus, Package, Plus } from "lucide-react";
import { useState } from "react";

import { api } from "../../lib/api";
import type { Resource } from "../../lib/types";
import { useLiveStore } from "../../store/useLiveStore";

function tone(resource: Resource): string {
  if (resource.total === 0) {
    return "bg-slate-500";
  }
  const ratio = resource.available / resource.total;
  if (ratio <= 0.15) {
    return "bg-red-400";
  }
  return ratio <= 0.4 ? "bg-amber-400" : "bg-emerald-400";
}

export default function StockPanel({ token }: { token: string }) {
  const resources = useLiveStore((state) => state.data.resources);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<number | null>(null);

  const change = async (resource: Resource, delta: number) => {
    setPendingId(resource.id);
    setError(null);
    try {
      await api.updateStock(resource.id, resource.total + delta, token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update stock");
    } finally {
      setPendingId(null);
    }
  };

  return (
    <section className="glass rounded-2xl border border-white/10 p-5">
      <div className="mb-4 flex items-center gap-2 text-slate-400">
        <Package className="h-4 w-4" />
        <span className="text-xs font-medium uppercase tracking-wider">Supplies</span>
      </div>

      <ul className="space-y-5">
        {resources.map((resource) => {
          const step = resource.total >= 50 ? 5 : 1;
          const percent = resource.total === 0 ? 0 : (resource.available / resource.total) * 100;
          const busy = pendingId === resource.id;
          return (
            <li key={resource.id}>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-slate-100">{resource.name}</div>
                  <div className="font-mono text-xs text-slate-400">
                    {resource.available} available of {resource.total}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    aria-label={`Remove ${step} ${resource.name}`}
                    disabled={busy || resource.available < step || resource.total < step}
                    onClick={() => void change(resource, -step)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 ring-1 ring-white/10 transition-colors hover:bg-white/10 disabled:opacity-30"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Add ${step} ${resource.name}`}
                    disabled={busy}
                    onClick={() => void change(resource, step)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 ring-1 ring-white/10 transition-colors hover:bg-white/10 disabled:opacity-30"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                <motion.div
                  animate={{ width: `${percent}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className={`h-full rounded-full ${tone(resource)}`}
                />
              </div>
            </li>
          );
        })}
      </ul>
      {error && <p className="mt-4 text-sm text-red-300">{error}</p>}
    </section>
  );
}