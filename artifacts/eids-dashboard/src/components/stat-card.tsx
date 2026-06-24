import { ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: number | string;
  icon: ReactNode;
  trend?: string;
  trendUp?: boolean;
  className?: string;
  delay?: number;
}

export function StatCard({ title, value, icon, trend, trendUp, className, delay = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: "easeOut" }}
      className={cn(
        "bg-card rounded-2xl p-6 border border-border/60",
        "shadow-sm hover:shadow-md transition-shadow duration-300",
        "relative overflow-hidden group",
        className
      )}
    >
      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all duration-500 transform origin-top-right">
        {icon}
      </div>
      
      <div className="flex items-start justify-between">
        <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
          {icon}
        </div>
      </div>
      
      <div className="mt-4">
        <h3 className="text-muted-foreground text-sm font-medium">{title}</h3>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-3xl font-display font-bold text-foreground">
            {value}
          </span>
          {trend && (
            <span className={cn(
              "text-xs font-semibold px-2 py-0.5 rounded-full",
              trendUp ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
            )}>
              {trend}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
