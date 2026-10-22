import { motion } from "framer-motion";
import { useRef } from "react";
import { BellRing, HeartHandshake, LayoutDashboard, Siren } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";

import { useHostStore } from "../store/useHostStore";
import AnnouncementBanner from "./AnnouncementBanner";
import ConnectionPill from "./ConnectionPill";
import Toaster from "./Toaster";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

const PUBLIC_NAV: NavItem[] = [
  { to: "/sos", label: "Get help", icon: Siren },
  { to: "/volunteer", label: "Volunteer", icon: HeartHandshake },
  { to: "/updates", label: "Updates", icon: BellRing },
];

const HOST_NAV: NavItem = { to: "/dashboard", label: "Command center", icon: LayoutDashboard };

interface TabProps {
  item: NavItem;
  layoutId: string;
  compact?: boolean;
}

function Tab({ item, layoutId, compact = false }: TabProps) {
  const { to, label, icon: Icon } = item;
  return (
    <NavLink
      to={to}
      className={
        compact
          ? "relative flex flex-1 flex-col items-center gap-1 rounded-full py-2 text-[11px] font-medium outline-none"
          : "relative flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium outline-none"
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <motion.span
              layoutId={layoutId}
              transition={{ type: "spring", stiffness: 420, damping: 34 }}
              className="absolute inset-0 rounded-full bg-white/[0.14] shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_4px_14px_-6px_rgba(0,0,0,0.6)] ring-1 ring-white/15"
            />
          )}
          <span
            className={`relative flex items-center gap-2 whitespace-nowrap transition-colors ${
              compact ? "flex-col gap-1" : ""
            } ${isActive ? "text-white" : "text-slate-400 hover:text-slate-100"}`}
          >
            <Icon className={compact ? "h-5 w-5" : "h-4 w-4"} />
            {label}
          </span>
        </>
      )}
    </NavLink>
  );
}

export default function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const swipeStart = useRef<{ x: number; y: number } | null>(null);
  const isHost = useHostStore((state) => state.isHost);
  const navItems = isHost ? [...PUBLIC_NAV, HOST_NAV] : PUBLIC_NAV;

  return (
    <div className="flex min-h-screen flex-col">
      <div className="pointer-events-none sticky inset-x-0 top-0 z-30 flex flex-col items-center gap-2 bg-gradient-to-b from-[#07070b]/55 via-[#07070b]/20 to-transparent px-3 pt-3 backdrop-blur-[2px]">
        <motion.header
          initial={{ opacity: 0, y: -24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 26 }}
          className="glass-pill pointer-events-auto flex w-full max-w-5xl items-center justify-between gap-3 rounded-full py-2 pl-3 pr-2.5 font-sans"
        >
          <Link to="/" className="flex shrink-0 items-center gap-2.5 pr-2">
            <img
              src="/logo-128.png"
              alt="ResQNet logo"
              width={36}
              height={36}
              className="h-9 w-9 object-contain drop-shadow-[0_2px_10px_rgba(255,69,58,0.45)]"
            />
            <span className="leading-none">
              <span className="block text-[17px] font-semibold tracking-tight">ResQNet</span>
              <span className="mt-1.5 hidden text-[9px] font-medium uppercase tracking-[0.2em] text-slate-400 sm:block">
                Emergency coordination
              </span>
            </span>
          </Link>

          <nav className="hidden shrink-0 items-center gap-1 xl:flex">
            {navItems.map((item) => (
              <Tab key={item.to} item={item} layoutId="nav-pill-desktop" />
            ))}
          </nav>

          <div className="shrink-0 whitespace-nowrap">
            <ConnectionPill />
          </div>
        </motion.header>
        <AnnouncementBanner />
      </div>

      <main className="mx-auto w-full min-w-0 max-w-6xl flex-1 px-4 pb-32 pt-6 md:pb-8 md:pt-8">
        <motion.div
          key={location.pathname}
          className="min-w-0"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 30 }}
        >
          <Outlet />
        </motion.div>
      </main>

      <footer className="mx-auto w-full max-w-6xl px-4 pb-8 pt-2 text-center text-xs text-slate-500">
        ResQNet · Offline-first emergency coordination. In immediate danger, call{" "}
        <a href="tel:112" className="font-medium text-slate-300 underline-offset-2 hover:underline">
          112
        </a>
        .
      </footer>

      <Toaster />

      <nav aria-label="Primary navigation" className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] xl:hidden">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 26, delay: 0.1 }}
          onTouchStart={(event) => {
            const touch = event.touches[0];
            swipeStart.current = { x: touch.clientX, y: touch.clientY };
          }}
          onTouchEnd={(event) => {
            const start = swipeStart.current;
            swipeStart.current = null;
            if (!start) return;

            const touch = event.changedTouches[0];
            const deltaX = touch.clientX - start.x;
            const deltaY = touch.clientY - start.y;
            if (Math.abs(deltaX) < 48 || Math.abs(deltaX) < Math.abs(deltaY) * 1.25) return;

            const currentIndex = navItems.findIndex((item) => item.to === location.pathname);
            if (currentIndex < 0) return;
            const nextIndex = Math.max(0, Math.min(navItems.length - 1, currentIndex + (deltaX < 0 ? 1 : -1)));
            if (nextIndex !== currentIndex) navigate(navItems[nextIndex].to);
          }}
          className="glass-pill pointer-events-auto flex w-full max-w-sm touch-pan-y gap-1 rounded-full p-1.5"
        >
          {navItems.map((item) => (
            <Tab key={item.to} item={item} layoutId="nav-pill-mobile" compact />
          ))}
        </motion.div>
      </nav>
    </div>
  );
}
