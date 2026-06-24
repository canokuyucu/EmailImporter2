import * as React from "react";
import { Layout } from "@/components/Layout";
import { ScannerBanner } from "@/components/ScannerBanner";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { Button, Input, Checkbox, Modal, Skeleton, Card } from "@/components/ui/shared";
import { useListYetkiler, useGetYetkiStats, useGetYetki, useListYetkiNotlari } from "@workspace/api-client-react";
import { useEidsMutations } from "@/hooks/use-eids";
import { formatDate } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  Building2, CheckCircle2, XCircle, AlertTriangle, Clock,
  Search, Plus, Trash2, Download, FileDown, Eye, ShieldAlert, Columns2,
  History, MessageSquare, X, Sheet, CalendarClock, Send, Filter, SlidersHorizontal,
  ChevronUp, ChevronDown, ChevronsUpDown
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { cn } from "@/lib/utils";
import { useSSE } from "@/hooks/use-sse";
import { EtiketBadge, EtiketPicker } from "@/components/EtiketBadge";

const formSchema = z.object({
  tasinmazNo: z.string().min(1, "Taşınmaz No zorunludur"),
  ad: z.string().min(2, "En az 2 karakter giriniz"),
  bitisTarihi: z.string().optional(),
  mailTarihi: z.string().min(1, "Kayıt Tarihi zorunludur"),
});

const DURUM_FILTERS = [
  { value: "", label: "Tümü" },
  { value: "AKTİF", label: "Aktif" },
  { value: "GÜN KALDI", label: "Yaklaşan" },
  { value: "SÜRE BİTTİ", label: "Biten" },
  { value: "İPTAL", label: "İptal" },
];

export default function Dashboard() {
  const [filterDurum, setFilterDurum] = React.useState<string>("");
  const [search, setSearch] = React.useState<string>("");
  const [dateFrom, setDateFrom] = React.useState<string>("");
  const [dateTo, setDateTo] = React.useState<string>("");
  const [showFilters, setShowFilters] = React.useState(false);
  const [selectedIds, setSelectedIds] = React.useState<number[]>([]);
  const [sortBy, setSortBy] = React.useState<string>("mailTarihi");
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("desc");
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const { connected } = useSSE();
  const [filterEtiket, setFilterEtiket] = React.useState<string>("");
  const [showColMenu, setShowColMenu] = React.useState(false);
  const [visibleCols, setVisibleCols] = React.useState<Record<string, boolean>>(() => {
    try { const s = localStorage.getItem("eids-col-vis"); return s ? JSON.parse(s) : {}; } catch { return {}; }
  });
  const toggleCol = (col: string) => {
    setVisibleCols(prev => {
      const next = { ...prev, [col]: !((prev[col] ?? true)) };
      localStorage.setItem("eids-col-vis", JSON.stringify(next));
      return next;
    });
  };
  const isColVisible = (col: string) => visibleCols[col] ?? true;

  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
  const [detailModalId, setDetailModalId] = React.useState<number | null>(null);

  const todayStr = new Date().toISOString().split("T")[0];
  const alertCacheKey = `eids-alert-dismissed-${todayStr}`;
  const [isAlertDismissed, setIsAlertDismissed] = React.useState(() => localStorage.getItem(alertCacheKey) === "true");
  const [isAlertExpanded, setIsAlertExpanded] = React.useState(false);

  const { data: stats, isLoading: statsLoading } = useGetYetkiStats({ query: { refetchInterval: 60000 } });
  const { data: yetkilerRaw, isLoading: listLoading } = useListYetkiler(
    { durum: filterDurum || undefined, search: search || undefined },
    { query: { refetchInterval: 60000 } }
  );

  const handleSort = (col: string) => {
    if (sortBy === col) setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    else { setSortBy(col); setSortOrder("desc"); }
  };

  // Client-side date range filter
  const filtered = React.useMemo(() => {
    if (!yetkilerRaw) return yetkilerRaw;
    return yetkilerRaw.filter((y) => {
      if (!dateFrom && !dateTo) return true;
      if (!y.bitisTarihi) return !dateFrom;
      const p = y.bitisTarihi.split(".");
      if (p.length !== 3) return true;
      const date = new Date(Number(p[2]), Number(p[1]) - 1, Number(p[0]));
      if (dateFrom && date < new Date(dateFrom)) return false;
      if (dateTo && date > new Date(dateTo)) return false;
      return true;
    }).filter(y => {
      if (!filterEtiket) return true;
      return (y.etiket ?? "").split(",").map(t => t.trim()).includes(filterEtiket);
    });
  }, [yetkilerRaw, dateFrom, dateTo, filterEtiket]);

  // Client-side sort
  const yetkiler = React.useMemo(() => {
    if (!filtered) return filtered;
    const order = sortOrder === "asc" ? 1 : -1;

    const parseTR = (s: string | null | undefined): number => {
      if (!s) return 0;
      // "dd.mm.yyyy" veya "dd.mm.yyyy HH:MM:SS" (toLocaleString tr-TR)
      const m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
      if (m) {
        return new Date(
          Number(m[3]),
          Number(m[2]) - 1,
          Number(m[1]),
          Number(m[4] ?? 0),
          Number(m[5] ?? 0),
          Number(m[6] ?? 0)
        ).getTime();
      }
      // ISO / locale fallback
      const d = new Date(s);
      return isNaN(d.getTime()) ? 0 : d.getTime();
    };

    return [...filtered].sort((a: any, b: any) => {
      if (sortBy === "mailTarihi") return (parseTR(a.mailTarihi) - parseTR(b.mailTarihi)) * order;
      if (sortBy === "bitisTarihi") return (parseTR(a.bitisTarihi) - parseTR(b.bitisTarihi)) * order;
      if (sortBy === "kalanGun") {
        const av = typeof a.kalanGun === "number" ? a.kalanGun : Infinity;
        const bv = typeof b.kalanGun === "number" ? b.kalanGun : Infinity;
        return (av - bv) * order;
      }
      const av = String(a[sortBy] ?? "");
      const bv = String(b[sortBy] ?? "");
      return av.localeCompare(bv, "tr") * order;
    });
  }, [filtered, sortBy, sortOrder]);

  const { deleteYetki, bulkDeleteYetkiler, createYetki, updateYetki } = useEidsMutations();

  // Toplu Telegram gönder mutation
  const topluGonder = useMutation({
    mutationFn: async (ids: number[]) => {
      const res = await fetch("/api/telegram/toplu-gonder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) throw new Error("Gönderim başarısız");
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "✅ Telegram'a gönderildi", description: `${data.count} kayıt özeti gönderildi.` });
      setSelectedIds([]);
    },
    onError: (e: Error) => {
      toast({ title: "Hata", description: e.message, variant: "destructive" });
    },
  });

  const handleExportPDF = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    const now = new Date().toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(29, 78, 216);
    doc.text("EIDS Yetki Takip Raporu", 14, 18);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Oluşturulma Tarihi: ${now}`, 14, 26);
    const rows = (yetkiler ?? []).map((r) => [r.tasinmazNo, r.ad, r.bitisTarihi ?? "-", r.mailTarihi ?? "-", r.durum]);
    autoTable(doc, {
      head: [["Taşınmaz No", "Ad Soyad / Unvan", "Bitiş Tarihi", "Mail Tarihi", "Durum"]],
      body: rows,
      startY: 32,
      headStyles: { fillColor: [29, 78, 216], textColor: 255, fontStyle: "bold", fontSize: 9 },
      bodyStyles: { fontSize: 8.5, textColor: [15, 23, 42] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: { 0: { cellWidth: 32, fontStyle: "bold" }, 1: { cellWidth: 70 }, 2: { cellWidth: 28 }, 3: { cellWidth: 40 }, 4: { cellWidth: 40, fontStyle: "bold" } },
      didDrawCell: (data: any) => {
        if (data.section === "body" && data.column.index === 4) {
          const durum: string = data.cell.raw ?? "";
          if (durum === "SÜRE BİTTİ" || durum === "İPTAL") data.cell.styles.textColor = [220, 38, 38];
          else if (durum === "AKTİF") data.cell.styles.textColor = [22, 163, 74];
          else if (durum.includes("GÜN KALDI")) data.cell.styles.textColor = [217, 119, 6];
        }
      },
    });
    doc.save(`EIDS_Rapor_${new Date().toISOString().split("T")[0]}.pdf`);
  };

  const handleExportExcel = async () => {
    if (!yetkiler || yetkiler.length === 0) return;
    const rows = yetkiler.map((r) => ({
      "Taşınmaz No": r.tasinmazNo,
      "Ad Soyad / Unvan": r.ad,
      "Bitiş Tarihi": r.bitisTarihi || "-",
      "Mail Tarihi": r.mailTarihi || "-",
      "Durum": r.durum,
    }));
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Yetkiler");
    ws.addRow(Object.keys(rows[0]));
    rows.forEach((row) => ws.addRow(Object.values(row)));
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `EIDS_Yetkiler_${new Date().toISOString().split("T")[0]}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleBulkDelete = () => {
    if (confirm(`Seçili ${selectedIds.length} kaydı silmek istediğinize emin misiniz?`)) {
      bulkDeleteYetkiler.mutate({ data: { ids: selectedIds } });
      setSelectedIds([]);
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked && yetkiler) setSelectedIds(yetkiler.map((y) => y.id));
    else setSelectedIds([]);
  };

  const yaklasanYetkiler = React.useMemo(
    () => yetkilerRaw?.filter((y) => y.kalanGun !== null && y.kalanGun! >= 0 && y.kalanGun! <= 14).sort((a, b) => a.kalanGun! - b.kalanGun!) || [],
    [yetkilerRaw]
  );

  // Sparkline data — monthly kayıt counts (last 6 months)
  const sparkData = React.useMemo(() => {
    if (!yetkilerRaw) return undefined;
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
      return { year: d.getFullYear(), month: d.getMonth(), count: 0 };
    });
    yetkilerRaw.forEach((y) => {
      if (!y.mailTarihi) return;
      try {
        const d = new Date(y.mailTarihi);
        if (isNaN(d.getTime())) return;
        const m = months.find((m) => m.year === d.getFullYear() && m.month === d.getMonth());
        if (m) m.count++;
      } catch {}
    });
    return months.map((m) => m.count);
  }, [yetkilerRaw]);

  const allTags = React.useMemo(() => {
    if (!yetkilerRaw) return [];
    const s = new Set<string>();
    yetkilerRaw.forEach(y => (y.etiket ?? "").split(",").map(t => t.trim()).filter(Boolean).forEach(t => s.add(t)));
    return Array.from(s).sort();
  }, [yetkilerRaw]);

  // Benzer yetki uyarısı — aynı tasinmazNo ile birden fazla kayıt
  const duplicateTasinmazNos = React.useMemo(() => {
    if (!yetkilerRaw) return new Set<string>();
    const counts: Record<string, number> = {};
    yetkilerRaw.forEach(y => { counts[y.tasinmazNo] = (counts[y.tasinmazNo] || 0) + 1; });
    return new Set(Object.entries(counts).filter(([_, v]) => v > 1).map(([k]) => k));
  }, [yetkilerRaw]);

  const hasFilters = filterDurum || dateFrom || dateTo || filterEtiket;

  return (
    <Layout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-5 pb-20 md:pb-12"
      >
        <ScannerBanner />

        {/* Approaching alert */}
        <AnimatePresence>
          {!isAlertDismissed && yaklasanYetkiler.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-2xl overflow-hidden shadow-sm"
            >
              <div className="p-4 flex items-center justify-between cursor-pointer" onClick={() => setIsAlertExpanded(!isAlertExpanded)}>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-full">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-amber-900 dark:text-amber-300">Dikkat: Yaklaşan Bitişler</h3>
                    <p className="text-sm text-amber-700 dark:text-amber-500/80">
                      <strong>{yaklasanYetkiler.length}</strong> yetkinin süresi 14 günden az kaldı.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" className="text-amber-700 hover:bg-amber-100 dark:hover:bg-amber-500/20" onClick={(e) => { e.stopPropagation(); setIsAlertExpanded(!isAlertExpanded); }}>
                    {isAlertExpanded ? "Gizle" : "Göster"}
                  </Button>
                  <button onClick={(e) => { e.stopPropagation(); localStorage.setItem(alertCacheKey, "true"); setIsAlertDismissed(true); }} className="p-2 text-amber-700 hover:bg-amber-200 dark:hover:bg-amber-500/30 rounded-full transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <AnimatePresence>
                {isAlertExpanded && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-t border-amber-200/50 dark:border-amber-500/20">
                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {yaklasanYetkiler.map((y) => (
                        <div key={y.id} className="bg-white/60 dark:bg-black/20 p-3 rounded-xl border border-amber-100 dark:border-amber-500/10 flex justify-between items-center">
                          <div className="overflow-hidden pr-2">
                            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-0.5">{y.tasinmazNo}</p>
                            <p className="font-semibold text-sm truncate text-slate-800 dark:text-slate-200">{y.ad}</p>
                          </div>
                          <StatusBadge durum={y.durum} className="shrink-0" />
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Benzer yetki uyarısı */}
        {duplicateTasinmazNos.size > 0 && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-2xl p-4 flex items-start gap-3">
            <div className="p-2 bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-full shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-rose-900 dark:text-rose-300">👥 Benzer Yetki Uyarısı</h3>
              <p className="text-sm text-rose-700 dark:text-rose-400 mt-0.5">
                <strong>{duplicateTasinmazNos.size}</strong> taşınmaz no birden fazla kayıtta görünüyor.{" "}
                <span className="font-mono">{Array.from(duplicateTasinmazNos).slice(0, 3).join(", ")}{duplicateTasinmazNos.size > 3 ? "..." : ""}</span>
              </p>
            </div>
          </motion.div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
          <StatCard title="Toplam" value={statsLoading ? "-" : stats?.total || 0} icon={<Building2 className="w-5 h-5" />} colorClass="bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20" delay={0.1} sparkData={sparkData} />
          <StatCard title="Aktif" value={statsLoading ? "-" : stats?.aktif || 0} icon={<CheckCircle2 className="w-5 h-5" />} colorClass="bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20" delay={0.2} />
          <StatCard title="Biten" value={statsLoading ? "-" : stats?.surebitti || 0} icon={<XCircle className="w-5 h-5" />} colorClass="bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20" delay={0.3} />
          <StatCard title="İptal" value={statsLoading ? "-" : stats?.iptal || 0} icon={<AlertTriangle className="w-5 h-5" />} colorClass="bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700" delay={0.4} />
          <StatCard title="Yaklaşan (7G)" value={statsLoading ? "-" : stats?.yaklasanlar || 0} icon={<Clock className="w-5 h-5" />} colorClass="bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20" delay={0.5} />
        </div>

        {/* Main Table Card */}
        <Card className="overflow-hidden border-2 flex flex-col">
          {/* Toolbar */}
          <div className="p-4 md:p-5 border-b dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/50 space-y-3">
            {/* Top row */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1 sm:max-w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Taşınmaz No veya Ad..." className="pl-9 bg-white dark:bg-slate-950" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>

              {/* Durum button-group filter */}
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-1 gap-0.5 overflow-x-auto shrink-0">
                {DURUM_FILTERS.map((f) => (
                  <button
                    key={f.value}
                    onClick={() => setFilterDurum(f.value)}
                    className={cn(
                      "px-2.5 py-1.5 rounded-md text-xs font-bold whitespace-nowrap transition-all",
                      filterDurum === f.value
                        ? "bg-white dark:bg-slate-700 text-primary shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className={cn("shrink-0 gap-2", (showFilters || hasFilters) && "border-primary text-primary bg-primary/5")}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Filtre</span>
                {hasFilters && <span className="w-2 h-2 rounded-full bg-primary" />}
              </Button>
              {connected && (
                <span className="hidden sm:flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Canlı
                </span>
              )}
            </div>

            {/* Date range filter */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pt-1">
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <label className="text-xs font-bold text-muted-foreground whitespace-nowrap">Bitiş:</label>
                      <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="bg-white dark:bg-slate-950 h-9 text-sm" />
                      <span className="text-muted-foreground text-xs">—</span>
                      <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="bg-white dark:bg-slate-950 h-9 text-sm" />
                    </div>
                    {(dateFrom || dateTo) && (
                      <Button variant="ghost" size="sm" onClick={() => { setDateFrom(""); setDateTo(""); }} className="text-destructive hover:text-destructive h-9">
                        <X className="w-3.5 h-3.5 mr-1" /> Temizle
                      </Button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Action buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <AnimatePresence>
                {selectedIds.length > 0 && (
                  <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="flex items-center gap-2">
                    <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
                      <Trash2 className="w-3.5 h-3.5 mr-1.5" /> {selectedIds.length} Sil
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => topluGonder.mutate(selectedIds)}
                      disabled={topluGonder.isPending}
                      className="border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-400 dark:hover:bg-blue-900/20"
                    >
                      <Send className="w-3.5 h-3.5 mr-1.5" />
                      {topluGonder.isPending ? "Gönderiliyor..." : `Telegram'a Gönder`}
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex items-center gap-2 ml-auto">
                {/* Kolon özelleştirme */}
                <div className="relative">
                  <Button variant="outline" size="sm" onClick={() => setShowColMenu(!showColMenu)} title="Kolonları Göster/Gizle" className={cn("gap-1.5", showColMenu && "border-primary text-primary bg-primary/5")}>
                    <Columns2 className="w-3.5 h-3.5" />
                    <span className="hidden md:inline text-xs">Kolon</span>
                  </Button>
                  {showColMenu && (
                    <div className="absolute right-0 top-full mt-2 bg-background border dark:border-slate-700 rounded-xl shadow-xl z-50 p-3 min-w-[160px] space-y-1.5">
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 px-1">Kolonları Seç</p>
                      {[
                        { key: "tasinmazNo", label: "Taşınmaz No" },
                        { key: "ad", label: "Ad Soyad" },
                        { key: "bitisTarihi", label: "Bitiş Tarihi" },
                        { key: "mailTarihi", label: "Alım Tarihi" },
                        { key: "durum", label: "Durum" },
                      ].map(col => (
                        <label key={col.key} className="flex items-center gap-2 cursor-pointer text-sm px-1 py-0.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg">
                          <input type="checkbox" checked={isColVisible(col.key)} onChange={() => toggleCol(col.key)} className="w-4 h-4 rounded accent-primary" />
                          <span className="font-medium text-foreground">{col.label}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
                <Button variant="outline" size="sm" onClick={handleExportExcel} title="Excel İndir">
                  <Sheet className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                  <span className="hidden sm:inline">Excel</span>
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportPDF} title="PDF İndir">
                  <FileDown className="w-3.5 h-3.5 mr-1.5 text-rose-500" />
                  <span className="hidden sm:inline">PDF</span>
                </Button>
                <Button size="sm" onClick={() => setIsAddModalOpen(true)} className="bg-gradient-to-r from-primary to-blue-600">
                  <Plus className="w-3.5 h-3.5 mr-1.5" /> Yeni Kayıt
                </Button>
              </div>
            </div>

            {/* Etiket filter chips */}
            {allTags.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-muted-foreground shrink-0">🏷️ Etiket:</span>
                <button
                  onClick={() => setFilterEtiket("")}
                  className={cn("px-2 py-0.5 rounded-md text-xs font-semibold border transition-all",
                    !filterEtiket ? "bg-primary/10 border-primary text-primary" : "border-slate-200 text-muted-foreground hover:border-slate-400 dark:border-slate-700")}
                >
                  Tümü
                </button>
                {allTags.map(tag => (
                  <button key={tag} onClick={() => setFilterEtiket(filterEtiket === tag ? "" : tag)}
                    className={cn("px-2 py-0.5 rounded-md text-xs font-semibold border transition-all",
                      filterEtiket === tag ? "bg-primary/10 border-primary text-primary" : "border-slate-200 text-muted-foreground hover:border-slate-400 dark:border-slate-700")}>
                    {tag}
                  </button>
                ))}
              </div>
            )}

            {/* Active filter tags + sort info */}
            <div className="flex items-center gap-3 flex-wrap">
              {(yetkiler && yetkilerRaw && yetkiler.length !== yetkilerRaw.length) && (
                <p className="text-xs text-muted-foreground">
                  <span className="font-bold text-primary">{yetkiler.length}</span> kayıt ({yetkilerRaw.length} toplam)
                </p>
              )}
              {sortBy && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  Sıralama:
                  <span className="font-bold text-primary">
                    {sortBy === "mailTarihi" ? "Alım Tarihi" : sortBy === "bitisTarihi" ? "Bitiş Tarihi" : sortBy === "ad" ? "Ad Soyad" : sortBy === "kalanGun" ? "Kalan Gün" : sortBy}
                  </span>
                  {sortOrder === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </p>
              )}
            </div>
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto min-h-[400px]">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-slate-50/50 dark:bg-slate-900/30 border-b dark:border-slate-800">
                <tr>
                  <th className="px-5 py-4 w-12 text-center">
                    <Checkbox checked={!!yetkiler?.length && selectedIds.length === yetkiler?.length} onChange={handleSelectAll} />
                  </th>
                  {[
                    { col: "tasinmazNo", label: "Taşınmaz No" },
                    { col: "ad", label: "Ad Soyad / Unvan" },
                    { col: "bitisTarihi", label: "Bitiş Tarihi" },
                    { col: "mailTarihi", label: "Alım Tarihi" },
                    { col: "kalanGun", label: "Durum" },
                  ].map(({ col, label }) => (
                    <th
                      key={col}
                      onClick={() => handleSort(col)}
                      className={cn(
                        "px-5 py-4 font-bold tracking-wider cursor-pointer select-none group transition-colors hover:text-foreground whitespace-nowrap",
                        sortBy === col && "text-primary"
                      )}
                    >
                      <span className="flex items-center gap-1.5">
                        {label}
                        {sortBy === col ? (
                          sortOrder === "asc"
                            ? <ChevronUp className="w-3.5 h-3.5 text-primary" />
                            : <ChevronDown className="w-3.5 h-3.5 text-primary" />
                        ) : (
                          <ChevronsUpDown className="w-3.5 h-3.5 opacity-0 group-hover:opacity-40 transition-opacity" />
                        )}
                      </span>
                    </th>
                  ))}
                  <th className="px-5 py-4 font-bold tracking-wider text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {listLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-5 py-4 text-center"><Skeleton className="w-4 h-4 mx-auto" /></td>
                      <td className="px-5 py-4"><Skeleton className="w-20 h-4" /></td>
                      <td className="px-5 py-4"><Skeleton className="w-40 h-4" /></td>
                      <td className="px-5 py-4"><Skeleton className="w-24 h-4" /></td>
                      <td className="px-5 py-4"><Skeleton className="w-28 h-4" /></td>
                      <td className="px-5 py-4"><Skeleton className="w-24 h-6 rounded-full" /></td>
                      <td className="px-5 py-4"><Skeleton className="w-16 h-8 ml-auto" /></td>
                    </tr>
                  ))
                ) : yetkiler?.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-20 text-center text-muted-foreground">
                      <ShieldAlert className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
                      <p className="font-medium text-lg text-foreground">Kayıt bulunamadı</p>
                      <p className="text-sm mt-1">Arama kriterlerinize uyan yetki kaydı yok.</p>
                    </td>
                  </tr>
                ) : (
                  yetkiler?.map((row, index) => (
                    <motion.tr
                      key={row.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: Math.min(index * 0.025, 0.4) }}
                      className={cn(
                        "hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors group cursor-pointer",
                        selectedIds.includes(row.id) && "bg-primary/5 dark:bg-primary/10"
                      )}
                      onClick={() => setDetailModalId(row.id)}
                    >
                      <td className="px-5 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedIds.includes(row.id)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedIds([...selectedIds, row.id]);
                            else setSelectedIds(selectedIds.filter((id) => id !== row.id));
                          }}
                        />
                      </td>
                      <td className="px-5 py-4 font-bold text-slate-800 dark:text-slate-200">{row.tasinmazNo}</td>
                      <td className="px-5 py-4 max-w-[240px]">
                        <div>
                          <p className="font-semibold text-slate-700 dark:text-slate-300 truncate" title={row.ad}>{row.ad}</p>
                          {row.etiket && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {row.etiket.split(",").map(t => t.trim()).filter(Boolean).map(tag => (
                                <EtiketBadge key={tag} etiket={tag} size="xs" />
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-slate-500 font-medium dark:text-slate-400 whitespace-nowrap">{row.bitisTarihi || "-"}</td>
                      <td className="px-5 py-4 text-slate-400 dark:text-slate-500 text-xs whitespace-nowrap">{row.mailTarihi || "-"}</td>
                      <td className="px-5 py-4"><StatusBadge durum={row.durum} /></td>
                      <td className="px-5 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-9 w-9 text-primary hover:bg-primary/10" onClick={() => setDetailModalId(row.id)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive hover:bg-destructive/10" onClick={() => { if (confirm("Silmek istediğinize emin misiniz?")) deleteYetki.mutate({ id: row.id }); }}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden p-4 space-y-3 bg-slate-50 dark:bg-background">
            {listLoading ? (
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-2xl" />)
            ) : yetkiler?.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground bg-white dark:bg-slate-900 rounded-2xl border">
                <ShieldAlert className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
                <p className="font-semibold text-foreground">Kayıt bulunamadı</p>
              </div>
            ) : (
              yetkiler?.map((row, index) => (
                <motion.div
                  key={row.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(index * 0.04, 0.3) }}
                  className={cn(
                    "bg-white dark:bg-card p-4 rounded-2xl border-2 dark:border-slate-800 shadow-sm relative active:scale-[0.99] transition-transform",
                    selectedIds.includes(row.id) ? "border-primary/40 bg-primary/5 dark:bg-primary/10" : ""
                  )}
                  onClick={() => setDetailModalId(row.id)}
                >
                  <div className="absolute top-3 right-3 flex items-center gap-2">
                    <StatusBadge durum={row.durum} />
                    <div onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.includes(row.id)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedIds([...selectedIds, row.id]);
                          else setSelectedIds(selectedIds.filter((id) => id !== row.id));
                        }}
                      />
                    </div>
                  </div>
                  <div className="pr-24 mb-3">
                    <p className="text-xs font-bold text-slate-400 mb-1">NO: {row.tasinmazNo}</p>
                    <h3 className="font-bold text-base text-foreground leading-tight">{row.ad}</h3>
                    {row.etiket && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {row.etiket.split(",").map(t => t.trim()).filter(Boolean).map(tag => (
                          <EtiketBadge key={tag} etiket={tag} size="xs" />
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t dark:border-slate-800">
                    <div className="flex items-center gap-1.5 text-sm font-medium text-slate-500">
                      <CalendarClock className="w-4 h-4" /> {row.bitisTarihi || "Belirtilmemiş"}
                    </div>
                    <Button variant="ghost" size="sm" className="h-8 px-2 text-primary" onClick={(e) => { e.stopPropagation(); setDetailModalId(row.id); }}>
                      Detay <Eye className="w-3.5 h-3.5 ml-1.5" />
                    </Button>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </Card>
      </motion.div>

      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Yeni Yetki Kaydı">
        <YetkiForm onSubmit={(data: any) => createYetki.mutate({ data }, { onSuccess: () => setIsAddModalOpen(false) })} isLoading={createYetki.isPending} />
      </Modal>

      <DetailModal yetkiId={detailModalId} onClose={() => setDetailModalId(null)} onUpdate={(id: number, data: any) => updateYetki.mutate({ id, data })} />
    </Layout>
  );
}

function YetkiForm({ onSubmit, defaultValues, isLoading }: any) {
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: defaultValues || { tasinmazNo: "", ad: "", bitisTarihi: "", mailTarihi: new Date().toISOString().slice(0, 16) },
  });

  const handleSubmit = form.handleSubmit((data) => {
    let formattedBitis = data.bitisTarihi;
    if (formattedBitis && formattedBitis.includes("-")) {
      const [y, m, d] = formattedBitis.split("-");
      formattedBitis = `${d}.${m}.${y}`;
    }
    onSubmit({ ...data, bitisTarihi: formattedBitis || null });
  });

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="text-sm font-bold text-foreground mb-1.5 block">Taşınmaz No</label>
        <Input {...form.register("tasinmazNo")} placeholder="Örn: 32633559" className="bg-slate-50 dark:bg-slate-900 font-mono" />
        {form.formState.errors.tasinmazNo && <p className="text-xs text-destructive mt-1.5 font-medium flex items-center gap-1"><X className="w-3 h-3" />{form.formState.errors.tasinmazNo.message as string}</p>}
      </div>
      <div>
        <label className="text-sm font-bold text-foreground mb-1.5 block">Ad Soyad / Unvan</label>
        <Input {...form.register("ad")} placeholder="Tam ad veya şirket unvanı" className="bg-slate-50 dark:bg-slate-900" />
        {form.formState.errors.ad && <p className="text-xs text-destructive mt-1.5 font-medium flex items-center gap-1"><X className="w-3 h-3" />{form.formState.errors.ad.message as string}</p>}
      </div>
      <div>
        <label className="text-sm font-bold text-foreground mb-1.5 block">
          Bitiş Tarihi <span className="text-muted-foreground font-normal text-xs ml-1">(Boş bırakılırsa İPTAL)</span>
        </label>
        <Input type="date" {...form.register("bitisTarihi")} className="bg-slate-50 dark:bg-slate-900" />
      </div>
      <div>
        <label className="text-sm font-bold text-foreground mb-1.5 block">Sisteme Kayıt Tarihi</label>
        <Input type="datetime-local" {...form.register("mailTarihi")} className="bg-slate-50 dark:bg-slate-900" />
        {form.formState.errors.mailTarihi && <p className="text-xs text-destructive mt-1.5 font-medium flex items-center gap-1"><X className="w-3 h-3" />{form.formState.errors.mailTarihi.message as string}</p>}
      </div>
      <div className="pt-5 flex justify-end gap-3 border-t dark:border-slate-800">
        <Button type="submit" disabled={isLoading} className="w-full sm:w-auto px-8 py-6 sm:py-2 bg-gradient-to-r from-primary to-blue-600 text-base sm:text-sm">
          {isLoading ? "Kaydediliyor..." : "✓ Kaydet"}
        </Button>
      </div>
    </form>
  );
}

function DetailModal({ yetkiId, onClose, onUpdate }: any) {
  const [tab, setTab] = React.useState<"bilgi" | "etiket" | "hatirlatici" | "gecmis">("bilgi");
  const [isEditing, setIsEditing] = React.useState(false);
  const [newNote, setNewNote] = React.useState("");
  const [newHatirlaticiDate, setNewHatirlaticiDate] = React.useState("");
  const [newHatirlaticiMsg, setNewHatirlaticiMsg] = React.useState("");
  const [selectedTags, setSelectedTags] = React.useState<string[]>([]);
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: detail, isLoading } = useGetYetki(yetkiId, { query: { enabled: !!yetkiId } });
  const { data: notes, isLoading: notesLoading } = useListYetkiNotlari(yetkiId, { query: { enabled: !!yetkiId } });
  const { createYetkiNot, deleteYetkiNot } = useEidsMutations();

  const base = `${import.meta.env.BASE_URL}api`;

  const { data: hatirlaticilar, refetch: refetchHatirlaticilar } = useQuery({
    queryKey: ["hatirlaticilar", yetkiId],
    queryFn: () => fetch(`${base}/hatirlaticilar?yetkiId=${yetkiId}`).then(r => r.json()),
    enabled: !!yetkiId && tab === "hatirlatici",
  });

  const updateEtiket = useMutation({
    mutationFn: (etiket: string) =>
      fetch(`${base}/yetkiler/${yetkiId}/etiket`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ etiket }),
      }).then(r => r.json()),
    onSuccess: () => {
      toast({ title: "✅ Etiketler kaydedildi" });
      qc.invalidateQueries({ queryKey: ["yetkiler"] });
    },
    onError: () => toast({ title: "Hata", variant: "destructive" }),
  });

  const addHatirlatici = useMutation({
    mutationFn: (data: { tarih: string; mesaj: string }) =>
      fetch(`${base}/hatirlaticilar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ yetkiId, tasinmazNo: detail?.tasinmazNo ?? "", ad: detail?.ad ?? "", ...data }),
      }).then(r => r.json()),
    onSuccess: () => {
      toast({ title: "✅ Hatırlatıcı eklendi" });
      refetchHatirlaticilar();
      setNewHatirlaticiDate("");
      setNewHatirlaticiMsg("");
    },
    onError: () => toast({ title: "Hata", variant: "destructive" }),
  });

  const delHatirlatici = useMutation({
    mutationFn: (id: number) =>
      fetch(`${base}/hatirlaticilar/${id}`, { method: "DELETE" }).then(r => r.json()),
    onSuccess: () => refetchHatirlaticilar(),
  });

  React.useEffect(() => {
    if (detail) {
      setSelectedTags((detail.etiket ?? "").split(",").map((t: string) => t.trim()).filter(Boolean));
    }
  }, [detail]);

  React.useEffect(() => {
    if (!yetkiId) { setTab("bilgi"); setIsEditing(false); }
  }, [yetkiId]);

  if (!yetkiId) return null;

  const TABS = [
    { id: "bilgi", label: "Bilgi" },
    { id: "etiket", label: "🏷️ Etiket" },
    { id: "hatirlatici", label: "🔔 Hatır." },
    { id: "gecmis", label: "📋 Geçmiş" },
  ] as const;

  return (
    <Modal isOpen={!!yetkiId} onClose={() => { onClose(); setIsEditing(false); setTab("bilgi"); }} title="Yetki Detayı" maxWidth="max-w-2xl">
      {isLoading ? (
        <div className="space-y-4"><Skeleton className="h-8 w-3/4" /><Skeleton className="h-24 w-full" /></div>
      ) : !detail ? (
        <p className="text-muted-foreground">Kayıt bulunamadı.</p>
      ) : (
        <div className="space-y-4">
          <div className="flex border-b dark:border-slate-800 -mx-1">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id as any)}
                className={cn("px-4 py-2 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap",
                  tab === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}>
                {t.label}
              </button>
            ))}
          </div>

          {tab === "bilgi" && (
            isEditing ? (
              <div className="space-y-4">
                <YetkiForm
                  defaultValues={{
                    tasinmazNo: detail.tasinmazNo, ad: detail.ad,
                    bitisTarihi: detail.bitisTarihi ? (() => { const p = detail.bitisTarihi!.split("."); return p.length === 3 ? `${p[2]}-${p[1]}-${p[0]}` : ""; })() : "",
                    mailTarihi: detail.mailTarihi || "",
                  }}
                  onSubmit={(data: any) => { onUpdate(yetkiId, data); setIsEditing(false); }}
                  isLoading={false}
                />
                <Button variant="ghost" onClick={() => setIsEditing(false)} className="w-full">İptal</Button>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Taşınmaz No", value: detail.tasinmazNo, mono: true },
                    { label: "Durum", value: <StatusBadge durum={detail.durum} /> },
                    { label: "Ad Soyad / Unvan", value: detail.ad, full: true },
                    { label: "Bitiş Tarihi", value: detail.bitisTarihi || "—" },
                    { label: "Kayıt Tarihi", value: detail.mailTarihi ? new Date(detail.mailTarihi).toLocaleDateString("tr-TR") : "—" },
                  ].map((f, i) => (
                    <div key={i} className={cn("bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border dark:border-slate-800", f.full && "col-span-2")}>
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">{f.label}</p>
                      {typeof f.value === "string" ? <p className={cn("font-semibold text-foreground", f.mono && "font-mono text-primary")}>{f.value}</p> : f.value}
                    </div>
                  ))}
                </div>
                {(detail.etiket ?? "").split(",").filter(t => t.trim()).length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {(detail.etiket ?? "").split(",").map(t => t.trim()).filter(Boolean).map(tag => (
                      <EtiketBadge key={tag} etiket={tag} />
                    ))}
                  </div>
                )}
                <Button onClick={() => setIsEditing(true)} variant="outline" className="w-full gap-2">
                  <Eye className="w-4 h-4" /> Düzenle
                </Button>
                <div>
                  <h3 className="font-bold text-sm mb-3 flex items-center gap-2"><MessageSquare className="w-4 h-4 text-primary" /> Notlar</h3>
                  <div className="flex gap-2 mb-3">
                    <Input value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="Not ekle..." className="bg-slate-50 dark:bg-slate-900"
                      onKeyDown={e => { if (e.key === "Enter" && newNote.trim()) createYetkiNot.mutate({ yetkiId, data: { not: newNote.trim() } }, { onSuccess: () => setNewNote("") }); }} />
                    <Button onClick={() => { if (newNote.trim()) createYetkiNot.mutate({ yetkiId, data: { not: newNote.trim() } }, { onSuccess: () => setNewNote("") }); }}
                      disabled={!newNote.trim() || createYetkiNot.isPending} size="sm">Ekle</Button>
                  </div>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {notesLoading ? <Skeleton className="h-12 w-full" /> : !notes?.length ? (
                      <p className="text-sm text-muted-foreground text-center py-3">Henüz not yok</p>
                    ) : notes.map((note: any) => (
                      <div key={note.id} className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border dark:border-slate-800 flex justify-between items-start gap-3 group">
                        <p className="text-sm text-foreground flex-1">{note.not}</p>
                        <button onClick={() => deleteYetkiNot.mutate({ id: note.id })} className="text-slate-400 hover:text-destructive opacity-0 group-hover:opacity-100 transition-all p-1 shrink-0">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )
          )}

          {tab === "etiket" && (
            <div className="space-y-5 py-2">
              <div>
                <h3 className="text-sm font-bold text-foreground mb-2">Mevcut Etiketler</h3>
                <div className="flex flex-wrap gap-2 min-h-8">
                  {selectedTags.length === 0 ? <p className="text-sm text-muted-foreground">Henüz etiket yok</p> :
                    selectedTags.map(tag => <EtiketBadge key={tag} etiket={tag} onRemove={() => setSelectedTags(selectedTags.filter(t => t !== tag))} />)}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground mb-2">Etiket Seç / Ekle</h3>
                <EtiketPicker selected={selectedTags} onChange={setSelectedTags} />
              </div>
              <Button onClick={() => updateEtiket.mutate(selectedTags.join(","))} disabled={updateEtiket.isPending}
                className="w-full bg-gradient-to-r from-primary to-blue-600">
                {updateEtiket.isPending ? "Kaydediliyor..." : "✓ Etiketleri Kaydet"}
              </Button>
            </div>
          )}

          {tab === "hatirlatici" && (
            <div className="space-y-5 py-2">
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-foreground">Yeni Hatırlatıcı</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Tarih</label>
                    <Input type="date" value={newHatirlaticiDate} onChange={e => setNewHatirlaticiDate(e.target.value)} className="bg-slate-50 dark:bg-slate-900" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Mesaj</label>
                    <Input value={newHatirlaticiMsg} onChange={e => setNewHatirlaticiMsg(e.target.value)} placeholder="Hatırlatıcı notu..." className="bg-slate-50 dark:bg-slate-900" />
                  </div>
                </div>
                <Button onClick={() => {
                  if (!newHatirlaticiDate || !newHatirlaticiMsg.trim()) return;
                  const p = newHatirlaticiDate.split("-");
                  addHatirlatici.mutate({ tarih: p.length === 3 ? `${p[2]}.${p[1]}.${p[0]}` : newHatirlaticiDate, mesaj: newHatirlaticiMsg.trim() });
                }} disabled={addHatirlatici.isPending || !newHatirlaticiDate || !newHatirlaticiMsg.trim()}
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-500">
                  {addHatirlatici.isPending ? "Ekleniyor..." : "🔔 Hatırlatıcı Ekle"}
                </Button>
              </div>
              <div className="space-y-2 max-h-52 overflow-y-auto">
                <h3 className="text-sm font-bold text-foreground">Mevcut Hatırlatıcılar</h3>
                {!hatirlaticilar?.length ? <p className="text-sm text-muted-foreground text-center py-4">Henüz hatırlatıcı yok</p> :
                  hatirlaticilar.map((h: any) => (
                    <div key={h.id} className={cn("p-3 rounded-xl border flex justify-between items-start gap-3 group",
                      h.gonderildi ? "bg-slate-50/50 dark:bg-slate-900/30 border-slate-200 dark:border-slate-800 opacity-60" : "bg-amber-50/50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800")}>
                      <div>
                        <p className="text-xs font-bold text-muted-foreground">{h.tarih}</p>
                        <p className="text-sm text-foreground font-medium">{h.mesaj}</p>
                        {h.gonderildi && <p className="text-xs text-muted-foreground mt-0.5">✅ Gönderildi</p>}
                      </div>
                      {!h.gonderildi && (
                        <button onClick={() => delHatirlatici.mutate(h.id)} className="text-slate-400 hover:text-destructive opacity-0 group-hover:opacity-100 transition-all p-1 shrink-0">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}

          {tab === "gecmis" && (
            <div className="py-2 max-h-96 overflow-y-auto">
              {!detail.logs?.length ? (
                <p className="text-sm text-muted-foreground text-center py-8">Geçmiş aktivite kaydı yok</p>
              ) : (
                <div className="relative pl-6 space-y-3">
                  <div className="absolute left-2 top-2 bottom-2 w-px bg-slate-200 dark:bg-slate-700" />
                  {detail.logs.map((log: any, i: number) => (
                    <motion.div key={log.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }} className="relative">
                      <div className="absolute -left-4 top-2 w-2.5 h-2.5 rounded-full bg-primary ring-2 ring-white dark:ring-slate-950" />
                      <div className="bg-slate-50 dark:bg-slate-900 rounded-xl border dark:border-slate-800 p-3">
                        <div className="flex items-center justify-between mb-1 gap-2 flex-wrap">
                          <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full",
                            log.action === "YENİ EKLEME" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" :
                            log.action === "GÜNCELLEME" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                            log.action === "SİLME" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                            "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300")}>
                            {log.action}
                          </span>
                          <span className="text-xs text-muted-foreground">{log.createdAt ? new Date(log.createdAt).toLocaleString("tr-TR") : "—"}</span>
                        </div>
                        {log.details && <p className="text-sm text-foreground">{log.details}</p>}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
