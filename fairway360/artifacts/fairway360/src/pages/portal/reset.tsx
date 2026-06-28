import { useState, type ReactNode } from "react";
import { useLocation, useSearch, Link } from "wouter";
import { Loader2, CheckCircle2, ArrowLeft } from "lucide-react";
import { useForgotPassword, useResetPassword } from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PortalLogo } from "@/components/portal/portal-logo";
import { useToast } from "@/hooks/use-toast";

function Shell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[hsl(146_46%_12%)] px-4">
      <Card className="w-full max-w-md border-white/10 bg-white/[0.04] p-8 text-white backdrop-blur-xl">
        <div className="mb-6 flex justify-center"><PortalLogo /></div>
        <h1 className="mb-1 text-center font-display text-xl font-semibold">{title}</h1>
        {children}
      </Card>
    </div>
  );
}

export function ForgotPassword() {
  const forgot = useForgotPassword();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await forgot.mutateAsync({ data: { email: email.trim() } });
    } catch {
      // Intentionally ignore — never reveal whether the account exists.
    }
    setSent(true);
  }

  if (sent) {
    return (
      <Shell title="Check your email">
        <p className="mt-3 text-center text-sm text-white/70">
          If an account exists for <span className="text-white">{email}</span>, a password-reset
          link is on its way. It expires in 1 hour.
        </p>
        <Link href="/portal" className="mt-6 flex items-center justify-center gap-1.5 text-sm text-accent hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to sign in
        </Link>
      </Shell>
    );
  }

  return (
    <Shell title="Reset your password">
      <p className="mb-5 mt-1 text-center text-sm text-white/60">
        Enter your email and we'll send you a reset link.
      </p>
      <form onSubmit={submit} className="space-y-3">
        <Input
          type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="you@club.com" data-testid="input-forgot-email"
          className="border-white/15 bg-white/5 text-white placeholder:text-white/40"
        />
        <Button type="submit" disabled={forgot.isPending} data-testid="button-forgot-submit"
          className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
          {forgot.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send reset link"}
        </Button>
      </form>
      <Link href="/portal" className="mt-5 flex items-center justify-center gap-1.5 text-sm text-white/60 hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Back to sign in
      </Link>
    </Shell>
  );
}

export function ResetPassword() {
  const search = useSearch();
  const token = new URLSearchParams(search).get("token") ?? "";
  const [, setLocation] = useLocation();
  const reset = useResetPassword();
  const { toast } = useToast();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <Shell title="Invalid reset link">
        <p className="mt-3 text-center text-sm text-white/70">
          This link is missing its token. Request a new one.
        </p>
        <Link href="/portal/forgot" className="mt-6 flex items-center justify-center text-sm text-accent hover:underline">
          Request a new reset link
        </Link>
      </Shell>
    );
  }

  if (done) {
    return (
      <Shell title="Password updated">
        <div className="mt-3 flex flex-col items-center gap-3">
          <CheckCircle2 className="h-10 w-10 text-emerald-400" />
          <p className="text-center text-sm text-white/70">You can now sign in with your new password.</p>
          <Button onClick={() => setLocation("/portal")} className="mt-2 bg-accent text-accent-foreground hover:bg-accent/90">
            Go to sign in
          </Button>
        </div>
      </Shell>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 8) {
      toast({ title: "Password too short", description: "Use at least 8 characters.", variant: "destructive" });
      return;
    }
    if (pw !== pw2) {
      toast({ title: "Passwords don't match", description: "Please re-enter them.", variant: "destructive" });
      return;
    }
    try {
      await reset.mutateAsync({ data: { token, password: pw } });
      setDone(true);
    } catch {
      toast({ title: "Reset failed", description: "This link is invalid or has expired. Request a new one.", variant: "destructive" });
    }
  }

  return (
    <Shell title="Set a new password">
      <form onSubmit={submit} className="mt-4 space-y-3">
        <Input
          type="password" required value={pw} onChange={(e) => setPw(e.target.value)}
          placeholder="New password (min 8 chars)" data-testid="input-new-password"
          className="border-white/15 bg-white/5 text-white placeholder:text-white/40"
        />
        <Input
          type="password" required value={pw2} onChange={(e) => setPw2(e.target.value)}
          placeholder="Confirm new password" data-testid="input-confirm-password"
          className="border-white/15 bg-white/5 text-white placeholder:text-white/40"
        />
        <Button type="submit" disabled={reset.isPending} data-testid="button-reset-submit"
          className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
          {reset.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update password"}
        </Button>
      </form>
    </Shell>
  );
}
