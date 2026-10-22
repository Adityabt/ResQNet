import type { LucideIcon } from "lucide-react";

interface PagePlaceholderProps {
  icon: LucideIcon;
  title: string;
  text: string;
}

export default function PagePlaceholder({ icon: Icon, title, text }: PagePlaceholderProps) {
  return (
    <div className="glass mx-auto mt-10 max-w-md rounded-2xl border border-white/10 p-8 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-white/5 ring-1 ring-white/10">
        <Icon className="h-6 w-6 text-slate-300" />
      </div>
      <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-2 text-sm text-slate-400">{text}</p>
    </div>
  );
}