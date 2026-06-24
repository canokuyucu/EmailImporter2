import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { motion } from "framer-motion";
import { MailSearch, Bell, RefreshCw, Clock } from "lucide-react";
import { useScannerStatus, useRunScannerAction, useSendReminderAction } from "@/hooks/use-scanner";
import { Button } from "@/components/ui/button";

export function ScannerBanner() {
  const { data: status, isLoading } = useScannerStatus();
  const runScanner = useRunScannerAction();
  const sendReminder = useSendReminderAction();

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return "Henüz tarama yapılmadı";
    try {
      return format(new Date(dateStr), "dd MMM yyyy, HH:mm", { locale: tr });
    } catch {
      return dateStr;
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl p-4 md:p-6 border border-border shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
    >
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center border border-blue-100">
          <MailSearch className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-display font-semibold text-foreground">E-posta Tarayıcı Durumu</h2>
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 mt-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              Son Tarama: <strong className="text-foreground font-medium">{isLoading ? "Yükleniyor..." : formatTime(status?.lastScan || null)}</strong>
            </span>
            <span className="hidden sm:inline text-border">•</span>
            <span className="flex items-center gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" />
              Sonraki: <strong className="text-foreground font-medium">{isLoading ? "Yükleniyor..." : formatTime(status?.nextScan || null)}</strong>
            </span>
          </div>
        </div>
      </div>

      <div className="flex w-full md:w-auto flex-col sm:flex-row gap-3">
        <Button 
          variant="outline" 
          className="bg-white hover:bg-slate-50 border-slate-200 text-slate-700"
          onClick={() => runScanner.mutate()}
          disabled={runScanner.isPending || status?.isRunning}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${(runScanner.isPending || status?.isRunning) ? "animate-spin" : ""}`} />
          {status?.isRunning ? "Taranıyor..." : "Taramayı Başlat"}
        </Button>
        <Button 
          className="bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/20"
          onClick={() => sendReminder.mutate()}
          disabled={sendReminder.isPending}
        >
          <Bell className="mr-2 h-4 w-4" />
          Telegram Bildirimi
        </Button>
      </div>
    </motion.div>
  );
}
