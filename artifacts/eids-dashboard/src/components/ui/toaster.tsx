import { useToast } from "./use-toast"
import { AnimatePresence, motion } from "framer-motion"
import { AlertCircle, CheckCircle2, X } from "lucide-react"
import { cn } from "@/lib/utils"

export function Toaster() {
  const { toasts, dismiss } = useToast()

  return (
    <div className="fixed top-0 right-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px] gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map(function ({ id, title, description, variant, ...props }) {
          const isDestructive = variant === "destructive";
          return (
            <motion.div
              key={id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
              className={cn(
                "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-xl border p-4 pr-8 shadow-lg transition-all",
                isDestructive 
                  ? "bg-destructive text-destructive-foreground border-destructive" 
                  : "bg-card text-foreground border-border dark:border-slate-800"
              )}
              {...props}
            >
              <div className="flex gap-3">
                {isDestructive ? (
                  <AlertCircle className="h-5 w-5 mt-0.5 shrink-0 opacity-90" />
                ) : (
                  <CheckCircle2 className="h-5 w-5 mt-0.5 shrink-0 text-emerald-500" />
                )}
                <div className="flex flex-col gap-1">
                  {title && <div className="font-semibold text-sm">{title}</div>}
                  {description && (
                    <div className={cn("text-sm opacity-90", !isDestructive && "text-muted-foreground")}>
                      {description}
                    </div>
                  )}
                </div>
              </div>
              <button 
                onClick={() => dismiss(id)}
                className={cn(
                  "absolute right-2 top-2 rounded-md p-1 opacity-0 transition-opacity group-hover:opacity-100",
                  isDestructive ? "text-red-100 hover:text-white" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
