import { motion } from "framer-motion";
import { Check, HeartHandshake } from "lucide-react";
import { useState } from "react";

import { api } from "../../lib/api";
import Button from "../ui/Button";

interface JoinCardProps {
  onJoined: (id: number, name: string) => void;
  notice: string | null;
}

const PROMISES = [
  "See requests ordered by priority",
  "Take one request at a time",
  "Keep the person updated as you respond",
];

export default function JoinCard({ onJoined, notice }: JoinCardProps) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const trimmed = name.trim();

  const join = async () => {
    if (!trimmed || loading) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const volunteer = await api.joinVolunteer(trimmed);
      onJoined(volunteer.id, volunteer.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not join. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass mx-auto mt-4 max-w-lg rounded-[28px] border border-white/10 p-5 sm:mt-6 sm:p-7 md:p-8"
    >
      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-400/30">
        <HeartHandshake className="h-6 w-6" />
      </div>
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Join the local response team</h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-400">
        Join with your name, review incoming requests, and choose one you can help with.
      </p>

      <ul className="mt-5 space-y-2.5">
        {PROMISES.map((item) => (
          <li key={item} className="flex items-start gap-2.5 text-sm leading-relaxed text-slate-300">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
            {item}
          </li>
        ))}
      </ul>

      {notice && (
        <p className="mt-4 rounded-xl bg-amber-500/10 px-4 py-3 text-sm text-amber-300 ring-1 ring-amber-400/30">
          {notice}
        </p>
      )}

      <label className="mt-6 block">
        <span className="mb-1.5 block text-sm font-medium text-slate-300">Your name</span>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              void join();
            }
          }}
          maxLength={60}
          autoComplete="name"
          className="w-full rounded-xl bg-white/5 px-4 py-3 text-base text-slate-100 ring-1 ring-white/10 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-400/60"
        />
      </label>

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

      <Button className="mt-5 w-full" disabled={!trimmed} loading={loading} onClick={join}>
        Join the response team
      </Button>
    </motion.div>
  );
}
