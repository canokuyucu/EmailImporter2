import * as React from "react";
import { Layout } from "@/components/Layout";
import { Card, Button, Input, Skeleton } from "@/components/ui/shared";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import {
  Settings, Bell, BellOff, Shield, RefreshCw, Clock, Lock,
  CheckCircle2, AlertTriangle, FileSpreadsheet, LogOut, Mail, Pencil, Timer,
  Upload, Download, HardDrive, Database,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AppSettings {
  reminder_hour: string;
  reminder_minute: string;
  notif_yeni: string;
  notif_guncelleme: string;
  notif_surebitis: string;
  notif_alert30: string;
  notif_alert14: string;
  notif_alert7: string;
}

function fetchSettings(): Promise<AppSettings> {
  return fetch("/api/settings").then((r) => r.json());
}

export default function Ayarlar() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [hour, setHour] = React.useState("9");
  const [minute, setMinute] = React.useState("0");
  const [pinEnabled, setPinEnabled] = React.useState(false);
  const [importing, setImporting] = React.useState(false);

  // Bildirim toggleları
  const [notifYeni, setNotifYeni] = React.useState(true);
  const [notifGuncelleme, setNotifGuncelleme] = React.useState(true);
  const [notifSurebitis, setNotifSurebitis] = React.useState(true);
  const [notifAlert30, setNotifAlert30] = React.useState(true);
  const [notifAlert14, setNotifAlert14] = React.useState(true);
  const [notifAlert7, setNotifAlert7] = React.useState(true);

  // Fetch settings
  const { data: settings, isLoading } = useQuery<AppSettings>({
    queryKey: ["settings"],
    queryFn: fetchSettings,
  });

  // Fetch auth status
  const { data: authStatus } = useQuery({
    queryKey: ["auth-status"],
    queryFn: () => fetch("/api/auth/status").then((r) => r.json()),
  });

  React.useEffect(() => {
    if (settings) {
      setHour(settings.reminder_hour ?? "9");
      setMinute(settings.reminder_minute ?? "0");
      setNotifYeni(settings.notif_yeni !== "0");
      setNotifGuncelleme(settings.notif_guncelleme !== "0");
      setNotifSurebitis(settings.notif_surebitis !== "0");
      setNotifAlert30(settings.notif_alert30 !== "0");
      setNotifAlert14(settings.notif_alert14 !== "0");
      setNotifAlert7(settings.notif_alert7 !== "0");
    }
    if (authStatus) setPinEnabled(authStatus.enabled);
  }, [settings, authStatus]);

  const saveNotifSettings = () => {
    saveSettings.mutate({
      notif_yeni: notifYeni ? "1" : "0",
      notif_guncelleme: notifGuncelleme ? "1" : "0",
      notif_surebitis: notifSurebitis ? "1" : "0",
      notif_alert30: notifAlert30 ? "1" : "0",
      notif_alert14: notifAlert14 ? "1" : "0",
      notif_alert7: notifAlert7 ? "1" : "0",
    });
  };

  const saveSettings = useMutation({
    mutationFn: (data: Partial<AppSettings>) =>
      fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: () => {
      toast({ title: "✅ Ayarlar kaydedildi" });
      qc.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: () => toast({ title: "Hata", variant: "destructive" }),
  });

  const [csvFile, setCsvFile] = React.useState<File | null>(null);
  const [csvImporting, setCsvImporting] = React.useState(false);
  const [backupDownloading, setBackupDownloading] = React.useState(false);

  const handleCsvImport = async () => {
    if (!csvFile) return;
    setCsvImporting(true);
    try {
      let body: string | string[];
      const fileName = csvFile.name.toLowerCase();
      if (fileName.endsWith(".csv")) {
        body = await csvFile.text();
        const res = await fetch("/api/import", {
          method: "POST",
          headers: { "Content-Type": "text/plain" },
          body,
        });
        const data = await res.json();
        if (data.ok) {
          toast({ title: "✅ CSV İçe Aktarıldı", description: data.message });
          qc.invalidateQueries({ queryKey: ["yetkiler"] });
          setCsvFile(null);
        } else {
          toast({ title: "Hata", description: data.error, variant: "destructive" });
        }
      } else {
        toast({ title: "Hata", description: "Sadece .csv dosyaları desteklenir", variant: "destructive" });
      }
    } catch {
      toast({ title: "Bağlantı hatası", variant: "destructive" });
    } finally {
      setCsvImporting(false);
    }
  };

  const handleBackupDownload = async () => {
    setBackupDownloading(true);
    try {
      const res = await fetch("/api/backup/download");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `eids-backup-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(url);
      toast({ title: "✅ Yedek İndirildi" });
    } catch {
      toast({ title: "İndirme hatası", variant: "destructive" });
    } finally {
      setBackupDownloading(false);
    }
  };

  const handleSheetsImport = async () => {
    setImporting(true);
    try {
      const res = await fetch("/api/sheets/import", { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        toast({ title: "✅ Google Sheets İçe Aktarıldı", description: data.message });
        qc.invalidateQueries({ queryKey: ["yetkiler"] });
      } else {
        toast({ title: "Hata", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Bağlantı hatası", variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  const handleLogout = () => {
    const token = localStorage.getItem("eids_auth_token");
    if (token) {
      fetch("/api/auth/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
    localStorage.removeItem("eids_auth_token");
    window.location.reload();
  };

  const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => i);
  const MIN_OPTIONS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  return (
    <Layout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-6 pb-20 md:pb-12 max-w-2xl"
      >
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 text-primary rounded-xl">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Ayarlar</h1>
            <p className="text-muted-foreground text-sm">Sistem ve bildirim tercihleri</p>
          </div>
        </div>

        {/* Bildirim Saati */}
        <Card className="p-6 border-2 space-y-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-bold text-lg text-foreground">Sabah Bildirimi</h2>
              <p className="text-sm text-muted-foreground">Telegram sabah bülteninin gönderileceği saat</p>
            </div>
          </div>

          {isLoading ? (
            <Skeleton className="h-16 w-full rounded-xl" />
          ) : (
            <div className="flex items-end gap-4">
              <div className="flex-1">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Saat</label>
                <select
                  value={hour}
                  onChange={(e) => setHour(e.target.value)}
                  className="w-full px-3 py-2.5 border-2 border-input rounded-xl bg-background text-foreground font-semibold focus:border-primary outline-none transition-colors"
                >
                  {HOUR_OPTIONS.map((h) => (
                    <option key={h} value={String(h)}>
                      {String(h).padStart(2, "0")}:00
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Dakika</label>
                <select
                  value={minute}
                  onChange={(e) => setMinute(e.target.value)}
                  className="w-full px-3 py-2.5 border-2 border-input rounded-xl bg-background text-foreground font-semibold focus:border-primary outline-none transition-colors"
                >
                  {MIN_OPTIONS.map((m) => (
                    <option key={m} value={String(m)}>
                      :{String(m).padStart(2, "0")}
                    </option>
                  ))}
                </select>
              </div>
              <Button
                onClick={() => saveSettings.mutate({ reminder_hour: hour, reminder_minute: minute })}
                disabled={saveSettings.isPending}
                className="px-6 py-2.5 bg-gradient-to-r from-primary to-blue-600"
              >
                {saveSettings.isPending ? "Kaydediliyor..." : "Kaydet"}
              </Button>
            </div>
          )}

          <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border dark:border-slate-800">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Şu an:{" "}
              <span className="font-bold text-foreground">
                {String(hour).padStart(2, "0")}:{String(minute).padStart(2, "0")}
              </span>
              {" "}— Her gün bu saatte otomatik gönderilir
            </p>
          </div>
        </Card>

        {/* Bildirim Kontrolleri */}
        <Card className="p-6 border-2 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 rounded-xl">
                <BellOff className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-display font-bold text-lg text-foreground">Bildirim Kontrolü</h2>
                <p className="text-sm text-muted-foreground">Telegram bildirimlerini özelleştir</p>
              </div>
            </div>
            <Button
              onClick={saveNotifSettings}
              disabled={saveSettings.isPending}
              size="sm"
              className="bg-gradient-to-r from-violet-500 to-primary text-white"
            >
              {saveSettings.isPending ? "..." : "Kaydet"}
            </Button>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1,2,3,4].map(i => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
            </div>
          ) : (
            <div className="space-y-2">
              {/* Yeni yetki */}
              {[
                {
                  icon: <Mail className="w-4 h-4" />,
                  label: "Yeni yetki bildirimi",
                  desc: "Yeni e-posta tespit edilince bildir",
                  value: notifYeni,
                  set: setNotifYeni,
                  color: "text-blue-600 dark:text-blue-400",
                  bg: "bg-blue-50 dark:bg-blue-500/10",
                },
                {
                  icon: <Pencil className="w-4 h-4" />,
                  label: "Güncelleme bildirimi",
                  desc: "Yetki bilgileri değişince bildir",
                  value: notifGuncelleme,
                  set: setNotifGuncelleme,
                  color: "text-amber-600 dark:text-amber-400",
                  bg: "bg-amber-50 dark:bg-amber-500/10",
                },
              ].map(({ icon, label, desc, value, set, color, bg }) => (
                <div
                  key={label}
                  onClick={() => set(!value)}
                  className={cn(
                    "flex items-center justify-between p-4 rounded-xl border cursor-pointer select-none transition-all",
                    value
                      ? "bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800"
                      : "bg-slate-100/50 dark:bg-slate-800/30 border-dashed border-slate-300 dark:border-slate-700 opacity-70"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className={cn("p-2 rounded-lg", bg, color)}>{icon}</span>
                    <div>
                      <p className="font-semibold text-sm text-foreground">{label}</p>
                      <p className="text-xs text-muted-foreground">{desc}</p>
                    </div>
                  </div>
                  <div className={cn(
                    "w-11 h-6 rounded-full relative transition-colors",
                    value ? "bg-primary" : "bg-slate-300 dark:bg-slate-600"
                  )}>
                    <div className={cn(
                      "w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all shadow-sm",
                      value ? "left-5" : "left-0.5"
                    )} />
                  </div>
                </div>
              ))}

              {/* Süre bitiş uyarıları — ana toggle + alt seçenekler */}
              <div
                onClick={() => setNotifSurebitis(!notifSurebitis)}
                className={cn(
                  "flex items-center justify-between p-4 rounded-xl border cursor-pointer select-none transition-all",
                  notifSurebitis
                    ? "bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800"
                    : "bg-slate-100/50 dark:bg-slate-800/30 border-dashed border-slate-300 dark:border-slate-700 opacity-70"
                )}
              >
                <div className="flex items-center gap-3">
                  <span className="p-2 rounded-lg bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400">
                    <Timer className="w-4 h-4" />
                  </span>
                  <div>
                    <p className="font-semibold text-sm text-foreground">Süre bitiş uyarıları</p>
                    <p className="text-xs text-muted-foreground">Yaklaşan son tarih bildirimleri</p>
                  </div>
                </div>
                <div className={cn(
                  "w-11 h-6 rounded-full relative transition-colors",
                  notifSurebitis ? "bg-primary" : "bg-slate-300 dark:bg-slate-600"
                )}>
                  <div className={cn(
                    "w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all shadow-sm",
                    notifSurebitis ? "left-5" : "left-0.5"
                  )} />
                </div>
              </div>

              {/* Alt eşikler — sadece notifSurebitis açıksa göster */}
              {notifSurebitis && (
                <div className="ml-4 pl-4 border-l-2 border-slate-200 dark:border-slate-700 space-y-2">
                  {[
                    { label: "30 gün kala uyarı", value: notifAlert30, set: setNotifAlert30 },
                    { label: "14 gün kala uyarı", value: notifAlert14, set: setNotifAlert14 },
                    { label: "7 gün kala uyarı",  value: notifAlert7,  set: setNotifAlert7  },
                  ].map(({ label, value, set }) => (
                    <div
                      key={label}
                      onClick={() => set(!value)}
                      className={cn(
                        "flex items-center justify-between px-4 py-3 rounded-xl border cursor-pointer select-none transition-all",
                        value
                          ? "bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800"
                          : "opacity-60 border-dashed border-slate-300 dark:border-slate-700"
                      )}
                    >
                      <span className="text-sm font-medium text-foreground">{label}</span>
                      <div className={cn(
                        "w-9 h-5 rounded-full relative transition-colors",
                        value ? "bg-primary" : "bg-slate-300 dark:bg-slate-600"
                      )}>
                        <div className={cn(
                          "w-4 h-4 bg-white rounded-full absolute top-0.5 transition-all shadow-sm",
                          value ? "left-4" : "left-0.5"
                        )} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Güvenlik */}
        <Card className="p-6 border-2 space-y-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-bold text-lg text-foreground">Güvenlik</h2>
              <p className="text-sm text-muted-foreground">PIN koruması ve oturum yönetimi</p>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border dark:border-slate-800">
            <div className="flex items-center gap-3">
              <Lock className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="font-semibold text-foreground">PIN Koruması</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {pinEnabled
                    ? "Aktif — DASHBOARD_PIN ortam değişkeni ayarlı"
                    : "Pasif — DASHBOARD_PIN ortam değişkeni ayarlanmamış"}
                </p>
              </div>
            </div>
            <span className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border",
              pinEnabled
                ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20"
                : "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400"
            )}>
              {pinEnabled ? <><CheckCircle2 className="w-3.5 h-3.5" /> Aktif</> : <><AlertTriangle className="w-3.5 h-3.5" /> Pasif</>}
            </span>
          </div>

          {!pinEnabled && (
            <div className="p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl text-sm">
              <p className="font-semibold text-amber-800 dark:text-amber-300 mb-1">PIN'i etkinleştirmek için:</p>
              <p className="text-amber-700 dark:text-amber-400 font-mono bg-black/5 dark:bg-white/5 px-3 py-2 rounded-lg mt-2">
                DASHBOARD_PIN = "123456"
              </p>
              <p className="text-amber-600 dark:text-amber-500 mt-2 text-xs">Replit Secrets bölümüne ekleyin ve sunucuyu yeniden başlatın.</p>
            </div>
          )}

          {pinEnabled && (
            <Button
              variant="outline"
              onClick={handleLogout}
              className="w-full gap-2 border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-900/20"
            >
              <LogOut className="w-4 h-4" /> Oturumu Kapat
            </Button>
          )}
        </Card>

        {/* CSV İçe Aktarma */}
        <Card className="p-6 border-2 space-y-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 rounded-xl">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-bold text-lg text-foreground">📁 CSV / Excel İçe Aktarma</h2>
              <p className="text-sm text-muted-foreground">Toplu kayıt eklemek için CSV yükleyin</p>
            </div>
          </div>
          <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border dark:border-slate-800 text-xs text-muted-foreground space-y-1">
            <p className="font-semibold text-foreground mb-1">CSV Format (;) veya (,) ayrılmış:</p>
            <p className="font-mono">Taşınmaz No, Ad Soyad, Bitiş Tarihi, Mail Tarihi, Etiket</p>
            <p className="font-mono text-muted-foreground">32633559, Ali Veli, 15.03.2025, 10.01.2024, Konut</p>
          </div>
          <div className="space-y-3">
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={e => setCsvFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
            />
            {csvFile && (
              <p className="text-xs text-muted-foreground">Seçili: <span className="font-semibold text-foreground">{csvFile.name}</span> ({(csvFile.size / 1024).toFixed(1)} KB)</p>
            )}
            <Button
              onClick={handleCsvImport}
              disabled={!csvFile || csvImporting}
              className="w-full gap-2 bg-gradient-to-r from-orange-500 to-amber-500"
            >
              <Upload className={cn("w-4 h-4", csvImporting && "animate-spin")} />
              {csvImporting ? "Aktarılıyor..." : "Dosyayı İçe Aktar"}
            </Button>
          </div>
        </Card>

        {/* Otomatik Yedekleme */}
        <Card className="p-6 border-2 space-y-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-teal-100 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400 rounded-xl">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-bold text-lg text-foreground">📦 Otomatik Yedekleme</h2>
              <p className="text-sm text-muted-foreground">Günlük otomatik + manuel yedek</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border dark:border-slate-800">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Otomatik</p>
              <p className="text-sm text-foreground font-medium">Her gece 02:00</p>
              <p className="text-xs text-muted-foreground mt-1">Son 7 yedek saklanır</p>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border dark:border-slate-800">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Format</p>
              <p className="text-sm text-foreground font-medium">JSON (tüm veriler)</p>
              <p className="text-xs text-muted-foreground mt-1">Yetkiler + hatırlatıcılar</p>
            </div>
          </div>
          <Button
            onClick={handleBackupDownload}
            disabled={backupDownloading}
            variant="outline"
            className="w-full gap-2 border-teal-300 text-teal-700 hover:bg-teal-50 dark:border-teal-800 dark:text-teal-400 dark:hover:bg-teal-900/20"
          >
            <Download className={cn("w-4 h-4", backupDownloading && "animate-bounce")} />
            {backupDownloading ? "İndiriliyor..." : "Şimdi Yedek Al (JSON)"}
          </Button>
        </Card>

        {/* Google Sheets */}
        <Card className="p-6 border-2 space-y-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400 rounded-xl">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-bold text-lg text-foreground">Google Sheets</h2>
              <p className="text-sm text-muted-foreground">İki yönlü senkronizasyon</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border dark:border-slate-800">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Sistem → Sheets</p>
              <p className="text-sm text-foreground font-medium">Her taramada otomatik</p>
              <p className="text-xs text-muted-foreground mt-1">Yeni kayıtlar anında senkronize edilir</p>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border dark:border-slate-800">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Sheets → Sistem</p>
              <p className="text-sm text-foreground font-medium">Manuel içe aktarma</p>
              <p className="text-xs text-muted-foreground mt-1">Sheets'teki değişiklikleri sisteme al</p>
            </div>
          </div>

          <Button
            onClick={handleSheetsImport}
            disabled={importing}
            variant="outline"
            className="w-full gap-2 border-green-300 text-green-700 hover:bg-green-50 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-900/20"
          >
            <RefreshCw className={cn("w-4 h-4", importing && "animate-spin")} />
            {importing ? "İçe aktarılıyor..." : "Sheets'ten İçe Aktar"}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Google Sheets'te düzenlediğiniz kayıtları sisteme çeker. Sistem veritabanı güncellenir.
          </p>
        </Card>

        {/* Telegram komutları */}
        <Card className="p-6 border-2 space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-xl">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-bold text-lg text-foreground">Telegram Bot Komutları</h2>
              <p className="text-sm text-muted-foreground">Bota yazabileceğiniz komutlar</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            {[
              { cmd: "/liste", desc: "Tüm yetkiler" },
              { cmd: "/yaklasan", desc: "30 gün içinde bitenler" },
              { cmd: "/bugun", desc: "Bugün bitenler" },
              { cmd: "/bitenler", desc: "Süresi dolanlar" },
              { cmd: "/ara [isim]", desc: "Kayıt ara" },
              { cmd: "/durum [no]", desc: "Detaylı yetki bilgisi" },
              { cmd: "/istatistik", desc: "Özet istatistik" },
              { cmd: "/haftalik", desc: "Haftalık rapor" },
              { cmd: "/tara", desc: "Yeni mailleri tara" },
              { cmd: "/guncelle", desc: "Tüm mailleri tara" },
              { cmd: "/ekle", desc: "Yeni yetki ekle" },
              { cmd: "/sil [no]", desc: "Kayıt sil" },
              { cmd: "/not [no] [metin]", desc: "Not ekle" },
              { cmd: "/son", desc: "Son aktiviteler" },
              { cmd: "/ping", desc: "Sistem durumu" },
              { cmd: "/yardim", desc: "Tüm komutlar" },
            ].map(({ cmd, desc }) => (
              <div key={cmd} className="flex items-center gap-2 p-2.5 bg-slate-50 dark:bg-slate-900/50 rounded-lg border dark:border-slate-800">
                <code className="text-xs font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded shrink-0">{cmd}</code>
                <span className="text-xs text-muted-foreground">{desc}</span>
              </div>
            ))}
          </div>
        </Card>
      </motion.div>
    </Layout>
  );
}
