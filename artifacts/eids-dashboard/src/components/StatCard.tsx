import * as React from "react";
import { Card, AnimatedNumber } from "./ui/shared";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

function Sparkline({ data }: { data: number[] }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const W = 80;
  const H = 28;
  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * W;
      const y = H - ((v - min) / range) * (H - 2) - 1;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const isUp = data[data.length - 1] >= data[0];
  const color = isUp ? "#10b981" : "#f43f5e";

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-7 mt-2" preserveAspectRatio="none">
      <defs>
        <linearGradient id={`sg-${data[0]}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline
        points={`0,${H} ${pts} ${W},${H}`}
        fill={`url(#sg-${data[0]})`}
        stroke="none"
      />
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.8"
      />
      <circle
        cx={((data.length - 1) / (data.length - 1)) * W}
        cy={H - ((data[data.length - 1] - min) / range) * (H - 2) - 1}
        r="2"
        fill={color}
      />
    </svg>
  );
}

export function StatCard({
  title,
  value,
  icon,
  colorClass,
  delay = 0,
  sparkData,
  trend,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  colorClass?: string;
  delay?: number;
  sparkData?: number[];
  trend?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay, ease: "easeOut" }}
    >
      <Card className="p-5 flex flex-col justify-between hover:shadow-lg hover:-translate-y-1 transition-all duration-300 dark:bg-slate-900 border-2 dark:border-slate-800 relative overflow-hidden group">
        {/* Hover shimmer */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/60 to-transparent dark:from-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

        <div className="flex justify-between items-start mb-3 relative z-10">
          <div className={cn("p-3 rounded-xl border shadow-sm", colorClass)}>{icon}</div>
          {trend !== undefined && (
            <motion.span
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: delay + 0.3 }}
              className={cn(
                "text-[11px] font-bold px-2 py-0.5 rounded-full border",
                trend > 0
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20"
                  : trend < 0
                  ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20"
                  : "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400"
              )}
            >
              {trend > 0 ? "↑" : trend < 0 ? "↓" : "→"} {Math.abs(trend)}%
            </motion.span>
          )}
        </div>

        <div className="relative z-10">
          <p className="text-3xl font-display font-bold text-foreground tracking-tight">
            {typeof value === "number" || !isNaN(Number(value)) ? (
              <AnimatedNumber value={value} />
            ) : (
              value
            )}
          </p>
          <p className="text-sm font-medium text-muted-foreground mt-1">{title}</p>
          {sparkData && <Sparkline data={sparkData} />}
        </div>
      </Card>
    </motion.div>
  );
}
