import { AnimatePresence, motion } from "framer-motion";
import type { Variants } from "framer-motion";
import { ArrowLeft, ArrowRight, Phone, Send, ShieldCheck, Siren } from "lucide-react";
import { useState } from "react";

import NeedsStep from "../components/sos/NeedsStep";
import ReviewStep from "../components/sos/ReviewStep";
import SituationStep from "../components/sos/SituationStep";
import SosTracker from "../components/sos/SosTracker";
import ZoneStep from "../components/sos/ZoneStep";
import Button from "../components/ui/Button";
import StepProgress from "../components/ui/StepProgress";
import { useMeta } from "../hooks/useMeta";
import { api } from "../lib/api";
import {
  EMPTY_DRAFT,
  STEP_SUBTITLES,
  STEP_TITLES,
  canContinue,
  cleanPhone,
  toBody,
} from "../lib/sos";
import type { SosDraft } from "../lib/sos";
import { useLiveStore } from "../store/useLiveStore";
import { useSessionStore } from "../store/useSessionStore";

const SLIDE: Variants = {
  enter: (direction: number) => ({ opacity: 0, x: direction * 40, scale: 0.98 }),
  center: { opacity: 1, x: 0, scale: 1 },
  exit: (direction: number) => ({ opacity: 0, x: direction * -40, scale: 0.98 }),
};

export default function Sos() {
  const trackedId = useSessionStore((state) => state.trackedIncidentId);
  const savedName = useSessionStore((state) => state.citizenName);
  const savedPhone = useSessionStore((state) => state.citizenPhone);
  const track = useSessionStore((state) => state.track);
  const clearTracked = useSessionStore((state) => state.clearTracked);
  const resources = useLiveStore((state) => state.data.resources);
  const { meta, error: metaError } = useMeta();

  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [draft, setDraft] = useState<SosDraft>(() => ({
    ...EMPTY_DRAFT,
    name: savedName,
    phone: savedPhone,
  }));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (patch: Partial<SosDraft>) => {
    setDraft((current) => ({ ...current, ...patch }));
  };

  const setQuantity = (resourceId: number, value: number) => {
    setDraft((current) => {
      const next = { ...current.resources };
      if (value <= 0) {
        delete next[resourceId];
      } else {
        next[resourceId] = value;
      }
      return { ...current, resources: next };
    });
  };

  const goTo = (target: number, heading: number) => {
    setDirection(heading);
    setStep(target);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submit = async () => {
    if (!canContinue(3, draft)) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const created = await api.createIncident(toBody(draft));
      track(created.id, draft.name.trim(), cleanPhone(draft.phone));
      setDraft({ ...EMPTY_DRAFT, name: draft.name.trim(), phone: cleanPhone(draft.phone) });
      setStep(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (trackedId !== null) {
    return <SosTracker incidentId={trackedId} onNew={clearTracked} />;
  }

  if (!meta) {
    return (
      <div className="mx-auto max-w-xl">
        {metaError ? (
          <p className="rounded-2xl bg-red-500/10 px-4 py-4 text-sm leading-relaxed text-red-300 ring-1 ring-red-400/30">
            {metaError}
          </p>
        ) : (
          <div className="h-64 animate-pulse rounded-[28px] border border-white/10 bg-white/[0.03] sm:h-72" />
        )}
      </div>
    );
  }

  const lastStep = STEP_TITLES.length - 1;
  const allowed = canContinue(step, draft);

  const content =
    step === 0 ? (
      <ZoneStep zones={meta.zones} value={draft.zone} onChange={(zone) => update({ zone })} />
    ) : step === 1 ? (
      <SituationStep
        types={meta.incident_types}
        type={draft.type}
        urgency={draft.urgency}
        people={draft.people}
        onType={(type) => update({ type })}
        onUrgency={(urgency) => update({ urgency })}
        onPeople={(people) => update({ people })}
      />
    ) : step === 2 ? (
      <NeedsStep
        resources={resources}
        quantities={draft.resources}
        description={draft.description}
        onQuantity={setQuantity}
        onDescription={(description) => update({ description })}
      />
    ) : (
      <ReviewStep
        draft={draft}
        resources={resources}
        onName={(name) => update({ name })}
        onPhone={(phone) => update({ phone })}
      />
    );

  return (
    <div className="mx-auto max-w-xl">
      <a
        href="tel:112"
        className="mb-6 flex items-start gap-3 rounded-2xl bg-red-500/10 px-4 py-3.5 text-sm leading-relaxed text-red-100 ring-1 ring-red-300/30 backdrop-blur-xl transition-colors hover:bg-red-500/15 sm:items-center sm:rounded-full sm:px-5"
      >
        <Phone className="h-4 w-4 shrink-0 text-red-300" />
        <span className="flex-1">
          <span className="font-semibold">Life in immediate danger?</span> Call 112 first, then send
          your request here.
        </span>
      </a>

      <div className="mb-6 flex items-start gap-3 sm:items-center sm:gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-500/15 text-red-300 ring-1 ring-red-300/30">
          <Siren className="h-6 w-6" />
        </div>
        <div className="min-w-0">
          <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
            Step {step + 1} of {STEP_TITLES.length}
          </div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{STEP_TITLES[step]}</h1>
          <p className="mt-1 text-sm leading-relaxed text-slate-400">{STEP_SUBTITLES[step]}</p>
        </div>
      </div>

      <StepProgress current={step} total={STEP_TITLES.length} />

      <div className="mt-6 min-h-[16rem] sm:min-h-[20rem]">
        <AnimatePresence mode="wait" custom={direction} initial={false}>
          <motion.div
            key={step}
            custom={direction}
            variants={SLIDE}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: "spring", stiffness: 340, damping: 32 }}
          >
            {content}
          </motion.div>
        </AnimatePresence>
      </div>

      {error && (
        <p className="mt-4 rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-300 ring-1 ring-red-400/30">
          {error}
        </p>
      )}

      <p className="mt-5 flex items-start gap-2 text-xs leading-relaxed text-slate-500">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Takes about 30 seconds. Your name and number are shown only to the volunteer who takes your
        request.
      </p>

      <div className="glass-pill sticky bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-10 mt-4 flex gap-2 rounded-full p-2 xl:bottom-4">
        {step > 0 && (
          <Button variant="secondary" onClick={() => goTo(step - 1, -1)}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        )}
        {step < lastStep ? (
          <Button className="flex-1" disabled={!allowed} onClick={() => goTo(step + 1, 1)}>
            Continue
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            className="flex-1"
            variant="emergency"
            disabled={!allowed}
            loading={submitting}
            onClick={submit}
          >
            <Send className="h-4 w-4" />
            Send SOS
          </Button>
        )}
      </div>
    </div>
  );
}
