import * as React from "react";
import { Layout } from "@/components/Layout";
import { useQuery } from "@tanstack/react-query";
import { Skeleton, Card } from "@/components/ui/shared";
import { Bell, Sun, RefreshCw, AlertTriangle, Users, BellRing, Send } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface BildirimLog {
  id: number;
  type: string;
  mesaj: string;
  gonderildi_at: string;
}

const TYPE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  SABAH: { label: "Sabah Bülteni", icon: Sun, color: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30" },
  HAFTALIK: { label: "Haftalık Rapor", icon: RefreshCw, color: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-500/20 dark:text-blue-400 dark:border-blue-500/30" },
  TOPLU: { label: "Toplu Gönderim", icon: Users, color: "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-500/20 dark:text-purple-400 dark:border-purple-500/30" },
  UYARI: { label: "Süresi Uyarısı", icon: AlertTriangle, color: "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-500/20 dark:text-rose-400 dark:border-rose-500/30" },
  HATIRLATMA: { label: "Hatırlatma", icon: BellRing, color: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30" },
};

function fmt(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString("tr-TR", {
      day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
  } catch { return dateStr; }
}

function stripHtml(str: string) {
  return str.replace(/<[^>]*>/g, "").trim();
}

export default function Bildirim() {
  const [filterType, setFilterType] = React.useState<string>("");

  const { data: bildirimler, isLoading, refetch } = useQuery<BildirimLog[]>({
    queryKey: ["bildirimler"],
    queryFn: async () => {
      const res = await fetch("/api/bildirimler?limit=200");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    refetchInterval: 30000,
  });

  const filtered = React.useMemo(() => {
    if (!bildirimler) return [];
    if (!filterType) return bildirimler;
    return bildirimler.filter((b) => b.type === filterType);
  }, [bildirimler, filterType]);

  const typeCounts = React.useMemo(() => {
    if (!bildirimler) return {};
    return bildirimler.reduce((acc, b) => {
      acc[b.type] = (acc[b.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [bildirimler]);

  const statKeys = Object.keys(TYPE_CONFIG);

  return (
    <Layout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-6 pb-20 md:pb-12"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 text-primary rounded-xl">
              <Bell className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold text-foreground">Bildirim Geçmişi</h1>
              <p className="text-muted-foreground text-sm">Telegram'a gönderilen tüm bildirimler</p>
            </div>
          </div>
          <button
            onClick={() => refetch()}
            className="p-2.5 text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {statKeys.map((key, i) => {
            const cfg = TYPE_CONFIG[key];
            const count = typeCounts[key] || 0;
            const isActive = filterType === key;
            return (
              <motion.button
                key={key}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.07 }}
                onClick={() => setFilterType(isActive ? "" : key)}
                className={cn(
                  "p-4 rounded-2xl border-2 text-left transition-all hover:shadow-md hover:-translate-y-0.5",
                  isActive
                    ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20"
                    : "bg-card border-border dark:border-slate-800 hover:border-primary/30"
                )}
              >
                <cfg.icon className={cn("w-5 h-5 mb-2", isActive ? "text-primary-foreground" : "text-muted-foreground")} />
                <p className={cn("text-2xl font-bold font-display", isActive ? "text-primary-foreground" : "text-foreground")}>{count}</p>
                <p className={cn("text-xs font-medium mt-0.5 leading-tight", isActive ? "text-primary-foreground/80" : "text-muted-foreground")}>
                  {cfg.label}
                </p>
              </motion.button>
            );
          })}
        </div>

        {/* Filter pills */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterType("")}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-bold border transition-all",
              !filterType ? "bg-primary text-primary-foreground border-primary" : "border-input hover:border-primary/50 dark:border-slate-700"
            )}
          >
            Tümü ({bildirimler?.length || 0})
          </button>
          {Object.keys(typeCounts).map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(filterType === t ? "" : t)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-bold border transition-all",
                filterType === t ? "bg-primary text-primary-foreground border-primary" : "border-input hover:border-primary/50 dark:border-slate-700"
              )}
            >
              {TYPE_CONFIG[t]?.label || t} ({typeCounts[t]})
            </button>
          ))}
        </div>

        <Card className="overflow-hidden border-2">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full rounded-xl" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-16 text-center flex flex-col items-center">
              <Send className="w-14 h-14 text-slate-200 dark:text-slate-700 mb-4" />
              <p className="font-bold text-xl text-foreground mb-1">Henüz bildirim yok</p>
              <p className="text-muted-foreground text-sm">
                Telegram bildirimleri gönderildikçe burada görünecek.
              </p>
            </div>
          ) : (
            <div className="divide-y dark:divide-slate-800">
              {filtered.map((log, index) => {
                const cfg = TYPE_CONFIG[log.type] || TYPE_CONFIG.HATIRLATMA;
                const Icon = cfg.icon;
                return (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: Math.min(index * 0.02, 0.3) }}
                    className="p-4 md:p-5 flex items-start gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors"
                  >
                    <div className={cn("p-2.5 rounded-xl border shrink-0", cfg.color)}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mb-2">
                        <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold border w-max", cfg.color)}>
                          {cfg.label}
                        </span>
                        <span className="text-xs text-muted-foreground font-medium">{fmt(log.gonderildi_at)}</span>
                      </div>
                      <p className="text-sm text-foreground bg-slate-50 dark:bg-slate-900/50 px-4 py-3 rounded-xl border dark:border-slate-800 leading-relaxed whitespace-pre-wrap break-words line-clamp-3">
                        {stripHtml(log.mesaj)}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </Card>
      </motion.div>
    </Layout>
  );
}
