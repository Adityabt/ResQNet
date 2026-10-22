import { AnimatePresence } from "framer-motion";
import { MoonStar } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import ActiveTask from "../components/volunteer/ActiveTask";
import JoinCard from "../components/volunteer/JoinCard";
import RequestCard from "../components/volunteer/RequestCard";
import VolunteerHeader from "../components/volunteer/VolunteerHeader";
import { useNow } from "../hooks/useNow";
import { api } from "../lib/api";
import { useLiveStore } from "../store/useLiveStore";
import { useVolunteerStore } from "../store/useVolunteerStore";

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="glass rounded-[20px] border border-white/10 p-3 text-center sm:p-4">
      <div className="font-mono text-2xl font-semibold">{value}</div>
      <div className="mt-1 min-h-8 text-xs leading-4 text-slate-400">{label}</div>
    </div>
  );
}

export default function Volunteer() {
  const volunteerId = useVolunteerStore((state) => state.volunteerId);
  const name = useVolunteerStore((state) => state.name);
  const resolvedCount = useVolunteerStore((state) => state.resolvedCount);
  const join = useVolunteerStore((state) => state.join);
  const leave = useVolunteerStore((state) => state.leave);
  const addResolved = useVolunteerStore((state) => state.addResolved);

  const volunteers = useLiveStore((state) => state.data.volunteers);
  const incidents = useLiveStore((state) => state.data.incidents);
  const resources = useLiveStore((state) => state.data.resources);
  const hasSnapshot = useLiveStore((state) => state.hasSnapshot);
  const now = useNow();

  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toggling, setToggling] = useState(false);
  const [claimingId, setClaimingId] = useState<number | null>(null);
  const knownPending = useRef<Set<number> | null>(null);

  const me = volunteers.find((volunteer) => volunteer.id === volunteerId) ?? null;
  const pending = incidents.filter((incident) => incident.status === "PENDING");
  const activeTask =
    incidents.find(
      (incident) =>
        incident.volunteer_id === volunteerId &&
        (incident.status === "ASSIGNED" || incident.status === "EN_ROUTE"),
    ) ?? null;

  useEffect(() => {
    if (volunteerId !== null && hasSnapshot && !me) {
      leave();
      setNotice("Your volunteer profile was not found on the server. Please join again.");
    }
  }, [volunteerId, hasSnapshot, me, leave]);

  useEffect(() => {
    const ids = new Set(
      incidents.filter((incident) => incident.status === "PENDING").map((incident) => incident.id),
    );
    const previous = knownPending.current;
    if (previous && me?.status === "FREE" && "vibrate" in navigator) {
      const hasNew = [...ids].some((id) => !previous.has(id));
      if (hasNew) {
        navigator.vibrate(200);
      }
    }
    knownPending.current = ids;
  }, [incidents, me?.status]);

  const claim = async (incidentId: number) => {
    if (volunteerId === null) {
      return;
    }
    setClaimingId(incidentId);
    setError(null);
    try {
      await api.claim(incidentId, volunteerId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not claim this request.");
    } finally {
      setClaimingId(null);
    }
  };

  const toggleDuty = async () => {
    if (volunteerId === null || !me) {
      return;
    }
    setToggling(true);
    setError(null);
    try {
      await api.setDuty(volunteerId, me.status === "OFF_DUTY");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not change duty status.");
    } finally {
      setToggling(false);
    }
  };

  const signOut = async () => {
    if (volunteerId === null) {
      return;
    }
    if (me && me.status === "FREE") {
      try {
        await api.setDuty(volunteerId, false);
      } catch {
        setError("Could not go off duty before signing out. Please try again.");
        return;
      }
    }
    leave();
  };

  if (volunteerId === null) {
    return (
      <JoinCard
        notice={notice}
        onJoined={(id, volunteerName) => {
          setNotice(null);
          join(id, volunteerName);
        }}
      />
    );
  }

  const blockedReason = !me
    ? "Connecting to the network"
    : me.status === "OFF_DUTY"
      ? "You are off duty. Switch on duty to take a request."
      : me.status === "BUSY"
        ? "Finish your current task before taking another."
        : null;

  const freeVolunteers = volunteers.filter((volunteer) => volunteer.status === "FREE").length;

  return (
    <div className="mx-auto min-w-0 max-w-2xl space-y-5 sm:space-y-6">
      <VolunteerHeader
        name={name}
        status={me?.status ?? null}
        busy={toggling}
        onToggleDuty={toggleDuty}
        onSignOut={signOut}
      />

      {error && (
        <p className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300 ring-1 ring-red-400/30">
          {error}
        </p>
      )}

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Requests waiting" value={pending.length} />
        <Stat label="Volunteers free" value={freeVolunteers} />
        <Stat label="Resolved by you" value={resolvedCount} />
      </div>

      {me?.status === "OFF_DUTY" && (
        <div className="glass flex items-start gap-3 rounded-[20px] border border-white/10 p-4 text-sm leading-relaxed text-slate-300 sm:p-5">
          <MoonStar className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
          You are off duty. You can still look at requests, but you will not be assigned any until
          you switch back on duty.
        </div>
      )}

      {activeTask ? (
        <>
          <ActiveTask
            key={activeTask.id}
            incident={activeTask}
            volunteerId={volunteerId}
            now={now}
            onResolved={addResolved}
          />
          {pending.length > 0 && (
            <p className="text-center text-sm text-slate-500">
              {pending.length} {pending.length === 1 ? "request is" : "requests are"} still waiting.
              Complete this task to take another one.
            </p>
          )}
        </>
      ) : (
        <section>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">Requests needing help</h2>
              <p className="mt-1 text-sm text-slate-500">Sorted by priority. Choose one you can reach.</p>
            </div>
            <span className="shrink-0 rounded-full bg-white/[0.05] px-3 py-1 font-mono text-xs text-slate-300 ring-1 ring-white/10">
              {pending.length} waiting
            </span>
          </div>

          {!hasSnapshot && (
            <div className="h-32 animate-pulse rounded-2xl border border-white/10 bg-white/[0.03]" />
          )}

          {hasSnapshot && pending.length === 0 && (
            <div className="glass rounded-[24px] border border-white/10 p-8 text-center sm:p-10">
              <p className="font-medium text-slate-200">No requests are waiting</p>
              <p className="mx-auto mt-1 max-w-sm text-sm leading-relaxed text-slate-400">
                Stay on duty. We’ll alert you when a new request comes in.
              </p>
            </div>
          )}

          <ul className="min-w-0 space-y-3">
            <AnimatePresence initial={false}>
              {pending.map((incident, index) => (
                <RequestCard
                  key={incident.id}
                  incident={incident}
                  rank={index + 1}
                  resources={resources}
                  now={now}
                  blockedReason={blockedReason}
                  claiming={claimingId === incident.id}
                  onClaim={claim}
                />
              ))}
            </AnimatePresence>
          </ul>
        </section>
      )}
    </div>
  );
}
