import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const normalizedStatus = status.toUpperCase();
  
  // Base classes for the pill shape and font sizing
  const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide border";
  
  // Determine color based on Turkish status terms
  let colorClasses = "bg-slate-100 text-slate-800 border-slate-200"; // Default
  
  if (normalizedStatus === "AKTİF") {
    colorClasses = "bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm shadow-emerald-100/50";
  } else if (normalizedStatus === "SÜRE BİTTİ") {
    colorClasses = "bg-rose-50 text-rose-700 border-rose-200 shadow-sm shadow-rose-100/50";
  } else if (normalizedStatus === "İPTAL") {
    colorClasses = "bg-slate-100 text-slate-600 border-slate-200";
  } else if (normalizedStatus.includes("GÜN KALDI")) {
    colorClasses = "bg-amber-50 text-amber-700 border-amber-200 shadow-sm shadow-amber-100/50";
  } else if (normalizedStatus === "HATA") {
    colorClasses = "bg-red-100 text-red-800 border-red-300";
  }

  return (
    <span className={cn(baseClasses, colorClasses)}>
      {status}
    </span>
  );
}
