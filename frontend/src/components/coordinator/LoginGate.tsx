import { motion } from "framer-motion";
import { Lock, ShieldCheck } from "lucide-react";
import { useState } from "react";

import { api } from "../../lib/api";
import Button from "../ui/Button";

interface LoginGateProps {
  onSuccess: (token: string) => void;
}

export default function LoginGate({ onSuccess }: LoginGateProps) {
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(0);

  const submit = async () => {
    if (!pin || loading) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await api.login(pin);
      onSuccess(result.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in. Please try again.");
      setPin("");
      setShake((count) => count + 1);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      key={shake}
      initial={{ opacity: 0, y: 16, x: 0 }}
      animate={{ opacity: 1, y: 0, x: shake > 0 ? [0, -10, 10, -8, 8, 0] : 0 }}
      transition={{ duration: 0.4 }}
      className="glass mx-auto mt-4 max-w-md rounded-[28px] border border-white/10 p-5 sm:mt-6 sm:p-7 md:p-8"
    >
      <div className="mb-5 flex items-center gap-3">
        <img src="/logo-128.png" alt="" width={44} height={44} className="h-11 w-11 object-contain" />
        <div>
          <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-sky-400">
            <ShieldCheck className="h-3.5 w-3.5" />
            Coordinator access
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Command center</h1>
        </div>
      </div>
      <p className="text-sm leading-relaxed text-slate-400">
        Manage requests, coordinate volunteers, update supplies, and share announcements. Enter your
        coordinator PIN to continue.
      </p>

      <label className="mt-6 block">
        <span className="mb-1.5 block text-sm font-medium text-slate-300">Coordinator PIN</span>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="password"
          inputMode="text"
            autoComplete="off"
            value={pin}
            onChange={(event) => setPin(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                void submit();
              }
            }}
            maxLength={64}
            placeholder="Enter PIN"
            className="w-full rounded-xl bg-white/5 py-3 pl-10 pr-4 text-base tracking-widest text-slate-100 ring-1 ring-white/10 placeholder:tracking-normal placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-400/60"
          />
        </div>
      </label>

      {error && (
        <p className="mt-3 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300 ring-1 ring-red-400/30">
          {error}
        </p>
      )}

      <Button className="mt-5 w-full" disabled={!pin} loading={loading} onClick={submit}>
        Unlock command center
      </Button>
    </motion.div>
  );
}
