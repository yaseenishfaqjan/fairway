// Public "request to join" page — a prospective member applies to a specific
// club at /join/<club-slug>. Submitting creates a Membership Application the club
// approves from its Leads tab (which then sends the set-password invite). Members
// are never created here directly — the club owns its roster.

import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import { customFetch } from "@workspace/api-client-react";
import { Seo } from "@/components/seo";
import { PortalLogo } from "@/components/portal/portal-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, Loader2 } from "lucide-react";

const inputCls = "border-white/15 bg-white/5 text-white placeholder:text-white/35";

export function Join() {
  const [, params] = useRoute("/join/:slug");
  const slug = params?.slug ?? "";

  const [clubName, setClubName] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!slug) return;
    customFetch<{ name: string }>(`/api/public/club-info?slug=${encodeURIComponent(slug)}`)
      .then((c) => setClubName(c?.name ?? null))
      .catch(() => setClubName(null));
  }, [slug]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await customFetch("/api/public/join", {
        method: "POST",
        body: JSON.stringify({
          slug,
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || undefined,
          message: form.message.trim() || undefined,
        }),
      });
      setDone(true);
    } catch (err) {
      const raw = (err as Error).message || "Please try again.";
      setError(raw.replace(/^HTTP \d+[^:]*:\s*/i, ""));
    } finally {
      setBusy(false);
    }
  }

  const valid = form.name.trim().length >= 2 && /.+@.+\..+/.test(form.email);
  const where = clubName ?? "the club";

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-[#04130c] px-4 py-12 text-white">
      <Seo
        title={clubName ? `Join ${clubName} — Fairway360` : "Request to join — Fairway360"}
        description="Apply to become a member of your golf club."
        path={`/join/${slug}`}
        noindex
      />
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <PortalLogo size="sm" />
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-accent/90">Membership Application</p>
          <h1 className="font-display text-2xl font-semibold">Request to join {where}</h1>
          <p className="text-sm text-white/50">
            Send the club your details. Once they approve you, you'll get an email to set up your member account.
          </p>
        </div>

        {done ? (
          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-6 text-center" data-testid="join-success">
            <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-emerald-300" />
            <h2 className="mb-1 font-display text-lg font-semibold">Application sent</h2>
            <p className="text-sm text-white/60">
              {where} has your application. Watch your inbox — you'll get a set-up link once you're approved.
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.05] p-6" data-testid="join-form">
            <Input className={inputCls} placeholder="Full name" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="input-join-name" />
            <Input className={inputCls} type="email" placeholder="Email" value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })} data-testid="input-join-email" />
            <Input className={inputCls} placeholder="Phone (optional)" value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })} data-testid="input-join-phone" />
            <Textarea className={inputCls} placeholder="Anything you'd like the club to know (optional)" value={form.message}
              rows={3} onChange={(e) => setForm({ ...form, message: e.target.value })} data-testid="input-join-message" />
            {error && <p className="text-sm text-red-300" data-testid="join-error">{error}</p>}
            <Button type="submit" className="w-full" disabled={busy || !valid} data-testid="button-join-submit">
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send application
            </Button>
            <p className="pt-1 text-center text-xs text-white/40">
              Already a member? <a href="/portal" className="text-accent hover:underline">Sign in</a>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

export default Join;
