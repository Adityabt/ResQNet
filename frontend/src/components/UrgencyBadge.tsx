import { urgencyStyle } from "../lib/format";

interface UrgencyBadgeProps {
  level: number;
}

export default function UrgencyBadge({ level }: UrgencyBadgeProps) {
  const style = urgencyStyle(level);
  const pulse = level === 5 ? "animate-pulse-ring" : "";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${style.bg} ${style.text} ${style.ring} ${pulse}`}
    >
      <span className="font-mono">{level}</span>
      {style.label}
    </span>
  );
}