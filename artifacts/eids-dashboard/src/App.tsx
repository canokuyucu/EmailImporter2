import * as React from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AnimatePresence, motion } from "framer-motion";
import Dashboard from "@/pages/dashboard";
import Takvim from "@/pages/takvim";
import Gecmis from "@/pages/gecmis";
import Baglanti from "@/pages/baglanti";
import Istatistik from "@/pages/istatistik";
import Bildirim from "@/pages/bildirim";
import Ayarlar from "@/pages/ayarlar";
import Login from "@/pages/login";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.22, ease: [0.25, 0.1, 0.25, 1] } },
  exit:    { opacity: 0, y: -8, transition: { duration: 0.15 } },
};

function AnimatedPage({ children }: { children: React.ReactNode }) {
  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" className="w-full">
      {children}
    </motion.div>
  );
}

function Router() {
  const [location] = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Switch key={location} location={location}>
        <Route path="/" component={() => <AnimatedPage><Dashboard /></AnimatedPage>} />
        <Route path="/istatistik" component={() => <AnimatedPage><Istatistik /></AnimatedPage>} />
        <Route path="/takvim" component={() => <AnimatedPage><Takvim /></AnimatedPage>} />
        <Route path="/gecmis" component={() => <AnimatedPage><Gecmis /></AnimatedPage>} />
        <Route path="/baglanti" component={() => <AnimatedPage><Baglanti /></AnimatedPage>} />
        <Route path="/bildirim" component={() => <AnimatedPage><Bildirim /></AnimatedPage>} />
        <Route path="/ayarlar" component={() => <AnimatedPage><Ayarlar /></AnimatedPage>} />
        <Route component={() => <AnimatedPage><NotFound /></AnimatedPage>} />
      </Switch>
    </AnimatePresence>
  );
}

// --- Auth Gate ---
type AuthStatus = "loading" | "open" | "authenticated" | "unauthenticated";

function useAuth(): { status: AuthStatus; onLogin: () => void } {
  const [status, setStatus] = React.useState<AuthStatus>("loading");

  const check = React.useCallback(async () => {
    try {
      const res = await fetch("/api/auth/status");
      const data = await res.json();

      if (!data.enabled) {
        setStatus("open");
        return;
      }

      const token = localStorage.getItem("eids_auth_token");
      if (!token) {
        setStatus("unauthenticated");
        return;
      }

      const checkRes = await fetch("/api/auth/check", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStatus(checkRes.ok ? "authenticated" : "unauthenticated");
    } catch {
      // Network error — allow access (don't block on auth failure)
      setStatus("open");
    }
  }, []);

  React.useEffect(() => { check(); }, [check]);

  return { status, onLogin: check };
}

function AppContent() {
  const { status, onLogin } = useAuth();

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-primary to-blue-700 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    return <Login onSuccess={onLogin} />;
  }

  return (
    <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
      <Router />
    </WouterRouter>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
      <Toaster />
    </QueryClientProvider>
  );
}
