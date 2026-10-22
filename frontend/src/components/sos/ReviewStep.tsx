import { ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";

import { TYPE_LABELS } from "../../lib/format";
import { isPhoneValid } from "../../lib/sos";
import type { SosDraft } from "../../lib/sos";
import type { Resource } from "../../lib/types";
import UrgencyBadge from "../UrgencyBadge";

interface ReviewStepProps {
  draft: SosDraft;
  resources: Resource[];
  onName: (value: string) => void;
  onPhone: (value: string) => void;
}

const INPUT_CLASS =
  "w-full rounded-xl bg-white/5 px-4 py-3 text-base text-slate-100 ring-1 ring-white/10 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-red-400/60";

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-3">
      <dt className="shrink-0 text-slate-400">{label}</dt>
      <dd className="min-w-0 break-words text-right font-medium">{children}</dd>
    </div>
  );
}

export default function ReviewStep({ draft, resources, onName, onPhone }: ReviewStepProps) {
  const phoneInvalid = !isPhoneValid(draft.phone);

  const requested = Object.entries(draft.resources)
    .filter(([, quantity]) => quantity > 0)
    .map(([id, quantity]) => {
      const found = resources.find((resource) => resource.id === Number(id));
      return `${quantity} × ${found?.name ?? "Item"}`;
    });

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-300">Your name</span>
          <input
            value={draft.name}
            onChange={(event) => onName(event.target.value)}
            maxLength={60}
            autoComplete="name"
            placeholder="For example: Jiya"
            className={INPUT_CLASS}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-300">
            Phone number <span className="font-normal text-slate-500">(recommended)</span>
          </span>
          <input
            value={draft.phone}
            onChange={(event) => onPhone(event.target.value)}
            inputMode="tel"
            autoComplete="tel"
            placeholder="98765 43210"
            className={INPUT_CLASS}
          />
          <span className="mt-1.5 block text-xs leading-relaxed text-slate-500">
            Your volunteer can call if they need help finding you.
          </span>
          {phoneInvalid && (
            <span className="mt-1.5 block text-xs text-red-400">
              Enter 10 to 13 digits, with an optional + at the start.
            </span>
          )}
        </label>
      </div>

      <dl className="glass divide-y divide-white/10 rounded-[20px] border border-white/10 text-sm">
        <Row label="Location">{draft.zone}</Row>
        <Row label="Emergency">{draft.type ? TYPE_LABELS[draft.type] : "-"}</Row>
        <Row label="Urgency">{draft.urgency ? <UrgencyBadge level={draft.urgency} /> : "-"}</Row>
        <Row label="People">{draft.people}</Row>
        <Row label="Supplies">{requested.length > 0 ? requested.join(", ") : "None requested"}</Row>
      </dl>

      <p className="flex items-start gap-2 text-xs leading-relaxed text-slate-500">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Your name and number are hidden from other citizens and volunteers. Only the volunteer who
        takes your request and the coordinator can see them.
      </p>
    </div>
  );
}
