import { AnimatePresence, motion } from "framer-motion";
import { Bell, Check, RotateCcw, Siren } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

import type { EventLogEntry } from "../lib/types";
import { useLiveStore } from "../store/useLiveStore";

type Tone = "alert" | "info" | "success" | "warn";

interface Toast {
  id: number;
  tone: Tone;
  title: string;
  text: string;
}

const TONES: Record<Tone, { icon: LucideIcon; box: string }> = {
  alert: { icon: Siren, box: "bg-red-500/15 text-red-300 ring-red-400/30" },
  info: { icon: Bell, box: "bg-sky-500/15 text-sky-300 ring-sky-400/30" },
  success: { icon: Check, box: "bg-emerald-500/15 text-emerald-300 ring-emerald-400/30" },
  warn: { icon: RotateCcw, box: "bg-amber-500/15 text-amber-300 ring-amber-400/30" },
};

const VISIBLE_MS = 5000;
const MAX_TOASTS = 4;

function describe(event: EventLogEntry): Omit<Toast, "id"> | null {
  switch (event.event_type) {
    case "INCIDENT_CREATED":
      return { tone: "alert", title: "New SOS", text: event.details };
    case "INCIDENT_ASSIGNED":
      return { tone: "info", title: "Volunteer assigned", text: event.details };
    case "INCIDENT_EN_ROUTE":
      return { tone: "info", title: "Help is on the way", text: "A volunteer is heading out." };
    case "INCIDENT_RESOLVED":
      return { tone: "success", title: "Incident resolved", text: "A request was closed." };
    case "INCIDENT_RELEASED":
      return { tone: "warn", title: "Back in the queue", text: "A volunteer released a request." };
    case "INCIDENT_CANCELLED":
      return { tone: "warn", title: "Request cancelled", text: "A request was withdrawn." };
    case "VOLUNTEER_JOINED":
      return { tone: "info", title: "Volunteer joined", text: event.details };
    case "AUTO_ALLOCATE":
      return { tone: "info", title: "Auto-allocate ran", text: event.details };
    case "STOCK_UPDATED":
      return { tone: "info", title: "Stock updated", text: event.details };
    default:
      return null;
  }
}

export default function Toaster() {
  const freshEvents = useLiveStore((state) => state.freshEvents);
  const { pathname } = useLocation();
  const staffView = pathname.startsWith("/dashboard") || pathname.startsWith("/volunteer");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seen = useRef<Set<number>>(new Set());
  const timers = useRef<number[]>([]);

  useEffect(() => {
    if (!staffView || freshEvents.length === 0) {
      return;
    }
    const incoming: Toast[] = [];
    for (const event of [...freshEvents].reverse()) {
      if (seen.current.has(event.id)) {
        continue;
      }
      seen.current.add(event.id);
      const info = describe(event);
      if (info) {
        incoming.push({ id: event.id, ...info });
      }
    }
    if (incoming.length === 0) {
      return;
    }
    setToasts((current) => [...current, ...incoming].slice(-MAX_TOASTS));
    for (const toast of incoming) {
      timers.current.push(
        window.setTimeout(() => {
          setToasts((current) => current.filter((item) => item.id !== toast.id));
        }, VISIBLE_MS),
      );
    }
  }, [freshEvents, staffView]);

  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed right-4 top-20 z-50 flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2"
    >
      <AnimatePresence>
        {toasts.map((toast) => {
          const tone = TONES[toast.tone];
          const Icon = tone.icon;
          return (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, x: 48, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 48 }}
              transition={{ type: "spring", stiffness: 420, damping: 32 }}
              className="glass pointer-events-auto flex items-start gap-3 rounded-2xl border border-white/10 p-3 shadow-xl"
            >
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ${tone.box}`}
              >
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium">{toast.title}</div>
                <div className="truncate text-xs text-slate-400">{toast.text}</div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}