import { Megaphone, X } from "lucide-react";
import { useState } from "react";

import { useNow } from "../../hooks/useNow";
import { api } from "../../lib/api";
import { agoLabel } from "../../lib/format";
import type { AnnouncementLevel } from "../../lib/types";
import { useLiveStore } from "../../store/useLiveStore";
import Button from "../ui/Button";

const LEVELS: { value: AnnouncementLevel; label: string }[] = [
  { value: "INFO", label: "Notice" },
  { value: "WARNING", label: "Warning" },
  { value: "CRITICAL", label: "Critical" },
];

export default function AnnouncementComposer({ token }: { token: string }) {
  const announcements = useLiveStore((state) => state.data.announcements);
  const now = useNow();
  const [message, setMessage] = useState("");
  const [level, setLevel] = useState<AnnouncementLevel>("INFO");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.postAnnouncement(message.trim(), level, token);
      setMessage("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not post the announcement");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: number) => {
    try {
      await api.deleteAnnouncement(id, token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove the announcement");
    }
  };

  return (
    <section className="glass rounded-2xl border border-white/10 p-5">
      <div className="mb-3 flex items-center gap-2 text-slate-400">
        <Megaphone className="h-4 w-4" />
        <span className="text-xs font-medium uppercase tracking-wider">Announcements</span>
      </div>

      <textarea
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        maxLength={280}
        rows={2}
        placeholder="Message to every citizen and volunteer on the network"
        className="w-full resize-none rounded-xl bg-white/5 p-3 text-sm text-slate-100 ring-1 ring-white/10 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-400/60"
      />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1.5">
          {LEVELS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setLevel(item.value)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium ring-1 transition-colors ${
                level === item.value
                  ? "bg-white/15 text-white ring-white/30"
                  : "text-slate-400 ring-white/10 hover:bg-white/5"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <Button
          className="min-h-10 px-4"
          disabled={message.trim().length < 3}
          loading={busy}
          onClick={send}
        >
          Broadcast
        </Button>
      </div>
      {error && <p className="mt-3 text-sm text-red-300">{error}</p>}

      {announcements.length > 0 && (
        <ul className="mt-4 space-y-2">
          {announcements.map((item) => (
            <li
              key={item.id}
              className="flex items-start justify-between gap-3 rounded-xl bg-white/[0.04] px-4 py-2.5 text-sm"
            >
              <span className="min-w-0 text-slate-200">
                {item.message}
                <span className="ml-2 text-xs text-slate-500">
                  {item.level.toLowerCase()} · {agoLabel(item.created_at, now)}
                </span>
              </span>
              <button
                type="button"
                aria-label="Remove announcement"
                onClick={() => void remove(item.id)}
                className="shrink-0 rounded-md p-1 text-slate-500 hover:bg-white/10 hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}