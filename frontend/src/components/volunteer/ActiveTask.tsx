import { motion } from "framer-motion";
import { MapPin, Phone, Users } from "lucide-react";
import { useEffect, useState } from "react";

import { api } from "../../lib/api";
import { TYPE_LABELS, waitedLabel } from "../../lib/format";
import type { Contact, Incident } from "../../lib/types";
import UrgencyBadge from "../UrgencyBadge";
import Button from "../ui/Button";
import StepProgress from "../ui/StepProgress";

type Armed = "release" | "resolve" | null;

interface ActiveTaskProps {
  incident: Incident;
  volunteerId: number;
  now: number;
  onResolved: () => void;
}

export default function ActiveTask({ incident, volunteerId, now, onResolved }: ActiveTaskProps) {
  const [armed, setArmed] = useState<Armed>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contact, setContact] = useState<Contact | null>(null);
  const enRoute = incident.status === "EN_ROUTE";

  useEffect(() => {
    let active = true;
    api
      .contact(incident.id, volunteerId)
      .then((value) => {
        if (active) {
          setContact(value);
        }
      })
      .catch(() => {
        if (active) {
          setContact(null);
        }
      });
    return () => {
      active = false;
    };
  }, [incident.id, volunteerId]);

  useEffect(() => {
    if (armed === null) {
      return undefined;
    }
    const timer = window.setTimeout(() => setArmed(null), 4000);
    return () => window.clearTimeout(timer);
  }, [armed]);

  const perform = async (action: () => Promise<unknown>, after?: () => void) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      setArmed(null);
      after?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const start = () => {
    void perform(() => api.setStatus(incident.id, "EN_ROUTE", volunteerId));
  };

  const resolve = () => {
    if (armed !== "resolve") {
      setArmed("resolve");
      return;
    }
    void perform(() => api.setStatus(incident.id, "RESOLVED", volunteerId), onResolved);
  };

  const release = () => {
    if (armed !== "release") {
      setArmed("release");
      return;
    }
    void perform(() => api.release(incident.id, volunteerId));
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass space-y-5 rounded-[24px] border border-red-400/30 p-4 sm:p-6"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-medium uppercase tracking-wider text-red-400">
            Active request
          </div>
          <h2 className="mt-1 truncate text-xl font-semibold tracking-tight">
            {contact?.citizen_name ?? "Citizen"} needs you
          </h2>
        </div>
        <UrgencyBadge level={incident.urgency} />
      </div>

      <div>
        <StepProgress current={enRoute ? 1 : 0} total={3} />
        <div className="mt-2 grid grid-cols-3 text-[11px] text-slate-500">
          <span>Assigned</span>
          <span className="text-center">On the way</span>
          <span className="text-right">Resolved</span>
        </div>
      </div>

      <div className="space-y-2 text-sm text-slate-300">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-slate-500" />
          Go to {incident.zone}
        </div>
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-slate-500" />
          {incident.people_count} {incident.people_count === 1 ? "person" : "people"} ·{" "}
          {TYPE_LABELS[incident.type]} · waiting {waitedLabel(incident.created_at, now)}
        </div>
        {incident.description && (
          <p className="rounded-xl bg-white/[0.04] px-4 py-3 text-slate-300">
            {incident.description}
          </p>
        )}
      </div>

      {incident.resources.length > 0 && (
        <div className="rounded-xl bg-white/[0.04] px-4 py-3 text-sm">
          <div className="text-xs text-slate-500">Bring with you</div>
          <div className="mt-1 text-slate-200">
            {incident.resources.map((item) => `${item.quantity} × ${item.name}`).join(", ")}
          </div>
        </div>
      )}

      {contact?.phone ? (
        <a
          href={`tel:${contact.phone}`}
          className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-500/15 px-5 text-sm font-semibold text-emerald-300 ring-1 ring-emerald-400/30 transition-colors hover:bg-emerald-500/25"
        >
          <Phone className="h-4 w-4" />
          Call {contact.phone}
        </a>
      ) : (
        contact && (
          <p className="rounded-xl bg-white/[0.04] px-4 py-3 text-sm text-slate-400">
            No phone number was given. Go to the zone and ask around for {contact.citizen_name}.
          </p>
        )
      )}

      {error && (
        <p className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300 ring-1 ring-red-400/30">
          {error}
        </p>
      )}

      {enRoute ? (
        <Button className="w-full" loading={busy} onClick={resolve}>
          {armed === "resolve" ? "Tap again to confirm" : "Mark as resolved"}
        </Button>
      ) : (
        <div className="flex gap-3">
          <Button className="flex-1" loading={busy} onClick={start}>
            I am on my way
          </Button>
          <Button variant="danger" disabled={busy} onClick={release}>
            {armed === "release" ? "Tap again" : "Hand back"}
          </Button>
        </div>
      )}
    </motion.section>
  );
}
