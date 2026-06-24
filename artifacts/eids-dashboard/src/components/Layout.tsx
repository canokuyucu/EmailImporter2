import * as React from "react";
import { Link, useLocation } from "wouter";
import { Shield, LayoutDashboard, History, Activity, CalendarClock, Sun, Moon, BarChart2, Menu, X, Bell, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { AnimatePresence, motion } from "framer-motion";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/istatistik", label: "İstatistikler", icon: BarChart2 },
  { href: "/takvim", label: "Takvim", icon: CalendarClock },
  { href: "/gecmis", label: "İşlem Geçmişi", icon: History },
  { href: "/bildirim", label: "Bildirimler", icon: Bell },
  { href: "/baglanti", label: "Bağlantı Testi", icon: Activity },
  { href: "/ayarlar", label: "Ayarlar", icon: Settings },
];

const BOTTOM_NAV = [
  { href: "/", label: "Ana Sayfa", icon: LayoutDashboard },
  { href: "/istatistik", label: "İstatistik", icon: BarChart2 },
  { href: "/takvim", label: "Takvim", icon: CalendarClock },
  { href: "/bildirim", label: "Bildirim", icon: Bell },
  { href: "/ayarlar", label: "Ayarlar", icon: Settings },
];

function useDarkMode() {
  const [dark, setDark] = React.useState<boolean>(() => {
    try {
      return localStorage.getItem("eids-dark-mode") === "true";
    } catch {
      return false;
    }
  });

  React.useEffect(() => {
    const root = document.documentElement;
    if (dark) root.classList.add("dark");
    else root.classList.remove("dark");
    try { localStorage.setItem("eids-dark-mode", String(dark)); } catch {}
  }, [dark]);

  return [dark, setDark] as const;
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [dark, setDark] = useDarkMode();
  const isMobile = useIsMobile();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(!isMobile);

  React.useEffect(() => {
    setIsSidebarOpen(!isMobile);
  }, [isMobile]);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row overflow-hidden">
      {/* Mobile Header */}
      {isMobile && (
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-primary to-blue-700 text-primary-foreground shadow-lg sticky top-0 z-40">
          <div className="flex items-center gap-2.5">
            <div className="bg-white/15 p-1.5 rounded-lg border border-white/20">
              <Shield className="w-5 h-5" />
            </div>
            <h1 className="font-display font-bold text-lg leading-none tracking-wide">EIDS Yetki</h1>
          </div>
          <button
            onClick={toggleSidebar}
            className="p-2 hover:bg-white/15 rounded-xl transition-colors border border-white/10"
          >
            {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      )}

      {/* Sidebar Overlay (mobile) */}
      <AnimatePresence>
        {isMobile && isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <AnimatePresence>
        {(isSidebarOpen || !isMobile) && (
          <motion.aside
            initial={isMobile ? { x: "-100%" } : { x: 0 }}
            animate={{ x: 0 }}
            exit={isMobile ? { x: "-100%" } : { x: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className={cn(
              "w-72 bg-gradient-to-b from-primary via-blue-700 to-blue-900 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 text-white flex flex-col flex-shrink-0 shadow-2xl z-50 h-[100dvh]",
              isMobile ? "fixed top-0 left-0" : "sticky top-0"
            )}
          >
            {/* Logo */}
            <div className="p-6 md:p-7 flex items-center gap-3.5 border-b border-white/10">
              <div className="bg-white/15 p-2.5 rounded-xl shadow-inner border border-white/20">
                <Shield className="w-7 h-7 text-white drop-shadow" />
              </div>
              <div>
                <h1 className="font-display font-bold tracking-wide text-xl leading-none">EIDS Yetki</h1>
                <p className="text-white/60 text-[10px] mt-1.5 font-bold tracking-widest uppercase">T.C. Ticaret Bakanlığı</p>
              </div>
            </div>

            {/* Nav */}
            <div className="px-3 py-4 flex-1 flex flex-col gap-1 overflow-y-auto">
              <p className="px-3 text-[10px] font-bold text-white/40 tracking-[0.15em] uppercase mb-2">Menü</p>
              {NAV_ITEMS.map((item) => {
                const isActive = location === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => isMobile && setIsSidebarOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-semibold text-sm group",
                      isActive
                        ? "bg-white text-primary shadow-lg shadow-black/15 scale-[1.02]"
                        : "text-white/75 hover:bg-white/10 hover:text-white hover:scale-[1.01]"
                    )}
                  >
                    <item.icon
                      className={cn(
                        "w-4.5 h-4.5 transition-transform duration-200",
                        isActive ? "text-primary" : "opacity-70 group-hover:opacity-100"
                      )}
                    />
                    {item.label}
                    {isActive && (
                      <motion.div
                        layoutId="active-indicator"
                        className="ml-auto w-1.5 h-1.5 rounded-full bg-primary"
                      />
                    )}
                  </Link>
                );
              })}
            </div>

            {/* Bottom controls */}
            <div className="p-4 space-y-3 border-t border-white/10">
              <button
                onClick={() => setDark((d) => !d)}
                className="w-full flex items-center justify-between bg-white/8 hover:bg-white/15 rounded-xl px-4 py-3 border border-white/10 backdrop-blur-sm transition-all"
                aria-label={dark ? "Aydınlık moda geç" : "Karanlık moda geç"}
              >
                <span className="text-sm font-semibold text-white/90">
                  {dark ? "Karanlık Mod" : "Aydınlık Mod"}
                </span>
                <div className="relative w-12 h-6 rounded-full bg-black/25 flex items-center px-1 border border-white/10">
                  <motion.div
                    animate={{ x: dark ? 24 : 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    className="w-4 h-4 rounded-full bg-white shadow flex items-center justify-center"
                  >
                    {dark ? <Moon className="w-2.5 h-2.5 text-slate-700" /> : <Sun className="w-2.5 h-2.5 text-amber-500" />}
                  </motion.div>
                </div>
              </button>

              <div className="bg-black/15 rounded-2xl px-4 py-3 border border-white/5">
                <p className="text-[10px] font-medium text-white/50 uppercase tracking-wider">Sistem Sürümü</p>
                <p className="text-sm font-bold mt-0.5 text-white/90">v3.0.0-pro</p>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main
        className={cn(
          "flex-1 w-full max-w-[100vw] relative flex flex-col bg-slate-50/50 dark:bg-background overflow-y-auto",
          !isMobile && "md:max-w-[calc(100vw-18rem)] h-[100dvh]",
          isMobile && "h-[calc(100dvh-56px)]"
        )}
      >
        <div className="flex-1 p-4 md:p-8 lg:p-10 w-full max-w-7xl mx-auto">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      {isMobile && (
        <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 shadow-2xl">
          <div className="flex items-center justify-around px-2 py-2 pb-safe">
            {BOTTOM_NAV.map((item) => {
              const isActive = location === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all min-w-0 flex-1"
                >
                  <motion.div
                    animate={isActive ? { scale: 1.15 } : { scale: 1 }}
                    className={cn(
                      "p-1.5 rounded-lg transition-colors",
                      isActive ? "bg-primary/10 text-primary" : "text-muted-foreground"
                    )}
                  >
                    <item.icon className="w-5 h-5" />
                  </motion.div>
                  <span
                    className={cn(
                      "text-[9px] font-bold truncate leading-tight",
                      isActive ? "text-primary" : "text-muted-foreground"
                    )}
                  >
                    {item.label}
                  </span>
                  {isActive && (
                    <motion.div
                      layoutId="bottom-nav-indicator"
                      className="w-1 h-1 rounded-full bg-primary mt-0.5"
                    />
                  )}
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
