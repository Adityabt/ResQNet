import { motion } from "framer-motion";
import { LogOut, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import ActivityFeed from "../components/coordinator/ActivityFeed";
import AnnouncementComposer from "../components/coordinator/AnnouncementComposer";
import AutoAllocatePanel from "../components/coordinator/AutoAllocatePanel";
import DataTools from "../components/coordinator/DataTools";
import InsightsPanel from "../components/coordinator/InsightsPanel";
import LoginGate from "../components/coordinator/LoginGate";
import PriorityQueue from "../components/coordinator/PriorityQueue";
import StockPanel from "../components/coordinator/StockPanel";
import ZoneMap from "../components/coordinator/ZoneMap";
import Button from "../components/ui/Button";
import { api } from "../lib/api";
import { useCoordinatorStore } from "../store/useCoordinatorStore";
import { useLiveStore } from "../store/useLiveStore";

type Tab = "board" | "supplies" | "insights";

const TABS: { id: Tab; label: string }[] = [
  { id: "board", label: "Board" },
  { id: "supplies", label: "Supplies" },
  { id: "insights", label: "Insights" },
];

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="glass rounded-[20px] border border-white/10 p-3.5 text-center sm:p-4">
      <div className="font-mono text-2xl font-semibold md:text-3xl">{value}</div>
      <div className="mt-1 min-h-8 text-xs leading-4 text-slate-400">{label}</div>
    </div>
  );
}

export default function Dashboard() {
  const token = useCoordinatorStore((state) => state.token);
  const setToken = useCoordinatorStore((state) => state.setToken);
  const clear = useCoordinatorStore((state) => state.clear);
  const role = useLiveStore((state) => state.role);
  const snapshotSeq = useLiveStore((state) => state.snapshotSeq);
  const incidents = useLiveStore((state) => state.data.incidents);
  const volunteers = useLiveStore((state) => state.data.volunteers);
  const clients = useLiveStore((state) => state.clients);
  const [tab, setTab] = useState<Tab>("board");
  const [zoneFilter, setZoneFilter] = useState<string | null>(null);
  const [accessUrl, setAccessUrl] = useState<string | null>(null);
  const seqAtLogin = useRef<number | null>(null);

  useEffect(() => {
    let active = true;
    void fetch("/api/access")
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data: { url: string }) => {
        if (active) setAccessUrl(data.url);
      })
      .catch(() => {
        if (active) setAccessUrl(null);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!token) {
      seqAtLogin.current = null;
      return;
    }
    if (seqAtLogin.current === null) {
      seqAtLogin.current = useLiveStore.getState().snapshotSeq;
    }
  }, [token]);

  useEffect(() => {
    if (
      token &&
      role === "public" &&
      seqAtLogin.current !== null &&
      snapshotSeq > seqAtLogin.current
    ) {
      clear();
    }
  }, [token, role, snapshotSeq, clear]);

  if (!token) {
    return <LoginGate onSuccess={setToken} />;
  }

  if (role !== "coordinator") {
    return (
      <div className="mx-auto h-48 max-w-md animate-pulse rounded-2xl border border-white/10 bg-white/[0.03]" />
    );
  }

  const open = incidents.filter(
    (incident) => incident.status !== "RESOLVED" && incident.status !== "CANCELLED",
  );
  const critical = open.filter((incident) => incident.urgency === 5).length;
  const free = volunteers.filter((volunteer) => volunteer.status === "FREE").length;

  const signOut = async () => {
    await api.logout(token).catch(() => undefined);
    clear();
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sky-400">
            <ShieldCheck className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider">
              Coordinator session
            </span>
          </div>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight md:text-4xl">
            Command center
          </h1>
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-slate-400">
            Review requests, coordinate volunteers, and keep supplies and updates moving.
          </p>
        </div>
        <Button variant="secondary" className="min-h-10 px-4" onClick={signOut}>
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </header>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Open requests" value={open.length} />
        <Stat label="Critical requests" value={critical} />
        <Stat label="Available volunteers" value={free} />
        <Stat label="Connected devices" value={clients} />
      </div>

      <section className="glass flex flex-col items-center gap-4 rounded-2xl border border-white/10 p-5 sm:flex-row sm:items-center sm:p-6">
        <img
          src="/api/access/qr.png"
          alt="QR code to open ResQNet on another device"
          width={144}
          height={144}
          className="h-36 w-36 rounded-xl bg-white p-2"
        />
        <div className="min-w-0 text-center sm:text-left">
          <h2 className="text-lg font-semibold">Share ResQNet access</h2>
          <p className="mt-1 text-sm leading-relaxed text-slate-400">
            Scan this code to open the public ResQNet app. Local installs require the same Wi-Fi or hotspot; hosted installs work over the internet.
          </p>
          <p className="mt-3 break-all rounded-lg bg-black/20 px-3 py-2 font-mono text-sm text-sky-300">
            {accessUrl ?? "Loading connection address…"}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-slate-500">
            This is a local-network address. It can change when the host joins a different network or receives a new DHCP address.
          </p>
        </div>
      </section>

      <div className="flex gap-1.5 overflow-x-auto rounded-2xl bg-white/[0.04] p-1.5 ring-1 ring-white/10">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            aria-pressed={tab === item.id}
            className="relative min-h-10 flex-1 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
          >
            {tab === item.id && (
              <motion.span
                layoutId="dashboard-tab"
                className="absolute inset-0 rounded-lg bg-white/10"
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
              />
            )}
            <span className={`relative ${tab === item.id ? "text-white" : "text-slate-400"}`}>
              {item.label}
            </span>
          </button>
        ))}
      </div>

      {tab === "board" && (
        <div className="space-y-6">
          <AutoAllocatePanel token={token} />
          <ZoneMap selected={zoneFilter} onSelect={setZoneFilter} />
          <PriorityQueue token={token} zoneFilter={zoneFilter} />
        </div>
      )}

      {tab === "supplies" && (
        <div className="grid gap-6 md:grid-cols-2">
          <StockPanel token={token} />
          <AnnouncementComposer token={token} />
        </div>
      )}

      {tab === "insights" && (
        <div className="space-y-6">
          <InsightsPanel />
          <div className="grid gap-6 md:grid-cols-2">
            <ActivityFeed />
            <DataTools token={token} />
          </div>
        </div>
      )}
    </div>
  );
}
