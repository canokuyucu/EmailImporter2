import * as React from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

export const PREDEFINED_TAGS = ["Konut", "Ticari", "Arazi", "İşyeri", "Depo", "Arsa", "Acil", "VIP", "Beklemede"];

const TAG_COLORS: Record<string, string> = {
  "Konut":     "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
  "Ticari":    "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-400 dark:border-violet-800",
  "Arazi":     "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
  "İşyeri":   "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800",
  "Depo":      "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800",
  "Arsa":      "bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-400 dark:border-teal-800",
  "Acil":      "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
  "VIP":       "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800",
  "Beklemede": "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700",
};

const DEFAULT_COLOR = "bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800";

export function getTagColor(tag: string): string {
  return TAG_COLORS[tag] ?? DEFAULT_COLOR;
}

export function EtiketBadge({ etiket, onRemove, size = "sm" }: { etiket: string; onRemove?: () => void; size?: "sm" | "xs" }) {
  const color = getTagColor(etiket);
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-md font-semibold border whitespace-nowrap",
      size === "xs" ? "px-1.5 py-0 text-[10px]" : "px-2 py-0.5 text-xs",
      color
    )}>
      {etiket}
      {onRemove && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="hover:opacity-70 transition-opacity ml-0.5"
        >
          <X className="w-2.5 h-2.5" />
        </button>
      )}
    </span>
  );
}

export function EtiketPicker({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (tags: string[]) => void;
}) {
  const [custom, setCustom] = React.useState("");

  const toggle = (tag: string) => {
    if (selected.includes(tag)) onChange(selected.filter(t => t !== tag));
    else onChange([...selected, tag]);
  };

  const addCustom = () => {
    const t = custom.trim();
    if (t && !selected.includes(t)) onChange([...selected, t]);
    setCustom("");
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {PREDEFINED_TAGS.map(tag => (
          <button
            key={tag}
            onClick={() => toggle(tag)}
            className={cn(
              "px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all",
              selected.includes(tag)
                ? cn(getTagColor(tag), "ring-2 ring-primary ring-offset-1")
                : cn(getTagColor(tag), "opacity-60 hover:opacity-100")
            )}
          >
            {tag}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={custom}
          onChange={e => setCustom(e.target.value)}
          onKeyDown={e => e.key === "Enter" && addCustom()}
          placeholder="Özel etiket..."
          className="flex-1 text-xs px-3 py-2 border rounded-lg bg-background outline-none focus:ring-2 focus:ring-primary"
        />
        <button
          onClick={addCustom}
          className="px-3 py-2 bg-primary text-white rounded-lg text-xs font-semibold hover:bg-primary/90 transition-colors"
        >
          Ekle
        </button>
      </div>
    </div>
  );
}
