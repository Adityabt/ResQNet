import { AnimatePresence, motion } from "framer-motion";
import { AlertOctagon, AlertTriangle, ChevronDown, Info, Phone } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useState } from "react";

import { useNow } from "../hooks/useNow";
import { agoLabel } from "../lib/format";
import { HELPLINES, SAFETY_TOPICS } from "../lib/safety";
import type { AnnouncementLevel, Resource } from "../lib/types";
import { useLiveStore } from "../store/useLiveStore";

const LEVEL_STYLES: Record<AnnouncementLevel, { icon: LucideIcon; box: string; label: string }> = {
  INFO: { icon: Info, box: "border-sky-400/25 bg-sky-500/10 text-sky-300", label: "Notice" },
  WARNING: {
    icon: AlertTriangle,
    box: "border-amber-400/30 bg-amber-500/10 text-amber-300",
    label: "Warning",
  },
  CRITICAL: {
    icon: AlertOctagon,
    box: "border-red-400/40 bg-red-500/10 text-red-300",
    label: "Critical",
  },
};

function stockTone(resource: Resource): string {
  if (resource.total === 0) {
    return "bg-slate-500";
  }
  const ratio = resource.available / resource.total;
  if (ratio <= 0.15) {
    return "bg-red-400";
  }
  return ratio <= 0.4 ? "bg-amber-400" : "bg-emerald-400";
}

function SupplyRow({ resource }: { resource: Resource }) {
  const percent = resource.total === 0 ? 0 : (resource.available / resource.total) * 100;
  return (
    <li>
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-slate-200">{resource.name}</span>
        <span className="font-mono text-xs text-slate-400">
          {resource.available} / {resource.total}
        </span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className={`h-full rounded-full ${stockTone(resource)}`}
        />
      </div>
    </li>
  );
}

export default function Updates() {
  const announcements = useLiveStore((state) => state.data.announcements);
  const resources = useLiveStore((state) => state.data.resources);
  const now = useNow();
  const [openTopic, setOpenTopic] = useState<string | null>(SAFETY_TOPICS[0].title);

  return (
    <div className="space-y-8 sm:space-y-10">
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-sky-300">Local response</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight md:text-4xl">Updates and guidance</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400 sm:text-base">
          Coordinator announcements, current supplies, emergency contacts, and practical safety advice.
        </p>
      </header>

      <section>
        <h2 className="mb-3 text-lg font-semibold tracking-tight">Announcements</h2>
        {announcements.length === 0 ? (
          <div className="glass rounded-[24px] border border-white/10 p-7 text-center text-sm leading-relaxed text-slate-400 sm:p-9">
            <p className="font-medium text-slate-200">No new announcements</p>
            <p className="mt-1">Important updates from the coordination team will appear here.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            <AnimatePresence initial={false}>
              {announcements.map((item) => {
                const style = LEVEL_STYLES[item.level];
                const Icon = style.icon;
                return (
                  <motion.li
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    className={`flex items-start gap-3 rounded-[20px] border p-4 sm:p-5 ${style.box}`}
                  >
                    <Icon className="mt-0.5 h-5 w-5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-100">{item.message}</p>
                      <p className="mt-1 text-xs opacity-80">
                        {style.label} · {agoLabel(item.created_at, now)}
                      </p>
                    </div>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        )}
      </section>

      <div className="grid items-stretch gap-4 sm:gap-5 lg:grid-cols-2">
        <section className="glass h-full rounded-[24px] border border-white/10 p-5 sm:p-6">
          <h2 className="mb-4 text-lg font-semibold tracking-tight">Supplies on hand</h2>
          {resources.length > 0 ? (
            <ul className="space-y-4">
              {resources.map((resource) => (
                <SupplyRow key={resource.id} resource={resource} />
              ))}
            </ul>
          ) : (
            <p className="text-sm leading-relaxed text-slate-400">
              Supply information will appear here when it is available.
            </p>
          )}
        </section>

        <section className="glass h-full rounded-[24px] border border-white/10 p-5 sm:p-6">
          <h2 className="mb-4 text-lg font-semibold tracking-tight">Emergency contacts</h2>
          <ul className="space-y-2">
            {HELPLINES.map((line) => (
              <li key={line.number}>
                <a
                  href={`tel:${line.number}`}
                  className="flex min-h-14 flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl bg-white/[0.04] px-4 py-3 transition-colors hover:bg-white/[0.08]"
                >
                  <Phone className="h-4 w-4 text-emerald-400" />
                  <span className="font-mono text-base font-semibold">{line.number}</span>
                  <span className="min-w-0 flex-1 text-sm text-slate-400">{line.label}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold tracking-tight">Safety guide</h2>
        <div className="space-y-2.5">
          {SAFETY_TOPICS.map((topic) => {
            const open = openTopic === topic.title;
            return (
              <div key={topic.title} className="glass overflow-hidden rounded-[20px] border border-white/10">
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => setOpenTopic(open ? null : topic.title)}
                  className="flex min-h-14 w-full items-center justify-between gap-4 px-5 py-3 text-left text-sm font-medium transition-colors hover:bg-white/[0.03]"
                >
                  {topic.title}
                  <ChevronDown
                    className={`h-4 w-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
                  />
                </button>
                <AnimatePresence initial={false}>
                  {open && (
                    <motion.ul
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="space-y-2 overflow-hidden px-5 pb-4 text-sm text-slate-300"
                    >
                      {topic.tips.map((tip) => (
                        <li key={tip} className="flex gap-2">
                          <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-slate-500" />
                          {tip}
                        </li>
                      ))}
                    </motion.ul>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
