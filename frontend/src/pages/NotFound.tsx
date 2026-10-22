import { ArrowLeft, Compass, Home, Siren } from "lucide-react";
import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="glass mx-auto mt-4 max-w-xl rounded-[28px] border border-white/10 p-6 text-center sm:mt-10 sm:p-10">
      <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-300 ring-1 ring-sky-300/20">
        <Compass className="h-7 w-7" />
      </div>
      <div className="font-mono text-xs uppercase tracking-[0.18em] text-slate-500">Error 404</div>
      <h1 className="mt-2 text-balance text-2xl font-semibold tracking-tight sm:text-3xl">This page isn’t here</h1>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-400">
        The link may be out of date, or this page may only be available from the host device.
      </p>
      <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link
          to="/"
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-white/5 px-5 text-sm font-medium text-slate-100 ring-1 ring-white/15 transition-colors hover:bg-white/10"
        >
          <ArrowLeft className="h-4 w-4" />
          <Home className="h-4 w-4" />
          Back to home
        </Link>
        <Link
          to="/sos"
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-red-500 px-5 text-sm font-semibold text-white transition-colors hover:bg-red-400"
        >
          <Siren className="h-4 w-4" />
          Get help
        </Link>
      </div>
    </div>
  );
}
