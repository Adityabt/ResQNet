import { AnimatePresence, motion } from "framer-motion";
import { AlertOctagon, AlertTriangle, X } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

import { useLiveStore } from "../store/useLiveStore";

export default function AnnouncementBanner() {
  const announcements = useLiveStore((state) => state.data.announcements);
  const [dismissed, setDismissed] = useState<number[]>([]);

  const urgent = announcements.find(
    (item) => item.level !== "INFO" && !dismissed.includes(item.id),
  );

  return (
    <AnimatePresence>
      {urgent && (
        <motion.div
          key={urgent.id}
          initial={{ opacity: 0, y: -16, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -12, scale: 0.97 }}
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
          className={`pointer-events-auto flex w-full max-w-5xl items-center gap-3 rounded-2xl py-2 pl-3 pr-2 text-sm shadow-[0_18px_50px_-18px_rgba(0,0,0,0.8)] ring-1 backdrop-blur-2xl sm:rounded-full sm:pl-4 ${
            urgent.level === "CRITICAL"
              ? "bg-red-500/25 text-red-50 ring-red-300/40"
              : "bg-amber-500/20 text-amber-50 ring-amber-300/35"
          }`}
        >
          {urgent.level === "CRITICAL" ? (
            <AlertOctagon className="h-4 w-4 shrink-0" />
          ) : (
            <AlertTriangle className="h-4 w-4 shrink-0" />
          )}
          <p className="min-w-0 flex-1 truncate font-medium">{urgent.message}</p>
          <Link
            to="/updates"
            className="shrink-0 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold transition-colors hover:bg-white/25"
          >
            Details
          </Link>
          <button
            type="button"
            aria-label="Dismiss announcement"
            onClick={() => setDismissed((current) => [...current, urgent.id])}
            className="shrink-0 rounded-full p-1.5 opacity-70 transition-colors hover:bg-white/15 hover:opacity-100"
          >
            <X className="h-4 w-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
