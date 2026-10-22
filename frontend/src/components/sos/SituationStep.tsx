import { motion } from "framer-motion";
import { LifeBuoy, Package, Stethoscope, Tent, Utensils } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { TYPE_LABELS, urgencyStyle } from "../../lib/format";
import type { IncidentType } from "../../lib/types";
import QuantityStepper from "../ui/QuantityStepper";

const TYPE_ICONS: Record<IncidentType, LucideIcon> = {
  MEDICAL: Stethoscope,
  RESCUE: LifeBuoy,
  FOOD_WATER: Utensils,
  SHELTER: Tent,
  OTHER: Package,
};

const TYPE_HINTS: Record<IncidentType, string> = {
  MEDICAL: "Injury or illness",
  RESCUE: "Trapped or in danger",
  FOOD_WATER: "Hungry or thirsty",
  SHELTER: "Need a safe place",
  OTHER: "Something else",
};

const URGENCY_LEVELS = [1, 2, 3, 4, 5];

const URGENCY_HINTS: Record<number, string> = {
  1: "Low: safe for now, support would help",
  2: "Moderate: help needed within a few hours",
  3: "Serious: the situation is getting worse",
  4: "Severe: injury or major risk, help needed soon",
  5: "Critical: a life is at risk right now",
};

interface SituationStepProps {
  types: IncidentType[];
  type: IncidentType | null;
  urgency: number | null;
  people: number;
  onType: (type: IncidentType) => void;
  onUrgency: (level: number) => void;
  onPeople: (count: number) => void;
}

export default function SituationStep({
  types,
  type,
  urgency,
  people,
  onType,
  onUrgency,
  onPeople,
}: SituationStepProps) {
  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-3 text-sm font-medium text-slate-300">What kind of help do you need?</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {types.map((item) => {
            const Icon = TYPE_ICONS[item];
            const selected = item === type;
            return (
              <motion.button
                key={item}
                type="button"
                whileTap={{ scale: 0.97 }}
                onClick={() => onType(item)}
                className={`flex min-h-24 flex-col items-start justify-between gap-3 rounded-[20px] border p-4 text-left transition-colors ${
                  selected
                    ? "border-red-400/60 bg-red-500/10"
                    : "border-white/10 bg-white/[0.03] hover:border-white/25"
                }`}
              >
                <Icon className={`h-5 w-5 ${selected ? "text-red-400" : "text-slate-500"}`} />
                <span>
                  <span className="block text-sm font-medium">{TYPE_LABELS[item]}</span>
                  <span className="block text-xs text-slate-500">{TYPE_HINTS[item]}</span>
                </span>
              </motion.button>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-1 text-sm font-medium text-slate-300">How urgent is it?</h2>
        <p className="mb-3 text-xs leading-relaxed text-slate-500">
          Choose the level that best describes the risk. Urgency, wait time, and supply needs inform priority.
        </p>
        <div className="grid grid-cols-5 gap-2">
          {URGENCY_LEVELS.map((level) => {
            const style = urgencyStyle(level);
            const selected = level === urgency;
            return (
              <motion.button
                key={level}
                type="button"
                whileTap={{ scale: 0.94 }}
                onClick={() => onUrgency(level)}
                className={`flex h-14 items-center justify-center rounded-xl font-mono text-lg font-semibold ring-1 transition-colors ${
                  selected
                    ? `${style.bg} ${style.text} ${style.ring} ring-2`
                    : "bg-white/[0.03] text-slate-400 ring-white/10"
                }`}
              >
                {level}
              </motion.button>
            );
          })}
        </div>
        <p className="mt-3 min-h-10 text-sm leading-relaxed text-slate-400">
          {urgency ? URGENCY_HINTS[urgency] : "Pick the level that fits best"}
        </p>
      </section>

      <section className="flex items-center justify-between gap-3 rounded-[20px] border border-white/10 bg-white/[0.03] p-4">
        <div className="min-w-0">
          <div className="text-sm text-slate-300">People who need help</div>
          <div className="text-xs text-slate-500">Include yourself</div>
        </div>
        <QuantityStepper value={people} min={1} max={50} label="people" onChange={onPeople} />
      </section>
    </div>
  );
}
