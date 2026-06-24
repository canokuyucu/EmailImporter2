import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export function StatusBadge({ durum, className }: { durum: string; className?: string }) {
  if (!durum) return null;

  let colorClass = "bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";
  let dotClass = "bg-slate-400";
  let isWarning = false;

  if (durum === "AKTİF") {
    colorClass = "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20";
    dotClass = "bg-emerald-500";
  } else if (durum === "SÜRE BİTTİ" || durum === "İPTAL" || durum === "HATA") {
    colorClass = "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20";
    dotClass = "bg-rose-500";
  } else if (durum.includes("GÜN KALDI")) {
    colorClass = "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20";
    dotClass = "bg-amber-500";
    isWarning = true;
  }

  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-full border shadow-sm whitespace-nowrap", colorClass, className)}>
      <motion.span 
        className={cn("w-1.5 h-1.5 rounded-full shrink-0", dotClass)} 
        animate={isWarning ? { scale: [1, 1.5, 1], opacity: [1, 0.5, 1] } : {}}
        transition={isWarning ? { repeat: Infinity, duration: 2, ease: "easeInOut" } : {}}
      />
      {durum}
    </span>
  );
}
