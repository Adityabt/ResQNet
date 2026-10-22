import { Database, Download, FlaskConical, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";

import { api } from "../../lib/api";
import Button from "../ui/Button";

export default function DataTools({ token }: { token: string }) {
  const [busy, setBusy] = useState<"seed" | "reset" | "export" | null>(null);
  const [armed, setArmed] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!armed) {
      return undefined;
    }
    const timer = window.setTimeout(() => setArmed(false), 4000);
    return () => window.clearTimeout(timer);
  }, [armed]);

  const run = async (kind: "seed" | "reset" | "export", action: () => Promise<string>) => {
    setBusy(kind);
    setError(null);
    setMessage(null);
    try {
      setMessage(await action());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(null);
    }
  };

  const seed = () =>
    run("seed", async () => {
      const result = await api.seedDemo(token);
      return `Loaded ${result.incidents} incidents and ${result.volunteers} new volunteers.`;
    });

  const reset = () => {
    if (!armed) {
      setArmed(true);
      return;
    }
    setArmed(false);
    void run("reset", async () => {
      await api.resetDemo(token);
      return "Everything cleared and stock restored.";
    });
  };

  const exportCsv = () =>
    run("export", async () => {
      const blob = await api.exportCsv(token);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `resqnet-incidents-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      return "Incident report downloaded.";
    });

  return (
    <section className="glass rounded-2xl border border-white/10 p-5">
      <div className="mb-4 flex items-center gap-2 text-slate-400">
        <Database className="h-4 w-4" />
        <span className="text-xs font-medium uppercase tracking-wider">Demo and data</span>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <Button variant="secondary" loading={busy === "seed"} onClick={seed}>
          <FlaskConical className="h-4 w-4" />
          Load demo scenario
        </Button>
        <Button variant="secondary" loading={busy === "export"} onClick={exportCsv}>
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
        <Button variant="danger" loading={busy === "reset"} onClick={reset}>
          <RotateCcw className="h-4 w-4" />
          {armed ? "Tap again to wipe all data" : "Reset everything"}
        </Button>
      </div>
      <p className="mt-3 text-xs text-slate-500">
        The demo scenario adds 8 realistic incidents and 5 volunteers so you can show allocation
        live. Reset clears all incidents, volunteers and announcements.
      </p>
      {message && <p className="mt-3 text-sm text-emerald-300">{message}</p>}
      {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
    </section>
  );
}