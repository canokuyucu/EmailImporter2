import * as React from "react";
import { Layout } from "@/components/Layout";
import { useGetYetkiStats, useListYetkiler } from "@workspace/api-client-react";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, Skeleton, Badge } from "@/components/ui/shared";
import { BarChart2, TrendingUp, Calendar, AlertCircle, Activity } from "lucide-react";
import { motion } from "framer-motion";
import {
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area, LineChart, Line,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
} from "recharts";
import { Tag, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const PIE_COLORS: Record<string, string> = {
  "AKTİF": "#10b981",
  "SÜRE BİTTİ": "#64748b",
  "İPTAL": "#ef4444",
  "YAKLAŞAN": "#f59e0b",
};

const MONTHS_TR = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];

export default function Istatistik() {
  const { data: stats, isLoading: statsLoading } = useGetYetkiStats({ query: { refetchInterval: 60000 } });
  const { data: yetkiler, isLoading: listLoading } = useListYetkiler({}, { query: { refetchInterval: 60000 } });

  const pieData = React.useMemo(() => {
    if (!stats) return [];
    const warning = stats.yaklasanlar || 0;
    const pureActive = Math.max(0, (stats.aktif || 0) - warning);
    return [
      { name: "Aktif", value: pureActive, color: PIE_COLORS["AKTİF"] },
      { name: "Yaklaşan (30G)", value: warning, color: PIE_COLORS["YAKLAŞAN"] },
      { name: "Süre Bitti", value: stats.surebitti || 0, color: PIE_COLORS["SÜRE BİTTİ"] },
      { name: "İptal", value: stats.iptal || 0, color: PIE_COLORS["İPTAL"] },
    ].filter((d) => d.value > 0);
  }, [stats]);

  // 12-month expiry projection
  const monthlyData = React.useMemo(() => {
    if (!yetkiler) return [];
    const now = new Date();
    const data = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      return { monthStr: `${MONTHS_TR[d.getMonth()]} ${d.getFullYear()}`, year: d.getFullYear(), month: d.getMonth(), count: 0, isNear: i < 2 };
    });
    yetkiler.forEach((y) => {
      if (!y.bitisTarihi) return;
      const p = y.bitisTarihi.split(".");
      if (p.length !== 3) return;
      const bDate = new Date(Number(p[2]), Number(p[1]) - 1, Number(p[0]));
      const match = data.find((item) => item.year === bDate.getFullYear() && item.month === bDate.getMonth());
      if (match) match.count++;
    });
    return data;
  }, [yetkiler]);

  // Monthly registration trend (mailTarihi) — last 12 months
  const registrationTrend = React.useMemo(() => {
    if (!yetkiler) return [];
    const now = new Date();
    const data = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
      return { monthStr: MONTHS_TR[d.getMonth()], year: d.getFullYear(), month: d.getMonth(), kayit: 0 };
    });
    yetkiler.forEach((y) => {
      if (!y.mailTarihi) return;
      let date: Date;
      try {
        date = new Date(y.mailTarihi);
        if (isNaN(date.getTime())) return;
      } catch { return; }
      const match = data.find((item) => item.year === date.getFullYear() && item.month === date.getMonth());
      if (match) match.kayit++;
    });
    return data;
  }, [yetkiler]);

  const topSoonest = React.useMemo(() => {
    if (!yetkiler) return [];
    return yetkiler
      .filter((y) => y.kalanGun !== null && y.kalanGun >= 0)
      .sort((a, b) => a.kalanGun! - b.kalanGun!)
      .slice(0, 10);
  }, [yetkiler]);

  // Etiket dağılımı
  const etiketData = React.useMemo(() => {
    if (!yetkiler) return [];
    const counts: Record<string, number> = {};
    yetkiler.forEach(y => {
      const tags = (y.etiket ?? "").split(",").map(t => t.trim()).filter(Boolean);
      if (tags.length === 0) {
        counts["Etiketsiz"] = (counts["Etiketsiz"] || 0) + 1;
      } else {
        tags.forEach(t => { counts[t] = (counts[t] || 0) + 1; });
      }
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [yetkiler]);

  const TAG_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316", "#64748b"];

  // Durum breakdown for horizontal progress bars
  const total = stats?.total || 1;
  const durumBreakdown = [
    { label: "Aktif", value: Math.max(0, (stats?.aktif || 0) - (stats?.yaklasanlar || 0)), color: "bg-emerald-500", textColor: "text-emerald-600 dark:text-emerald-400" },
    { label: "Yaklaşan", value: stats?.yaklasanlar || 0, color: "bg-amber-400", textColor: "text-amber-600 dark:text-amber-400" },
    { label: "Süre Bitti", value: stats?.surebitti || 0, color: "bg-slate-400", textColor: "text-slate-500 dark:text-slate-400" },
    { label: "İptal", value: stats?.iptal || 0, color: "bg-rose-500", textColor: "text-rose-600 dark:text-rose-400" },
  ];

  return (
    <Layout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-6 pb-20 md:pb-12"
      >
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 text-primary rounded-xl">
            <BarChart2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">İstatistikler</h1>
            <p className="text-muted-foreground text-sm">Sistem verilerinin görsel analizi</p>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Toplam Yetki" value={statsLoading ? "-" : stats?.total || 0} icon={<BarChart2 className="w-5 h-5" />} colorClass="bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/30 dark:border-blue-800" delay={0.1} />
          <StatCard title="Aktif Kayıt" value={statsLoading ? "-" : stats?.aktif || 0} icon={<TrendingUp className="w-5 h-5" />} colorClass="bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/30 dark:border-emerald-800" delay={0.2} />
          <StatCard title="Süresi Biten" value={statsLoading ? "-" : stats?.surebitti || 0} icon={<AlertCircle className="w-5 h-5" />} colorClass="bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-900/30 dark:border-rose-800" delay={0.3} />
          <StatCard title="Riskli (30 Gün)" value={statsLoading ? "-" : stats?.yaklasanlar || 0} icon={<Calendar className="w-5 h-5" />} colorClass="bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/30 dark:border-amber-800" delay={0.4} />
        </div>

        {/* Charts row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Pie */}
          <Card className="p-6 col-span-1 border-2 flex flex-col items-center justify-center min-h-[360px]">
            <h3 className="font-display font-bold text-lg self-start w-full mb-2">Durum Dağılımı</h3>
            {statsLoading ? (
              <Skeleton className="w-56 h-56 rounded-full" />
            ) : pieData.length === 0 ? (
              <p className="text-muted-foreground">Veri yok</p>
            ) : (
              <div className="w-full h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={65} outerRadius={95} paddingAngle={4} dataKey="value" stroke="none">
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)" }} itemStyle={{ fontWeight: "bold" }} />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Progress breakdown */}
            <div className="w-full mt-2 space-y-2">
              {durumBreakdown.map((d) => (
                <div key={d.label} className="flex items-center gap-2">
                  <span className={cn("text-xs font-bold w-16 shrink-0", d.textColor)}>{d.label}</span>
                  <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(d.value / total) * 100}%` }}
                      transition={{ duration: 0.8, ease: "easeOut", delay: 0.4 }}
                      className={cn("h-full rounded-full", d.color)}
                    />
                  </div>
                  <span className="text-xs font-bold text-muted-foreground w-8 text-right">{d.value}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Bar — expiry projection */}
          <Card className="p-6 col-span-1 lg:col-span-2 border-2 flex flex-col min-h-[360px]">
            <h3 className="font-display font-bold text-lg mb-1">Aylık Bitiş Projeksiyonu</h3>
            <p className="text-xs text-muted-foreground mb-4">Önümüzdeki 12 ay içinde bitecek yetkiler</p>
            {listLoading ? (
              <Skeleton className="w-full flex-1 min-h-[220px]" />
            ) : (
              <div className="w-full h-[260px] flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(100,116,139,0.15)" />
                    <XAxis dataKey="monthStr" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#64748b", fontWeight: 600 }} dy={8} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#64748b" }} allowDecimals={false} />
                    <RechartsTooltip cursor={{ fill: "rgba(0,0,0,0.04)" }} contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)" }} />
                    <Bar dataKey="count" name="Bitecek Yetki" radius={[6, 6, 0, 0]} maxBarSize={48}>
                      {monthlyData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.isNear ? "#f59e0b" : "#3b82f6"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            <div className="flex items-center gap-4 mt-3 text-xs font-semibold text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-amber-400 inline-block" /> Yakın (2 ay)</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-blue-500 inline-block" /> İlerideki aylar</span>
            </div>
          </Card>
        </div>

        {/* Registration trend area chart */}
        <Card className="p-6 border-2">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-5 h-5 text-primary" />
            <h3 className="font-display font-bold text-lg">Kayıt Trendi (Son 12 Ay)</h3>
          </div>
          <p className="text-xs text-muted-foreground mb-4">Sisteme giren yetki sayısının aylık seyri</p>
          {listLoading ? (
            <Skeleton className="w-full h-52" />
          ) : (
            <div className="w-full h-52">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={registrationTrend} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(100,116,139,0.15)" />
                  <XAxis dataKey="monthStr" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#64748b", fontWeight: 600 }} dy={8} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#64748b" }} allowDecimals={false} />
                  <RechartsTooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)" }} />
                  <Area type="monotone" dataKey="kayit" name="Yeni Kayıt" stroke="#3b82f6" strokeWidth={2.5} fill="url(#trendGradient)" dot={{ fill: "#3b82f6", r: 3, strokeWidth: 0 }} activeDot={{ r: 5, strokeWidth: 0 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        {/* Etiket dağılımı */}
        {etiketData.length > 1 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6 border-2 flex flex-col min-h-[300px]">
              <div className="flex items-center gap-2 mb-1">
                <Tag className="w-5 h-5 text-violet-500" />
                <h3 className="font-display font-bold text-lg">🏷️ Etiket Dağılımı</h3>
              </div>
              <p className="text-xs text-muted-foreground mb-4">Etiketlere göre yetki dağılımı</p>
              {listLoading ? <Skeleton className="w-full flex-1" /> : (
                <div className="w-full h-[220px] flex-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={etiketData} layout="vertical" margin={{ top: 0, right: 20, left: 12, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(100,116,139,0.15)" />
                      <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#64748b" }} allowDecimals={false} />
                      <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#64748b", fontWeight: 600 }} width={70} />
                      <RechartsTooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)" }} />
                      <Bar dataKey="value" name="Yetki Sayısı" radius={[0, 6, 6, 0]} maxBarSize={32}>
                        {etiketData.map((_, i) => (
                          <Cell key={i} fill={TAG_COLORS[i % TAG_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>

            <Card className="p-6 border-2 flex flex-col min-h-[300px]">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-5 h-5 text-blue-500" />
                <h3 className="font-display font-bold text-lg">Etiket Pasta Grafiği</h3>
              </div>
              <p className="text-xs text-muted-foreground mb-2">Etiket dağılımının oransal görünümü</p>
              {listLoading ? <Skeleton className="w-full flex-1" /> : (
                <div className="w-full h-[240px] flex-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={etiketData} cx="50%" cy="50%" outerRadius={90} paddingAngle={3} dataKey="value" stroke="none">
                        {etiketData.map((_, i) => (
                          <Cell key={i} fill={TAG_COLORS[i % TAG_COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)" }} />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* Top soonest */}
        <Card className="p-6 border-2">
          <h3 className="font-display font-bold text-lg mb-5 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-500" />
            En Yakın Bitiş Tarihleri
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                <tr>
                  <th className="px-4 py-3 font-bold rounded-l-lg">#</th>
                  <th className="px-4 py-3 font-bold">Taşınmaz No</th>
                  <th className="px-4 py-3 font-bold">Ad Soyad</th>
                  <th className="px-4 py-3 font-bold">Bitiş Tarihi</th>
                  <th className="px-4 py-3 font-bold rounded-r-lg text-right">Kalan Süre</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {listLoading ? (
                  <tr><td colSpan={5} className="py-4"><Skeleton className="h-8 w-full" /></td></tr>
                ) : topSoonest.length === 0 ? (
                  <tr><td colSpan={5} className="py-8 text-center text-muted-foreground font-medium">Yakın zamanda bitecek yetki yok.</td></tr>
                ) : (
                  topSoonest.map((row, i) => (
                    <motion.tr
                      key={row.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors"
                    >
                      <td className="px-4 py-3 text-muted-foreground font-bold text-xs">{i + 1}</td>
                      <td className="px-4 py-3 font-bold">{row.tasinmazNo}</td>
                      <td className="px-4 py-3 font-medium text-foreground max-w-[200px] truncate" title={row.ad}>{row.ad}</td>
                      <td className="px-4 py-3 text-slate-500">{row.bitisTarihi}</td>
                      <td className="px-4 py-3 text-right">
                        <StatusBadge durum={row.durum} />
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </motion.div>
    </Layout>
  );
}
