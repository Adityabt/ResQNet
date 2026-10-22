import { BarChart3 } from "lucide-react";
import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { computeInsights } from "../../lib/insights";
import { useLiveStore } from "../../store/useLiveStore";

const URGENCY_COLORS = ["#38bdf8", "#34d399", "#fbbf24", "#fb923c", "#ef4444"];
const AXIS = { fill: "#94a3b8", fontSize: 12 };
const TOOLTIP = {
  contentStyle: {
    background: "#0f172a",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 12,
    color: "#e2e8f0",
    fontSize: 12,
  },
  cursor: { fill: "rgba(255,255,255,0.04)" },
};

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass rounded-2xl border border-white/10 p-4 text-center">
      <div className="font-mono text-2xl font-semibold">{value}</div>
      <div className="mt-1 text-xs text-slate-400">{label}</div>
    </div>
  );
}

export default function InsightsPanel() {
  const incidents = useLiveStore((state) => state.data.incidents);
  const insights = useMemo(() => computeInsights(incidents), [incidents]);

  const average =
    insights.avgResolutionMinutes === null ? "–" : `${Math.round(insights.avgResolutionMinutes)} min`;

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2 text-slate-400">
        <BarChart3 className="h-4 w-4" />
        <span className="text-xs font-medium uppercase tracking-wider">Analytics</span>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Tile label="Total requests" value={String(insights.total)} />
        <Tile label="Resolved" value={String(insights.resolved)} />
        <Tile label="Cancelled" value={String(insights.cancelled)} />
        <Tile label="Avg. resolution" value={average} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="glass rounded-2xl border border-white/10 p-5">
          <h3 className="mb-3 text-sm font-medium text-slate-200">Requests by type</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={insights.byType} margin={{ left: -20, right: 4, top: 4 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="name" tick={AXIS} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tick={AXIS} tickLine={false} axisLine={false} />
                <Tooltip {...TOOLTIP} />
                <Bar dataKey="count" name="Requests" fill="#38bdf8" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass rounded-2xl border border-white/10 p-5">
          <h3 className="mb-3 text-sm font-medium text-slate-200">Requests by urgency</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={insights.byUrgency} margin={{ left: -20, right: 4, top: 4 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tick={AXIS} tickLine={false} axisLine={false} />
                <Tooltip {...TOOLTIP} />
                <Bar dataKey="count" name="Requests" radius={[6, 6, 0, 0]}>
                  {insights.byUrgency.map((entry) => (
                    <Cell key={entry.level} fill={URGENCY_COLORS[entry.level - 1]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </section>
  );
}