import { useState } from "react";
import { Check, Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

/** Categories we offer out of the box; clubs can add any of their own. */
export const MENU_CATEGORY_SUGGESTIONS = [
  "Breakfast", "Lunch", "Dinner", "Beverages", "Snacks", "Specials",
];

const CUSTOM = "__custom__";

/**
 * Menu-category picker: choose a suggested category OR add a custom one
 * ("Halfway House", "Grill Room", "Kids Menu"…). Any existing club categories
 * are merged into the list so they can be reused.
 */
export function CategoryPicker({
  value,
  onChange,
  existing = [],
  className,
  testId,
}: {
  value: string;
  onChange: (v: string) => void;
  /** Categories already used by this club — offered alongside the defaults. */
  existing?: string[];
  className?: string;
  testId?: string;
}) {
  const options = [...new Set([...MENU_CATEGORY_SUGGESTIONS, ...existing.filter(Boolean)])];
  // If the current value isn't a known option, we're already in custom mode.
  const [custom, setCustom] = useState(() => Boolean(value) && !options.includes(value));
  const [draft, setDraft] = useState(custom ? value : "");

  if (custom) {
    return (
      <div className={cn("flex items-center gap-1", className)}>
        <Input
          autoFocus
          value={draft}
          maxLength={40}
          placeholder="Custom category"
          onChange={(e) => { setDraft(e.target.value); onChange(e.target.value.trim()); }}
          className="h-9 border-white/15 bg-white/5 text-white placeholder:text-white/35"
          data-testid={testId ? `${testId}-custom-input` : "category-custom-input"}
        />
        <button
          type="button"
          aria-label="Use suggested categories"
          onClick={() => { setCustom(false); onChange(options[0]); }}
          className="shrink-0 rounded-md p-1.5 text-white/50 hover:bg-white/10 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <Select
      value={options.includes(value) ? value : ""}
      onValueChange={(v) => {
        if (v === CUSTOM) { setCustom(true); setDraft(""); onChange(""); }
        else onChange(v);
      }}
    >
      <SelectTrigger
        className={cn("border-white/15 bg-white/5 text-white", className)}
        data-testid={testId ?? "category-select"}
      >
        <SelectValue placeholder="Category" />
      </SelectTrigger>
      <SelectContent>
        {options.map((c) => (
          <SelectItem key={c} value={c}>
            <span className="flex items-center gap-2">
              {value === c && <Check className="h-3.5 w-3.5" />}
              {c}
            </span>
          </SelectItem>
        ))}
        <SelectItem value={CUSTOM}>
          <span className="flex items-center gap-2 text-accent">
            <Plus className="h-3.5 w-3.5" /> Add custom category…
          </span>
        </SelectItem>
      </SelectContent>
    </Select>
  );
}
