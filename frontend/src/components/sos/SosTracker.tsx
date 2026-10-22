import { motion } from "framer-motion";
import { Check, MapPin, Phone, Radio } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useNow } from "../../hooks/useNow";
import { api } from "../../lib/api";
import { TYPE_LABELS, waitedLabel } from "../../lib/format";
import type { Incident, IncidentStatus } from "../../lib/types";
import { useLiveStore } from "../../store/useLiveStore";
import UrgencyBadge from "../UrgencyBadge";
import Button from "../ui/Button";

interface SosTrackerProps {
  incidentId: number;
  onNew: () => void;
}

const STEPS = [
  { title: "Request received", text: "Your SOS is on the live board." },
  { title: "Volunteer assigned", text: "A volunteer has taken your request." },
  { title: "Help is on the way", text: "They are heading to your location." },
  { title: "Resolved", text: "Your request has been closed." },
];

const WAITING_TIPS = [
  "Stay where you are if it is safe. Let the volunteer know if you need to move.",
  "Keep your phone on and nearby in case the volunteer needs to call.",
  "Leave this page open to see status changes as they come in.",
];

const ORDER: Record<IncidentStatus, number> = {
  PENDING: 0,
  ASSIGNED: 1,
  EN_ROUTE: 2,
  RESOLVED: 3,
  CANCELLED: -1,
};

function headline(incident: Incident, position: number): { title: string; text: string } {
  switch (incident.status) {
    case "PENDING":
      return {
        title: "We have your request",
        text:
          position === 1
            ? "You are next in the queue. A volunteer will be matched shortly."
            : position > 1
              ? `You are number ${position} in the queue. The most urgent cases go first.`
              : "Your request is being ranked.",
      };
    case "ASSIGNED":
      return {
        title: "A volunteer has your request",
        text: `${incident.volunteer_name ?? "A volunteer"} has accepted your request.`,
      };
    case "EN_ROUTE":
      return {
        title: "Help is on the way",
        text: `${incident.volunteer_name ?? "A volunteer"} is heading to ${incident.zone} now.`,
      };
    case "RESOLVED":
      return { title: "Request resolved", text: "Your request has been closed. Stay safe." };
    default:
      return { title: "Request cancelled", text: "This request was cancelled." };
  }
}

export default function SosTracker({ incidentId, onNew }: SosTrackerProps) {
  const incidents = useLiveStore((state) => state.data.incidents);
  const hasSnapshot = useLiveStore((state) => state.hasSnapshot);
  const now = useNow();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previous = useRef<IncidentStatus | null>(null);

  const incident = incidents.find((item) => item.id === incidentId);
  const status = incident?.status ?? null;

  useEffect(() => {
    if (
      previous.current !== null &&
      status !== null &&
      status !== previous.current &&
      "vibrate" in navigator
    ) {
      navigator.vibrate([120, 60, 120]);
    }
    previous.current = status;
  }, [status]);

  if (!incident) {
    if (!hasSnapshot) {
      return <div className="mx-auto h-64 max-w-xl animate-pulse rounded-2xl border border-white/10 bg-white/[0.03]" />;
    }
    return (
      <div className="glass mx-auto max-w-xl rounded-[24px] border border-white/10 p-6 text-center sm:p-8">
        <h1 className="text-xl font-semibold tracking-tight">We can’t find this request</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">
          It may no longer appear on the live board. You can send a new request.
        </p>
        <Button className="mt-6" onClick={onNew}>
          Send a new request
        </Button>
      </div>
    );
  }

  const pending = incidents.filter((item) => item.status === "PENDING");
  const position =
    incident.status === "PENDING" ? pending.findIndex((item) => item.id === incident.id) + 1 : 0;
  const reached = ORDER[incident.status];
  const resolved = incident.status === "RESOLVED";
  const cancelled = incident.status === "CANCELLED";
  const closed = resolved || cancelled;
  const message = headline(incident, position);
  const waitingUntil = closed ? Date.parse(incident.updated_at) : now;

  const cancel = async () => {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.cancel(incident.id);
      setConfirming(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not cancel the request");
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-xl space-y-4 sm:space-y-5"
    >
      <div className="glass rounded-[24px] border border-white/10 p-4 sm:p-6">
        <div className="flex items-center gap-4">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ring-1 ${
              resolved
                ? "bg-emerald-500/15 text-emerald-300 ring-emerald-400/30"
                : cancelled
                  ? "bg-zinc-500/15 text-zinc-400 ring-zinc-400/30"
                  : "bg-red-500/15 text-red-300 ring-red-400/30"
            }`}
          >
            {resolved ? <Check className="h-6 w-6" /> : <Radio className="h-6 w-6" />}
          </div>
          <div className="min-w-0">
            <div className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Request #{incident.id}
            </div>
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{message.title}</h1>
            <p className="mt-1 text-sm leading-relaxed text-slate-400">{message.text}</p>
          </div>
        </div>

        {!cancelled && (
          <ol className="mt-8 space-y-6">
            {STEPS.map((step, index) => {
              const done = resolved || index < reached;
              const active = !resolved && index === reached;
              return (
                <li key={step.title} className="relative flex gap-4">
                  {index < STEPS.length - 1 && (
                    <div className="absolute left-[15px] top-8 h-[calc(100%-0.5rem)] w-0.5 bg-white/10">
                      <motion.div
                        className="w-full bg-emerald-400"
                        initial={false}
                        animate={{ height: done ? "100%" : "0%" }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                  )}
                  <div
                    className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-1 ${
                      done
                        ? "bg-emerald-500 ring-emerald-300"
                        : active
                          ? "animate-pulse-ring bg-red-500 ring-red-300"
                          : "bg-slate-800 ring-white/15"
                    }`}
                  >
                    {done ? (
                      <Check className="h-4 w-4 text-white" />
                    ) : (
                      <span
                        className={`h-2 w-2 rounded-full ${active ? "bg-white" : "bg-slate-600"}`}
                      />
                    )}
                  </div>
                  <div>
                    <div
                      className={`text-sm font-medium ${
                        done || active ? "text-slate-100" : "text-slate-500"
                      }`}
                    >
                      {step.title}
                    </div>
                    <div className="text-xs text-slate-500">{step.text}</div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      <div className="glass space-y-4 rounded-[24px] border border-white/10 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <UrgencyBadge level={incident.urgency} />
          <span className="inline-flex items-center gap-1 text-sm text-slate-300">
            <MapPin className="h-4 w-4 text-slate-500" />
            {incident.zone}
          </span>
          <span className="text-sm text-slate-500">
            {TYPE_LABELS[incident.type]} · waited {waitedLabel(incident.created_at, waitingUntil)}
          </span>
        </div>

        {incident.resources.length > 0 && (
          <div className="text-sm text-slate-400">
            Requested:{" "}
            {incident.resources.map((item) => `${item.quantity} × ${item.name}`).join(", ")}
          </div>
        )}

        <div className="flex items-center justify-between gap-3 rounded-2xl bg-white/[0.04] px-4 py-3">
          <div>
            <div className="text-xs text-slate-500">Priority score</div>
            <div className="mt-0.5 font-mono text-[11px] text-slate-500">
              Urgency {incident.score.urgency} · Waiting {incident.score.waiting} · Resources{" "}
              {incident.score.resource}
            </div>
          </div>
          <div className="font-mono text-2xl font-semibold">{incident.score.total}</div>
        </div>
      </div>

      {!closed && (
        <div className="glass rounded-[24px] border border-white/10 p-4 sm:p-5">
          <h2 className="text-sm font-semibold tracking-tight">While you wait</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-400">
            {WAITING_TIPS.map((tip) => (
              <li key={tip} className="flex gap-2">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-slate-500" />
                {tip}
              </li>
            ))}
          </ul>
          <a
            href="tel:112"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-100 ring-1 ring-white/10 transition-colors hover:bg-white/10"
          >
            <Phone className="h-4 w-4 text-emerald-400" />
            Situation getting worse? Call 112
          </a>
        </div>
      )}

      {error && (
        <p className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300 ring-1 ring-red-400/30">
          {error}
        </p>
      )}

      {closed ? (
        <Button className="w-full" onClick={onNew}>
          Send another request
        </Button>
      ) : (
        incident.status === "PENDING" && (
          <Button className="w-full" variant="danger" loading={busy} onClick={cancel}>
            {confirming ? "Tap again to cancel this request" : "I no longer need help"}
          </Button>
        )
      )}
    </motion.div>
  );
}
