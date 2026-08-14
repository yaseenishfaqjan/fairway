// Public club page — /club/<slug>. The club's shareable web presence powered
// by Fairway360: an AI concierge visitors can chat with (no login), plus
// inquiry forms for tee times, membership, and private events. Every inquiry
// becomes a lead on the club's tenant; the follow-up engine nurtures it.

import { useEffect, useRef, useState } from "react";
import { Link, useRoute } from "wouter";
import { customFetch } from "@workspace/api-client-react";
import { Seo } from "@/components/seo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, Loader2, MessageCircle, Send } from "lucide-react";

const inputCls = "border-white/15 bg-white/5 text-white placeholder:text-white/35";

interface ClubInfo {
  name: string;
  slug: string;
  logoUrl: string | null;
  primaryColor: string;
  accentColor: string;
}

type InquiryType = "tee_time" | "membership" | "event";

const INQUIRY_TABS: { key: InquiryType; label: string; blurb: string }[] = [
  { key: "tee_time", label: "Tee Time", blurb: "Tell us when you'd like to play and we'll get back to you the same day." },
  { key: "membership", label: "Membership", blurb: "Interested in joining? Send your details and the membership team will reach out." },
  { key: "event", label: "Private Event", blurb: "Weddings, banquets, outings — tell us about your event and we'll follow up." },
];

interface ChatMsg {
  who: "you" | "club";
  text: string;
}

export function ClubPage() {
  const [, params] = useRoute("/club/:slug");
  const slug = params?.slug ?? "";

  const [club, setClub] = useState<ClubInfo | null>(null);
  const [missing, setMissing] = useState(false);

  // Concierge chat state
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [draft, setDraft] = useState("");
  const [thinking, setThinking] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Inquiry form state
  const [tab, setTab] = useState<InquiryType>("tee_time");
  const [form, setForm] = useState({ name: "", email: "", phone: "", preferredDate: "", message: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!slug) return;
    customFetch<ClubInfo>(`/api/public/club-info?slug=${encodeURIComponent(slug)}`)
      .then((c) => (c?.name ? setClub(c) : setMissing(true)))
      .catch(() => setMissing(true));
  }, [slug]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [msgs, thinking]);

  async function sendChat(e?: React.FormEvent) {
    e?.preventDefault();
    const text = draft.trim();
    if (!text || thinking) return;
    setDraft("");
    setMsgs((m) => [...m, { who: "you", text }]);
    setThinking(true);
    try {
      const res = await customFetch<{ reply: string }>("/api/public/club-chat", {
        method: "POST",
        body: JSON.stringify({ slug, message: text }),
      });
      setMsgs((m) => [...m, { who: "club", text: res.reply }]);
    } catch {
      setMsgs((m) => [
        ...m,
        { who: "club", text: "Sorry — I couldn't answer just now. Please use the inquiry form below and the team will follow up." },
      ]);
    } finally {
      setThinking(false);
    }
  }

  async function submitInquiry(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await customFetch("/api/public/inquiry", {
        method: "POST",
        body: JSON.stringify({
          slug,
          type: tab,
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || undefined,
          preferredDate: form.preferredDate.trim() || undefined,
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
  const activeTab = INQUIRY_TABS.find((t) => t.key === tab)!;

  if (missing) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center bg-[#0b1f16] px-6 text-center text-white">
        <p className="text-xl font-semibold mb-2">Club not found</p>
        <p className="text-white/60 mb-6">We couldn't find that club page. Double-check the link.</p>
        <Button asChild variant="outline" className="border-white/20 text-white">
          <Link href="/">Go to Fairway360</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[#0b1f16] text-white">
      <Seo
        title={club ? `${club.name} — Tee Times, Membership & Events` : "Club"}
        description={club ? `Chat with ${club.name}'s concierge, request a tee time, ask about membership, or plan a private event.` : "Club page"}
        path={`/club/${slug}`}
      />
      <main className="mx-auto max-w-3xl px-4 py-10 md:py-16">
        {/* Club header */}
        <div className="text-center mb-10">
          {club?.logoUrl ? (
            <img src={club.logoUrl} alt={club.name} className="mx-auto mb-4 h-16 w-auto" />
          ) : null}
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">{club?.name ?? "…"}</h1>
          <p className="mt-2 text-white/60">Tee times · Membership · Dining · Private events</p>
        </div>

        {/* AI concierge chat */}
        <section className="mb-10 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-white/80">
            <MessageCircle className="h-4 w-4" />
            Ask us anything — hours, dress code, dining, membership
          </div>
          <div className="mb-3 max-h-72 space-y-3 overflow-y-auto pr-1">
            {msgs.length === 0 && (
              <p className="text-sm text-white/40">
                Try: "What are your hours this week?" or "Do you host weddings?"
              </p>
            )}
            {msgs.map((m, i) => (
              <div
                key={i}
                className={
                  m.who === "you"
                    ? "ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-emerald-700/70 px-4 py-2 text-sm"
                    : "mr-auto max-w-[85%] rounded-2xl rounded-bl-sm bg-white/10 px-4 py-2 text-sm"
                }
              >
                {m.text}
              </div>
            ))}
            {thinking && (
              <div className="mr-auto flex max-w-[85%] items-center gap-2 rounded-2xl rounded-bl-sm bg-white/10 px-4 py-2 text-sm text-white/60">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> typing…
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
          <form onSubmit={sendChat} className="flex gap-2">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Type your question…"
              className={inputCls}
              maxLength={600}
              data-testid="input-club-chat"
            />
            <Button type="submit" size="icon" disabled={!draft.trim() || thinking} aria-label="Send">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </section>

        {/* Inquiry forms */}
        <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          {done ? (
            <div className="flex flex-col items-center py-10 text-center">
              <CheckCircle2 className="mb-3 h-12 w-12 text-emerald-400" />
              <p className="text-lg font-semibold">Request received!</p>
              <p className="mt-1 max-w-sm text-white/60">
                {club?.name} has your {activeTab.label.toLowerCase()} inquiry. Check your email —
                a confirmation is on its way, and the team will follow up shortly.
              </p>
              <Button
                variant="outline"
                className="mt-6 border-white/20 text-white"
                onClick={() => {
                  setDone(false);
                  setForm({ name: "", email: "", phone: "", preferredDate: "", message: "" });
                }}
              >
                Send another inquiry
              </Button>
            </div>
          ) : (
            <>
              <div className="mb-4 flex gap-2">
                {INQUIRY_TABS.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setTab(t.key)}
                    className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                      tab === t.key
                        ? "bg-emerald-600 text-white"
                        : "bg-white/5 text-white/60 hover:bg-white/10"
                    }`}
                    data-testid={`tab-inquiry-${t.key}`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <p className="mb-4 text-sm text-white/60">{activeTab.blurb}</p>
              <form onSubmit={submitInquiry} className="space-y-3">
                <div className="grid gap-3 md:grid-cols-2">
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Your name"
                    className={inputCls}
                    data-testid="input-inquiry-name"
                  />
                  <Input
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="Email"
                    type="email"
                    className={inputCls}
                    data-testid="input-inquiry-email"
                  />
                  <Input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="Phone (optional)"
                    className={inputCls}
                  />
                  <Input
                    value={form.preferredDate}
                    onChange={(e) => setForm({ ...form, preferredDate: e.target.value })}
                    placeholder={tab === "membership" ? "When would you like to start?" : "Preferred date/time"}
                    className={inputCls}
                  />
                </div>
                <Textarea
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  placeholder="Anything else we should know? (optional)"
                  className={inputCls}
                  rows={3}
                  maxLength={600}
                />
                {error && <p className="text-sm text-red-400">{error}</p>}
                <Button type="submit" className="w-full" disabled={!valid || busy} data-testid="button-inquiry-submit">
                  {busy ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending…
                    </>
                  ) : (
                    `Send ${activeTab.label} Inquiry`
                  )}
                </Button>
              </form>
            </>
          )}
        </section>

        <p className="mt-8 text-center text-xs text-white/30">
          Powered by <Link href="/" className="underline hover:text-white/60">Fairway360</Link>
        </p>
      </main>
    </div>
  );
}
