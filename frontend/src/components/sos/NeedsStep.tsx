import type { Resource } from "../../lib/types";
import QuantityStepper from "../ui/QuantityStepper";

interface NeedsStepProps {
  resources: Resource[];
  quantities: Record<number, number>;
  description: string;
  onQuantity: (resourceId: number, value: number) => void;
  onDescription: (value: string) => void;
}

export default function NeedsStep({
  resources,
  quantities,
  description,
  onQuantity,
  onDescription,
}: NeedsStepProps) {
  return (
    <div className="space-y-6 sm:space-y-8">
      <section>
        <h2 className="text-sm font-medium text-slate-300">Supplies you need</h2>
        <p className="mb-3 mt-1 text-xs leading-relaxed text-slate-500">
          Optional. Availability updates live, and you can request only the quantity currently in stock.
        </p>
        {resources.length === 0 && (
          <div className="h-24 animate-pulse rounded-2xl border border-white/10 bg-white/[0.03]" />
        )}
        <ul className="space-y-2">
          {resources.map((resource) => {
            const quantity = quantities[resource.id] ?? 0;
            const outOfStock = resource.available === 0;
            return (
              <li
                key={resource.id}
                className={`flex items-center justify-between gap-3 rounded-[18px] border p-3.5 transition-colors ${
                  quantity > 0
                    ? "border-red-400/40 bg-red-500/5"
                    : "border-white/10 bg-white/[0.03]"
                }`}
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{resource.name}</div>
                  <div className={`text-xs ${outOfStock ? "text-red-400" : "text-slate-500"}`}>
                    {outOfStock ? "Out of stock right now" : `${resource.available} available`}
                  </div>
                </div>
                <QuantityStepper
                  value={quantity}
                  max={resource.available}
                  label={resource.name}
                  onChange={(value) => onQuantity(resource.id, value)}
                />
              </li>
            );
          })}
        </ul>
      </section>

      <section>
        <label className="block">
          <span className="text-sm font-medium text-slate-300">Help volunteers find you</span>
          <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">
            Add a floor, building, nearby landmark, or anything responders should know.
          </span>
          <textarea
            value={description}
            onChange={(event) => onDescription(event.target.value)}
            maxLength={300}
            rows={3}
            placeholder="For example: second floor, two children, no light"
            className="mt-2 w-full resize-none rounded-xl bg-white/5 px-4 py-3 text-base text-slate-100 ring-1 ring-white/10 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-red-400/60"
          />
        </label>
        <div className="mt-1 text-right font-mono text-xs text-slate-500">
          {description.length}/300
        </div>
      </section>
    </div>
  );
}
