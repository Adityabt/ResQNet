import { Minus, Plus } from "lucide-react";

interface QuantityStepperProps {
  value: number;
  min?: number;
  max: number;
  label: string;
  onChange: (value: number) => void;
}

const BUTTON_CLASS =
  "flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-slate-100 ring-1 ring-white/10 transition-colors hover:bg-white/15 disabled:opacity-30";

export default function QuantityStepper({
  value,
  min = 0,
  max,
  label,
  onChange,
}: QuantityStepperProps) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        aria-label={`Decrease ${label}`}
        disabled={value <= min}
        onClick={() => onChange(value - 1)}
        className={BUTTON_CLASS}
      >
        <Minus className="h-4 w-4" />
      </button>
      <span className="w-8 text-center font-mono text-lg font-semibold">{value}</span>
      <button
        type="button"
        aria-label={`Increase ${label}`}
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
        className={BUTTON_CLASS}
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}