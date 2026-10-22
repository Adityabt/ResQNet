import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, LayoutDashboard, Phone, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";

import { useNow } from "../../hooks/useNow";
import { api } from "../../lib/api";
import { STATUS_LABELS, STATUS_STYLES, TYPE_LABELS, waitedLabel } from "../../lib/format";
import { stockProblems } from "../../lib/stock";
import type { Incident, Resource, Volunteer } from "../../lib/types";
import { useLiveStore } from "../../store/useLiveStore";
import UrgencyBadge from "../UrgencyBadge";
import Button from "../ui/Button";

interface RowProps {
  incident: Incident;
  rank: number;
  token: string;
  now: number;
  freeVolunteers: Volunteer[];
  resources: Resource[];
}

function QueueRow({ incident, rank, token, now, freeVolunteers, resources }: RowProps) {
  const [chosen, setChosen] = useState<number | "">("");
  const [busy, setBusy] = useState(false);
  const [armed, setArmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!armed) {
      return undefined;
    }
    const timer = window.setTimeout(() => setArmed(false), 4000);
    return () => window.clearTimeout(timer);
  }, [armed]);

  const missing = incident.status === "PENDING" ? stockProblems(incident, resources) : [];

  const perform = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      setChosen("");
      setArmed(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(false);
    }
  };

  const assign = () => {
    if (chosen === "") {
      return;
    }
    void perform(() => api.claim(incident.id, chosen));
  };

  const cancel = () => {
    if (!armed) {
      setArmed(true);
      return;
    }
    void perform(() => api.cancel(incident.id));
  };

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ type: "spring", stiffness: 380, damping: 34 }}
      className="glass min-w-0 rounded-2xl border border-white/10 p-4 sm:p-5"
    >
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 font-mono text-sm text-slate-300 ring-1 ring-white/10">
          #{rank}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate font-medium">{incident.citizen_name}</span>
            <UrgencyBadge level={incident.urgency} />
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${STATUS_STYLES[incident.status]}`}
            >
              {STATUS_LABELS[incident.status]}
            </span>
          </div>
          <div className="mt-1 break-words text-sm text-slate-400">
            {incident.zone} · {TYPE_LABELS[incident.type]} · {incident.people_count}{" "}
            {incident.people_count === 1 ? "person" : "people"} · waiting{" "}
            {waitedLabel(incident.created_at, now)}
            {incident.volunteer_name ? ` · ${incident.volunteer_name}` : ""}
          </div>
          {incident.description && (
            <p className="mt-1 break-words text-sm text-slate-500">{incident.description}</p>
          )}
          <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs text-slate-500">
            <span className="inline-flex min-w-0 items-center gap-1 break-all">
              <Phone className="h-3 w-3" />
              {incident.phone ?? "No phone"}
            </span>
            {incident.resources.length > 0 && (
              <span className="min-w-0 break-words">
                {incident.resources.map((item) => `${item.quantity}× ${item.name}`).join(", ")}
              </span>
            )}
          </div>
          {missing.length > 0 && (
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-2.5 py-1 text-xs text-amber-300 ring-1 ring-amber-400/25">
              <AlertTriangle className="h-3.5 w-3.5" />
              Short on stock: {missing.join(", ")}
            </div>
          )}
        </div>

        <div className="w-[5.5rem] shrink-0 rounded-xl bg-white/[0.04] px-3 py-2 text-center">
          <div className="font-mono text-2xl font-semibold leading-none">{incident.score.total}</div>
          <div className="mt-1 font-mono text-[11px] text-slate-500">
            U{incident.score.urgency} W{incident.score.waiting} R{incident.score.resource}
          </div>
        </div>
      </div>

      <div className="mt-3 grid min-w-0 grid-cols-2 items-center gap-2 border-t border-white/5 pt-3 sm:flex sm:flex-wrap">
        {incident.status === "PENDING" && (
          <>
            <select
              value={chosen}
              onChange={(event) => setChosen(event.target.value === "" ? "" : Number(event.target.value))}
              disabled={freeVolunteers.length === 0}
              className="col-span-2 min-h-10 w-full min-w-0 max-w-full appearance-none rounded-xl bg-slate-900 px-3 text-sm font-sans text-slate-200 ring-1 ring-white/15 focus:outline-none focus:ring-2 focus:ring-sky-400/60 disabled:opacity-40 sm:col-span-1 sm:w-auto"
            >
              <option value="">
                {freeVolunteers.length === 0 ? "No free volunteers" : "Assign to…"}
              </option>
              {freeVolunteers.map((volunteer) => (
                <option key={volunteer.id} value={volunteer.id}>
                  {volunteer.name}
                </option>
              ))}
            </select>
            <Button
              variant="secondary"
              className="min-h-10 w-full px-3 sm:w-auto sm:px-4"
              disabled={chosen === "" || missing.length > 0}
              loading={busy}
              onClick={assign}
            >
              <UserPlus className="h-4 w-4" />
              Assign
            </Button>
          </>
        )}
        {incident.status === "ASSIGNED" && (
          <Button
            variant="ghost"
            className="min-h-10 px-4"
            disabled={busy}
            onClick={() => void perform(() => api.release(incident.id, undefined, token))}
          >
            Release to queue
          </Button>
        )}
        <Button variant="danger" className="col-span-2 ml-auto min-h-10 w-full max-w-full px-4 sm:col-span-1 sm:w-auto" disabled={busy} onClick={cancel}>
          {armed ? "Tap again to cancel" : "Cancel request"}
        </Button>
      </div>
      {error && <p className="mt-2 text-sm text-red-300">{error}</p>}
    </motion.li>
  );
}

interface PriorityQueueProps {
  token: string;
  zoneFilter: string | null;
}

export default function PriorityQueue({ token, zoneFilter }: PriorityQueueProps) {
  const incidents = useLiveStore((state) => state.data.incidents);
  const volunteers = useLiveStore((state) => state.data.volunteers);
  const resources = useLiveStore((state) => state.data.resources);
  const now = useNow();
  const [seeding, setSeeding] = useState(false);

  const open = incidents.filter(
    (incident) => incident.status !== "RESOLVED" && incident.status !== "CANCELLED",
  );
  const visible = zoneFilter ? open.filter((incident) => incident.zone === zoneFilter) : open;
  const free = volunteers.filter((volunteer) => volunteer.status === "FREE");

  const seed = async () => {
    setSeeding(true);
    try {
      await api.seedDemo(token);
    } finally {
      setSeeding(false);
    }
  };

  return (
    <section className="min-w-0">
      <div className="mb-3 flex items-center gap-2 text-slate-400">
        <LayoutDashboard className="h-4 w-4" />
        <span className="text-xs font-medium uppercase tracking-wider">
          Priority queue{zoneFilter ? ` · ${zoneFilter}` : ""}
        </span>
      </div>

      {visible.length === 0 && (
        <div className="glass rounded-2xl border border-white/10 p-10 text-center">
          <p className="text-slate-400">
            {zoneFilter
              ? `No open incidents in ${zoneFilter}.`
              : "No open incidents. New SOS requests will appear here instantly."}
          </p>
          {!zoneFilter && incidents.length === 0 && (
            <Button variant="secondary" className="mt-5" loading={seeding} onClick={seed}>
              Load demo scenario
            </Button>
          )}
        </div>
      )}

      <ul className="min-w-0 space-y-3">
        <AnimatePresence initial={false}>
          {visible.map((incident) => (
            <QueueRow
              key={incident.id}
              incident={incident}
              rank={open.indexOf(incident) + 1}
              token={token}
              now={now}
              freeVolunteers={free}
              resources={resources}
            />
          ))}
        </AnimatePresence>
      </ul>
    </section>
  );
}
