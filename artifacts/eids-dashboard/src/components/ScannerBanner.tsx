import * as React from "react";
import { useGetScannerStatus } from "@workspace/api-client-react";
import { useEidsMutations } from "@/hooks/use-eids";
import { RefreshCw, Bell, Search, Mail } from "lucide-react";
import { Button } from "./ui/shared";
import { formatDate } from "@/lib/utils";
import { motion } from "framer-motion";

export function ScannerBanner() {
  const { data: status } = useGetScannerStatus({ query: { refetchInterval: 30000 } });
  const { runScanner, sendReminder } = useEidsMutations();

  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card dark:bg-slate-900 border dark:border-slate-800 rounded-2xl p-5 md:p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
    >
      <div className="flex items-center gap-4 w-full md:w-auto">
        <div className="p-3 bg-primary/10 text-primary rounded-xl shrink-0">
          <RefreshCw className={`w-6 h-6 ${status?.isRunning ? "animate-spin" : ""}`} />
        </div>
        <div>
          <h2 className="text-lg font-bold font-display text-foreground flex items-center gap-2">
            E-posta Tarayıcı Durumu
            {status?.isRunning && (
              <span className="text-[10px] bg-primary text-primary-foreground px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">Tarama Devam Ediyor</span>
            )}
          </h2>
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 mt-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" /> Son: {formatDate(status?.lastScan)}
            </span>
            <span className="hidden sm:inline">•</span>
            <span className="flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" /> Sonraki: {formatDate(status?.nextScan)}
            </span>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-3 w-full md:w-auto justify-end">
        <Button 
          variant="outline" 
          onClick={() => sendReminder.mutate()}
          disabled={sendReminder.isPending}
          className="flex-1 md:flex-none"
        >
          <Bell className="w-4 h-4 mr-2" />
          <span className="hidden sm:inline">Bildirim Gönder</span>
          <span className="sm:hidden">Bildirim</span>
        </Button>
        <Button 
          onClick={() => runScanner.mutate()}
          disabled={status?.isRunning || runScanner.isPending}
          className="flex-1 md:flex-none bg-gradient-to-r from-primary to-primary/90"
        >
          <Search className="w-4 h-4 mr-2" />
          Taramayı Başlat
        </Button>
      </div>
    </motion.div>
  );
}
