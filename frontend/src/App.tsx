import { Suspense, lazy, useEffect } from "react";
import { Route, Routes } from "react-router-dom";

import AppShell from "./components/AppShell";
import { useLiveSocket } from "./hooks/useLiveSocket";
import Home from "./pages/Home";
import NotFound from "./pages/NotFound";
import Sos from "./pages/Sos";
import Updates from "./pages/Updates";
import Volunteer from "./pages/Volunteer";
import { useHostStore } from "./store/useHostStore";

const Dashboard = lazy(() => import("./pages/Dashboard"));

export default function App() {
  useLiveSocket();
  const isHost = useHostStore((state) => state.isHost);
  const checkHost = useHostStore((state) => state.check);

  useEffect(() => {
    void checkHost();
  }, [checkHost]);

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Home />} />
        <Route path="sos" element={<Sos />} />
        <Route path="volunteer" element={<Volunteer />} />
        <Route path="updates" element={<Updates />} />
        {isHost && (
          <Route
            path="dashboard"
            element={
              <Suspense
                fallback={
                  <div className="mx-auto h-48 max-w-md animate-pulse rounded-2xl border border-white/10 bg-white/[0.03]" />
                }
              >
                <Dashboard />
              </Suspense>
            }
          />
        )}
        <Route path="*" element={isHost === null ? null : <NotFound />} />
      </Route>
    </Routes>
  );
}