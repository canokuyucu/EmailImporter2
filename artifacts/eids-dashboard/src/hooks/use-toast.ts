import * as React from "react";

export interface Toast {
  id: string;
  title?: string;
  description?: string;
  variant?: "default" | "destructive" | "success";
}

let listeners: Function[] = [];
let toasts: Toast[] = [];

export const toast = (t: Omit<Toast, "id">) => {
  const id = Math.random().toString(36).slice(2);
  toasts = [...toasts, { ...t, id }];
  listeners.forEach((l) => l(toasts));
  setTimeout(() => {
    toasts = toasts.filter((x) => x.id !== id);
    listeners.forEach((l) => l(toasts));
  }, 4000);
};

export function useToast() {
  const [state, setState] = React.useState<Toast[]>(toasts);

  React.useEffect(() => {
    listeners.push(setState);
    return () => {
      listeners = listeners.filter((l) => l !== setState);
    };
  }, []);

  return { toasts: state, toast };
}
