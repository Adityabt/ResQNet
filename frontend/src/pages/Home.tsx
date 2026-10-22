import { motion } from "framer-motion";
import {
  Activity,
  ArrowRight,
  BellRing,
  HeartHandshake,
  LayoutDashboard,
  ListChecks,
  Radio,
  Send,
  ShieldCheck,
  Siren,
  Users,
  Wifi,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";

import { useHostStore } from "../store/useHostStore";
import { useLiveStore } from "../store/useLiveStore";

interface RoleCard {
  to: string;
  title: string;
  text: string;
  cta: string;
  icon: LucideIcon;
  tile: string;
  glow: string;
}

interface InfoCard {
  title: string;
  text: string;
  icon: LucideIcon;
}

const PUBLIC_CARDS: RoleCard[] = [
  {
    to: "/sos",
    title: "Request help",
    text: "Tell nearby responders where you are and what you need, then follow your request as help is assigned.",
    cta: "Start a request",
    icon: Siren,
    tile: "bg-red-500/15 text-red-300 ring-red-300/30",
    glow: "bg-red-500/25",
  },
  {
    to: "/volunteer",
    title: "Volunteer",
    text: "Review open requests, choose one you can reach, and keep the requester informed as you respond.",
    cta: "View requests",
    icon: HeartHandshake,
    tile: "bg-emerald-500/15 text-emerald-300 ring-emerald-300/30",
    glow: "bg-emerald-500/20",
  },
  {
    to: "/updates",
    title: "View updates",
    text: "Read coordinator announcements, check supply availability, and find emergency contacts and safety guidance.",
    cta: "Read updates",
    icon: BellRing,
    tile: "bg-sky-500/15 text-sky-300 ring-sky-300/30",
    glow: "bg-sky-500/20",
  },
];

const HOST_CARD: RoleCard = {
  to: "/dashboard",
  title: "Command center",
  text: "Sign in to coordinate requests, assign volunteers, track supplies, and post alerts.",
  cta: "Open command center",
  icon: LayoutDashboard,
  tile: "bg-violet-500/15 text-violet-300 ring-violet-300/30",
  glow: "bg-violet-500/20",
};

const STEPS: InfoCard[] = [
  {
    title: "Request",
    text: "Add your location, describe the situation, set its urgency, and list the supplies you need.",
    icon: Send,
  },
  {
    title: "Prioritise",
    text: "Requests are ranked by urgency, waiting time, and demand for scarce supplies.",
    icon: ListChecks,
  },
  {
    title: "Respond",
    text: "Volunteers claim requests and share progress while coordinators follow the response.",
    icon: Radio,
  },
];

const STRENGTHS: InfoCard[] = [
  {
    title: "Local or hosted access",
    text: "Run ResQNet on local Wi-Fi for nearby devices or host it online for access from different locations.",
    icon: Wifi,
  },
  {
    title: "Clear priorities",
    text: "Urgency, waiting time, and scarce supplies help coordinators decide which requests need attention first.",
    icon: Zap,
  },
  {
    title: "Private by default",
    text: "Your contact details are shared with the volunteer handling your request and the coordinator.",
    icon: ShieldCheck,
  },
];

const ctaBase =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-5 text-[15px] font-semibold tracking-tight transition-all active:scale-[0.97] sm:px-7";

export default function Home() {
  const isHost = useHostStore((state) => state.isHost);
  const cards = isHost ? [...PUBLIC_CARDS, HOST_CARD] : PUBLIC_CARDS;
  const incidents = useLiveStore((state) => state.data.incidents);
  const volunteers = useLiveStore((state) => state.data.volunteers);
  const clients = useLiveStore((state) => state.clients);
  const status = useLiveStore((state) => state.status);

  const open = incidents.filter(
    (incident) => incident.status !== "RESOLVED" && incident.status !== "CANCELLED",
  );
  const critical = open.filter((incident) => incident.urgency === 5).length;
  const resolved = incidents.filter((incident) => incident.status === "RESOLVED").length;
  const onDuty = volunteers.filter((volunteer) => volunteer.status !== "OFF_DUTY").length;

  const stats = [
    { label: "Open requests", value: open.length, icon: Activity },
    { label: "Critical requests", value: critical, icon: Siren },
    { label: "Volunteers on duty", value: onDuty, icon: Users },
    { label: "Resolved", value: resolved, icon: ShieldCheck },
  ];

  return (
    <div className="space-y-16 sm:space-y-20 lg:space-y-28">
      <section className="relative pt-2 text-center md:pt-6">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 flex justify-center">
          <div className="h-72 w-72 rounded-full bg-[#5e5ce6]/20 blur-[100px] sm:h-96 sm:w-96" />
          <div className="-ml-24 mt-16 h-64 w-64 rounded-full bg-[#ff453a]/15 blur-[100px] sm:h-80 sm:w-80" />
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 140, damping: 18 }}
          className="relative mx-auto mb-4 h-20 w-20 sm:mb-5 sm:h-24 sm:w-24"
        >
          <img
            src="/logo.png"
            alt="ResQNet"
            width={96}
            height={96}
            className="h-full w-full object-contain drop-shadow-[0_12px_28px_rgba(255,69,58,0.28)]"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass mx-auto mb-5 inline-flex max-w-full items-center gap-2 rounded-full border border-white/10 px-4 py-1.5 text-xs font-medium text-slate-200 sm:mb-6"
        >
          <span
            className={`h-2 w-2 rounded-full ${
              status === "live"
                ? "bg-emerald-400"
                : status === "reconnecting"
                  ? "bg-red-400"
                  : "bg-amber-400"
            }`}
          />
          {status === "live"
            ? `Live · ${clients} ${clients === 1 ? "device" : "devices"} connected`
            : status === "reconnecting"
              ? "Reconnecting to the network"
              : "Connecting to the network"}
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, type: "spring", stiffness: 120, damping: 22 }}
          className="mx-auto max-w-6xl text-balance text-3xl font-semibold leading-[1.08] tracking-tight sm:text-5xl md:text-6xl"
        >
          <span className="block bg-gradient-to-b from-white to-slate-300 bg-clip-text text-transparent">
            Emergency response.
          </span>
          <span className="mt-1 block text-[#ff847a]">When everything else is down.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.28 }}
          className="mx-auto mt-5 max-w-2xl text-pretty text-base leading-relaxed text-slate-300 sm:mt-6 sm:text-lg"
        >
          ResQNet connects people who need help with nearby volunteers and coordinators over local Wi-Fi, even when internet access is down.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.38 }}
          className="mx-auto mt-7 flex max-w-xl flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center"
        >
          <Link
            to="/sos"
            className={`${ctaBase} bg-gradient-to-b from-[#ff6a5f] to-[#e8352b] text-white shadow-[0_14px_36px_-10px_rgba(255,69,58,0.8),inset_0_1px_0_rgba(255,255,255,0.32)] hover:brightness-110`}
          >
            <Siren className="h-4 w-4" />
            Request help
          </Link>
          <Link
            to="/volunteer"
            className={`${ctaBase} bg-white/10 text-white ring-1 ring-white/20 backdrop-blur-xl hover:bg-white/15`}
          >
            <HeartHandshake className="h-4 w-4" />
            Volunteer
          </Link>
        </motion.div>

        <p className="mt-4 text-xs leading-relaxed text-slate-500">
          In immediate danger? Call{" "}
          <a
            href="tel:112"
            className="font-semibold text-slate-300 underline-offset-2 hover:underline"
          >
            112
          </a>{" "}
          first.
        </p>
      </section>

      <motion.section
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ type: "spring", stiffness: 120, damping: 20 }}
        className="glass grid grid-cols-2 gap-y-6 rounded-[28px] border border-white/10 py-6 md:grid-cols-4 md:gap-y-0"
      >
        {stats.map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="flex flex-col items-center px-2 text-center sm:px-4 md:border-l md:border-white/10 md:first:border-l-0"
          >
            <Icon className="mx-auto mb-2 h-4 w-4 text-slate-400" />
            <motion.div
              key={value}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="font-mono text-3xl font-semibold tracking-tight md:text-4xl"
            >
              {value}
            </motion.div>
            <div className="mt-1 min-h-8 text-xs leading-4 text-slate-400">{label}</div>
          </div>
        ))}
      </motion.section>

      <section>
        <div className="mb-8 text-center sm:mb-10">
          <h2 className="text-balance text-3xl font-semibold tracking-tight md:text-5xl">
            A local response, from first request to coordination
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-pretty leading-relaxed text-slate-400">
            People can request help or volunteer to respond. Local updates keep everyone informed, while the host Mac gives the coordinator a live view of the response.
          </p>
        </div>
        <div
          className={`grid items-stretch gap-4 sm:grid-cols-2 ${
            cards.length === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"
          }`}
        >
          {cards.map(({ to, title, text, cta, icon: Icon, tile, glow }, index) => (
            <motion.div
              key={to}
              className="h-full"
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              whileHover={{ y: -6 }}
              transition={{ type: "spring", stiffness: 200, damping: 22, delay: index * 0.06 }}
            >
              <Link
                to={to}
                className="glass group relative flex h-full flex-col overflow-hidden rounded-[28px] border border-white/10 p-6 sm:p-7 transition-colors hover:border-white/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-400"
              >
                <div
                  className={`absolute -right-10 -top-10 h-36 w-36 rounded-full blur-3xl transition-opacity group-hover:opacity-100 ${glow} opacity-60`}
                />
                <div
                  className={`relative mb-6 flex h-12 w-12 items-center justify-center rounded-2xl ring-1 ${tile}`}
                >
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="relative text-lg font-semibold tracking-tight sm:text-xl">{title}</h3>
                <p className="relative mt-2 flex-1 text-sm leading-relaxed text-slate-400">{text}</p>
                <span className="relative mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-white sm:mt-6">
                  {cta}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1.5" />
                </span>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-8 text-center sm:mb-10">
          <h2 className="text-balance text-3xl font-semibold tracking-tight md:text-5xl">
            From request to response
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-pretty leading-relaxed text-slate-400">
            A clear handoff keeps the person requesting help, the volunteer, and the coordinator up to date.
          </p>
        </div>
        <div className="grid items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {STEPS.map(({ title, text, icon: Icon }, index) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ type: "spring", stiffness: 160, damping: 22, delay: index * 0.08 }}
              className="glass relative h-full overflow-hidden rounded-[28px] border border-white/10 p-6 sm:p-7"
            >
              <span className="absolute right-6 top-3 font-mono text-6xl font-semibold text-white/[0.05]">
                {index + 1}
              </span>
              <div className="relative mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-white ring-1 ring-white/15">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="relative text-lg font-semibold tracking-tight">{title}</h3>
              <p className="relative mt-2 text-sm leading-relaxed text-slate-400">{text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-8 text-center sm:mb-10">
          <h2 className="text-balance text-3xl font-semibold tracking-tight md:text-5xl">
            Designed for local response
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-pretty leading-relaxed text-slate-400">
            The essentials for coordinating help when internet access is unavailable.
          </p>
        </div>
        <div className="grid items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {STRENGTHS.map(({ title, text, icon: Icon }, index) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ type: "spring", stiffness: 160, damping: 22, delay: index * 0.08 }}
              className="glass h-full rounded-[28px] border border-white/10 p-6 sm:p-7"
            >
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-[#ff6a5f] ring-1 ring-white/15">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <motion.section
        initial={{ opacity: 0, y: 28 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ type: "spring", stiffness: 120, damping: 20 }}
        className="glass relative overflow-hidden rounded-[28px] border border-white/10 px-5 py-10 text-center sm:px-8 sm:py-14 md:rounded-[32px] md:py-20"
      >
        <div className="pointer-events-none absolute left-1/2 top-0 h-48 w-96 -translate-x-1/2 rounded-full bg-[#0a84ff]/25 blur-[80px]" />
        <h2 className="relative text-balance text-3xl font-semibold tracking-tight md:text-5xl">
          Start with what you can do.
        </h2>
        <p className="relative mx-auto mt-3 max-w-lg text-pretty leading-relaxed text-slate-300">
          Request help, respond to a neighbour, or check the latest local updates.
        </p>
        <div className="relative mt-7 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
          <Link
            to="/sos"
            className={`${ctaBase} bg-gradient-to-b from-[#ff6a5f] to-[#e8352b] text-white shadow-[0_14px_36px_-10px_rgba(255,69,58,0.8),inset_0_1px_0_rgba(255,255,255,0.32)] hover:brightness-110`}
          >
            Get help now
          </Link>
          <Link
            to="/updates"
            className={`${ctaBase} bg-white/10 text-white ring-1 ring-white/20 backdrop-blur-xl hover:bg-white/15`}
          >
            View live updates
          </Link>
        </div>
      </motion.section>
    </div>
  );
}
