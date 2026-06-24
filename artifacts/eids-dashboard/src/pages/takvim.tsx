import * as React from "react";
import { Layout } from "@/components/Layout";
import { useGetYetkiTakvim, useListYetkiler } from "@workspace/api-client-react";
import { StatusBadge } from "@/components/StatusBadge";
import { Skeleton, Card, Badge, Button } from "@/components/ui/shared";
import { Calendar, CalendarClock, Building2, AlertTriangle, List, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const MONTHS_TR = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
const DAYS_SHORT = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

type Yetki = {
  id: number;
  tasinmazNo: string;
  ad: string;
  bitisTarihi?: string | null;
  durum: string;
  kalanGun?: number | null;
};

function parseDay(bitisTarihi: string): { day: number; month: number; year: number } | null {
  const p = bitisTarihi.split(".");
  if (p.length !== 3) return null;
  return { day: parseInt(p[0]), month: parseInt(p[1]) - 1, year: parseInt(p[2]) };
}

function MonthGrid({
  year,
  month,
  yetkiler,
  onDayClick,
}: {
  year: number;
  month: number;
  yetkiler: Yetki[];
  onDayClick: (day: number, items: Yetki[]) => void;
}) {
  const firstDow = new Date(year, month, 1).getDay(); // 0=Sun
  const startOffset = (firstDow + 6) % 7; // Mon=0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const dayMap = React.useMemo(() => {
    const m = new Map<number, Yetki[]>();
    yetkiler.forEach((y) => {
      if (!y.bitisTarihi) return;
      const parsed = parseDay(y.bitisTarihi);
      if (!parsed || parsed.month !== month || parsed.year !== year) return;
      const arr = m.get(parsed.day) || [];
      arr.push(y);
      m.set(parsed.day, arr);
    });
    return m;
  }, [yetkiler, month, year]);

  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
  const now = today.getDate();

  return (
    <div>
      <div className="grid grid-cols-7 gap-px mb-1">
        {DAYS_SHORT.map((d) => (
          <div key={d} className="text-center text-[10px] font-bold text-muted-foreground py-1">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px">
        {cells.map((day, idx) => {
          if (day === null) return <div key={idx} />;
          const items = dayMap.get(day);
          const isToday = isCurrentMonth && day === now;
          const hasItems = !!items?.length;
          return (
            <button
              key={day}
              onClick={() => hasItems && onDayClick(day, items!)}
              className={cn(
                "aspect-square flex flex-col items-center justify-center rounded-lg text-xs font-medium transition-all relative",
                isToday && "ring-2 ring-primary font-bold",
                hasItems
                  ? "cursor-pointer hover:bg-primary/10 hover:scale-110"
                  : "cursor-default text-muted-foreground",
                !hasItems && !isToday && "hover:bg-slate-100 dark:hover:bg-slate-800"
              )}
            >
              <span className={cn(isToday && "text-primary")}>{day}</span>
              {hasItems && (
                <div className="flex gap-0.5 mt-0.5">
                  {items!.slice(0, 3).map((y, j) => (
                    <span
                      key={j}
                      className={cn(
                        "w-1 h-1 rounded-full",
                        y.durum === "AKTİF" ? "bg-emerald-500" :
                        y.durum?.includes("GÜN") ? "bg-amber-400" : "bg-rose-500"
                      )}
                    />
                  ))}
                  {items!.length > 3 && <span className="text-[8px] text-muted-foreground">+</span>}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function Takvim() {
  const { data: takvimData, isLoading: takvimLoading } = useGetYetkiTakvim();
  const { data: yetkiler, isLoading: yetkilerLoading } = useListYetkiler({});
  const [view, setView] = React.useState<"liste" | "takvim">("liste");
  const [selectedDay, setSelectedDay] = React.useState<{ day: number; month: number; year: number; items: Yetki[] } | null>(null);

  const isLoading = takvimLoading || yetkilerLoading;
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const sortedData = React.useMemo(() => {
    if (!takvimData) return [];
    return [...takvimData].sort((a, b) => {
      if (!a.yil && !b.yil) return 0;
      if (!a.yil) return 1;
      if (!b.yil) return -1;
      if (a.yil !== b.yil) return a.yil - b.yil;
      return a.ayNo - b.ayNo;
    });
  }, [takvimData]);

  // Calendar view: show 12 months starting from current month
  const calendarMonths = React.useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  }, []);

  return (
    <Layout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-6 pb-20 md:pb-12"
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 text-primary rounded-xl">
              <CalendarClock className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold text-foreground">Bitiş Tarihi Takvimi</h1>
              <p className="text-muted-foreground text-sm">Yetkilerin aylara göre bitiş dağılımı</p>
            </div>
          </div>

          {/* View toggle */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-1 w-max">
            <button
              onClick={() => setView("liste")}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-all",
                view === "liste" ? "bg-white dark:bg-slate-700 text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <List className="w-4 h-4" /> Liste
            </button>
            <button
              onClick={() => setView("takvim")}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-all",
                view === "takvim" ? "bg-white dark:bg-slate-700 text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <LayoutGrid className="w-4 h-4" /> Takvim
            </button>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {/* LIST VIEW */}
          {view === "liste" && (
            <motion.div
              key="liste"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 12 }}
              transition={{ duration: 0.2 }}
            >
              {isLoading ? (
                <div className="space-y-8">
                  <Skeleton className="h-48 w-full rounded-3xl" />
                  <Skeleton className="h-48 w-full rounded-3xl" />
                </div>
              ) : sortedData.length === 0 ? (
                <div className="p-16 text-center bg-card rounded-3xl border-2 border-dashed flex flex-col items-center">
                  <Calendar className="w-16 h-16 text-slate-200 dark:text-slate-700 mb-4" />
                  <p className="font-semibold text-xl text-foreground">Takvim verisi bulunamadı</p>
                </div>
              ) : (
                <div className="flex flex-col gap-12">
                  {sortedData.map((group, i) => {
                    const isBelirsiz = !group.yil || !group.ayNo;
                    const isPast = !isBelirsiz && (group.yil < currentYear || (group.yil === currentYear && group.ayNo < currentMonth));
                    const isCurrent = !isBelirsiz && group.yil === currentYear && group.ayNo === currentMonth;
                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-50px" }}
                        className={cn("relative transition-all duration-300", isPast ? "opacity-60 grayscale-[0.3] hover:grayscale-0 hover:opacity-100" : "")}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6 sticky top-0 md:top-16 bg-background/90 backdrop-blur-md py-3 z-10 rounded-b-xl border-b dark:border-slate-800">
                          <h2 className={cn("text-2xl font-bold font-display tracking-tight flex items-center gap-3", isPast ? "text-slate-500" : isCurrent ? "text-primary" : "text-foreground")}>
                            {isBelirsiz ? "Tarihi Belirsiz / İptal" : `${group.ay} ${group.yil}`}
                            {isCurrent && <span className="text-[10px] uppercase tracking-wider bg-primary/10 text-primary px-2.5 py-1 rounded-full font-bold">Bu Ay</span>}
                          </h2>
                          <div className="hidden sm:block h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                          <Badge variant={isCurrent ? "default" : "secondary"} className="text-sm px-3 py-1 font-semibold w-max border-0">
                            {group.yetkiler.length} Kayıt
                          </Badge>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
                          {group.yetkiler.map((y) => (
                            <Card key={y.id} className={cn(
                              "p-5 border-l-4 transition-all hover:shadow-xl hover:-translate-y-1 bg-card overflow-hidden relative group",
                              isPast ? "border-l-slate-400" : isCurrent ? "border-l-primary shadow-primary/5" : "border-l-emerald-400 dark:border-l-emerald-500"
                            )}>
                              <div className="flex justify-between items-start mb-3 relative z-10">
                                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-foreground bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md">
                                  <Building2 className="w-3.5 h-3.5 text-muted-foreground" /> {y.tasinmazNo}
                                </span>
                                <StatusBadge durum={y.durum} />
                              </div>
                              <h3 className="font-semibold text-base line-clamp-2 min-h-[3rem] mb-4 text-foreground leading-snug relative z-10" title={y.ad}>{y.ad}</h3>
                              <div className="flex items-center justify-between text-sm font-medium pt-3 border-t dark:border-slate-800 relative z-10">
                                <span className="flex items-center gap-1.5 text-muted-foreground">
                                  <Calendar className="w-4 h-4" /> {y.bitisTarihi || "Belirtilmemiş"}
                                </span>
                                {y.kalanGun !== null && y.kalanGun !== undefined && y.kalanGun >= 0 && (
                                  <span className={cn("flex items-center gap-1 font-bold", y.kalanGun <= 7 ? "text-rose-500" : "text-amber-500")}>
                                    {y.kalanGun <= 7 && <AlertTriangle className="w-3.5 h-3.5" />}
                                    {y.kalanGun} Gün
                                  </span>
                                )}
                              </div>
                            </Card>
                          ))}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* CALENDAR GRID VIEW */}
          {view === "takvim" && (
            <motion.div
              key="takvim"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.2 }}
            >
              {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-56 w-full rounded-2xl" />)}
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3 mb-4 text-xs font-semibold text-muted-foreground">
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Aktif</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" /> Yaklaşan</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" /> Biten</span>
                    <span className="ml-auto text-xs">Renkli noktalara tıklayabilirsiniz</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {calendarMonths.map(({ year, month }, i) => {
                      const isCur = year === now.getFullYear() && month === now.getMonth();
                      const monthYetkiler = (yetkiler || []).filter((y) => {
                        if (!y.bitisTarihi) return false;
                        const p = parseDay(y.bitisTarihi);
                        return p && p.month === month && p.year === year;
                      });
                      return (
                        <motion.div
                          key={`${year}-${month}`}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: i * 0.03 }}
                        >
                          <Card className={cn("p-4 border-2 transition-all hover:shadow-md", isCur && "border-primary/40 shadow-primary/10 shadow-sm")}>
                            <div className="flex items-center justify-between mb-3">
                              <h3 className={cn("font-display font-bold text-sm", isCur ? "text-primary" : "text-foreground")}>
                                {MONTHS_TR[month]} {year}
                              </h3>
                              <div className="flex items-center gap-1.5">
                                {isCur && <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">Bu Ay</span>}
                                {monthYetkiler.length > 0 && (
                                  <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-muted-foreground px-1.5 py-0.5 rounded-full font-bold">
                                    {monthYetkiler.length}
                                  </span>
                                )}
                              </div>
                            </div>
                            <MonthGrid
                              year={year}
                              month={month}
                              yetkiler={yetkiler || []}
                              onDayClick={(day, items) =>
                                setSelectedDay({ day, month, year, items })
                              }
                            />
                          </Card>
                        </motion.div>
                      );
                    })}
                  </div>

                  {/* Day detail panel */}
                  <AnimatePresence>
                    {selectedDay && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-96 bg-card border-2 rounded-2xl shadow-2xl z-50 overflow-hidden"
                      >
                        <div className="flex items-center justify-between p-4 bg-primary text-primary-foreground">
                          <div>
                            <p className="text-sm font-bold opacity-80">
                              {selectedDay.day} {MONTHS_TR[selectedDay.month]} {selectedDay.year}
                            </p>
                            <p className="text-xs opacity-70">{selectedDay.items.length} yetki bitiyor</p>
                          </div>
                          <button
                            onClick={() => setSelectedDay(null)}
                            className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
                          >
                            ✕
                          </button>
                        </div>
                        <div className="p-4 space-y-3 max-h-72 overflow-y-auto">
                          {selectedDay.items.map((y) => (
                            <div key={y.id} className="flex items-center justify-between bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border dark:border-slate-800">
                              <div className="overflow-hidden pr-2">
                                <p className="text-xs font-bold text-muted-foreground">{y.tasinmazNo}</p>
                                <p className="font-semibold text-sm text-foreground truncate">{y.ad}</p>
                              </div>
                              <StatusBadge durum={y.durum} />
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </Layout>
  );
}
