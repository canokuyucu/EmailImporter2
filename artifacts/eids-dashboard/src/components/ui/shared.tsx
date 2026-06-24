import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

export const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary/90 hover:shadow-lg hover:-translate-y-0.5",
        destructive: "bg-destructive text-destructive-foreground shadow-sm shadow-destructive/20 hover:bg-destructive/90 hover:-translate-y-0.5",
        outline: "border-2 border-input bg-transparent hover:bg-accent hover:text-accent-foreground dark:border-slate-700 dark:hover:bg-slate-800",
        secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground dark:hover:bg-slate-800",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 md:h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3 text-xs",
        lg: "h-12 rounded-xl px-8 text-base",
        icon: "h-11 w-11 md:h-10 md:w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, ...props }, ref) => {
  return <button className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
});
Button.displayName = "Button";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}
export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        "flex h-11 md:h-10 w-full rounded-lg border-2 border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-50 transition-all dark:bg-slate-900 dark:border-slate-700 dark:focus-visible:border-primary",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Input.displayName = "Input";

export const Checkbox = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => (
  <input
    type="checkbox"
    ref={ref}
    className={cn(
      "h-5 w-5 md:h-4 md:w-4 rounded border-slate-300 text-primary focus:ring-primary transition-all cursor-pointer accent-primary dark:border-slate-600",
      className
    )}
    {...props}
  />
));
Checkbox.displayName = "Checkbox";

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("animate-pulse rounded-md bg-slate-200 dark:bg-slate-800", className)} {...props} />;
}

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-2xl border bg-card text-card-foreground shadow-sm dark:border-slate-800", className)} {...props} />;
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
}
export function Modal({ isOpen, onClose, title, children, maxWidth = "max-w-lg" }: ModalProps) {
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    if (isOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "unset";
    return () => {
      window.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={cn(
              "relative bg-card w-full h-full md:h-auto rounded-none md:rounded-2xl shadow-2xl border dark:border-slate-800 flex flex-col md:max-h-[90vh] overflow-hidden", 
              maxWidth
            )}
          >
            <div className="flex items-center justify-between p-5 md:p-6 border-b dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
              <h2 className="text-xl font-display font-bold text-foreground">{title}</h2>
              <button 
                onClick={onClose} 
                className="p-2 -mr-2 text-muted-foreground hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-foreground rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-5 md:p-6 overflow-y-auto flex-1 dark:bg-slate-950">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors whitespace-nowrap",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        destructive: "border-transparent bg-destructive text-destructive-foreground",
        outline: "text-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  }
);
export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}
export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export function AnimatedNumber({ value }: { value: number | string }) {
  const [display, setDisplay] = React.useState(0);
  const numValue = typeof value === 'string' ? parseInt(value) : value;
  
  React.useEffect(() => {
    if (isNaN(numValue)) return;
    let start = 0;
    const duration = 800; // ms
    const increment = numValue / (duration / 16);
    
    if (numValue === 0) {
      setDisplay(0);
      return;
    }

    const timer = setInterval(() => {
      start += increment;
      if (start >= numValue) {
        setDisplay(numValue);
        clearInterval(timer);
      } else {
        setDisplay(Math.floor(start));
      }
    }, 16);
    
    return () => clearInterval(timer);
  }, [numValue]);
  
  return <>{isNaN(numValue) ? value : display}</>;
}
