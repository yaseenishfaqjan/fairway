// Member self-service dining/AI preferences (build-doc Part 6, onboarding
// step 3). Saved to /api/me/preferences — feeds the AI agents' episodic
// memory immediately (allergens are safety-critical: agents never suggest
// items containing them).

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, ShieldCheck } from "lucide-react";
import { customFetch } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const ALLERGENS = ["nuts", "peanuts", "shellfish", "dairy", "gluten", "eggs", "soy", "fish", "sesame"];
const DIETS = ["vegetarian", "vegan", "halal", "kosher", "gluten-free", "pescatarian"];

type Prefs = {
  allergens: string[];
  dietaryRestrictions: string[];
  usualTable: string | null;
  communicationStyle: string | null;
};

const inputCls = "border-white/15 bg-white/5 text-white placeholder:text-white/35";

function ChipRow({
  options, selected, onToggle, tone,
}: { options: string[]; selected: string[]; onToggle: (v: string) => void; tone: "red" | "gold" }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const on = selected.includes(o);
        return (
          <button
            key={o}
            type="button"
            onClick={() => onToggle(o)}
            className={cn(
              "rounded-full border px-2.5 py-1 text-xs transition-colors",
              on
                ? tone === "red"
                  ? "border-red-400/50 bg-red-500/20 text-red-200"
                  : "border-accent bg-accent/20 text-accent"
                : "border-white/15 text-white/60 hover:bg-white/10",
            )}
            data-testid={`pref-chip-${o}`}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

export function MemberPreferences() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const prefsQ = useQuery({
    queryKey: ["me", "preferences"],
    queryFn: () => customFetch<Prefs>("/api/me/preferences", { credentials: "include" }),
  });
  const [form, setForm] = useState<Prefs | null>(null);
  useEffect(() => {
    if (prefsQ.data && !form) setForm(prefsQ.data);
  }, [prefsQ.data, form]);

  const save = useMutation({
    mutationFn: (p: Prefs) =>
      customFetch("/api/me/preferences", {
        method: "PATCH",
        credentials: "include",
        body: JSON.stringify(p),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["me", "preferences"] });
      toast({ title: "Preferences saved", description: "The club's AI assistants know immediately." });
    },
    onError: (e: Error) => toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });

  if (!form) return <Loader2 className="h-5 w-5 animate-spin text-accent" />;
  const toggle = (key: "allergens" | "dietaryRestrictions", v: string) =>
    setForm({
      ...form,
      [key]: form[key].includes(v) ? form[key].filter((x) => x !== v) : [...form[key], v],
    });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-white/60">
        <ShieldCheck className="h-4 w-4 text-emerald-400" />
        Used by the club's AI so it never suggests something you can't have.
      </div>
      <div>
        <div className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-red-300/90">Allergens</div>
        <ChipRow options={ALLERGENS} selected={form.allergens} onToggle={(v) => toggle("allergens", v)} tone="red" />
      </div>
      <div>
        <div className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-accent/90">Dietary</div>
        <ChipRow options={DIETS} selected={form.dietaryRestrictions} onToggle={(v) => toggle("dietaryRestrictions", v)} tone="gold" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <div className="mb-1 text-xs text-white/60">Usual table / delivery spot</div>
          <Input
            className={inputCls}
            placeholder="e.g. Table 7, Terrace"
            value={form.usualTable ?? ""}
            onChange={(e) => setForm({ ...form, usualTable: e.target.value || null })}
            data-testid="input-pref-usual-table"
          />
        </div>
        <div>
          <div className="mb-1 text-xs text-white/60">How should the AI talk to you?</div>
          <Select
            value={form.communicationStyle ?? "friendly"}
            onValueChange={(v) => setForm({ ...form, communicationStyle: v })}
          >
            <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
            <SelectContent>
              {["formal", "friendly", "casual", "brief"].map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <Button
        className="bg-accent text-accent-foreground hover:bg-accent/90"
        disabled={save.isPending}
        onClick={() => save.mutate(form)}
        data-testid="button-save-preferences"
      >
        {save.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} Save preferences
      </Button>
    </div>
  );
}
