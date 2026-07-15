import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Link } from "wouter";
import { customFetch } from "@workspace/api-client-react";
import {
  LayoutDashboard,
  HardHat,
  Users,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Seo } from "@/components/seo";
import { PortalLogo } from "@/components/portal/portal-logo";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const ROLE_HOME: Record<string, string> = {
  supervisor: "/portal/supervisor",
  employee: "/portal/employees",
  member: "/portal/members",
  super_admin: "/portal/admin",
};

export function PortalLogin() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  const [pending, setPending] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // The sample-data demo is opt-in so real club staff aren't sent into it.
  const [showDemo, setShowDemo] = useState(false);
  // When reached via a club's own subdomain/slug, show that club's name.
  // Otherwise this is the shared portal entry, so stay brand-neutral.
  const [clubName, setClubName] = useState<string | null>(null);
  useEffect(() => {
    customFetch<{ name: string }>("/api/public/club-info", { credentials: "include" })
      .then((c) => setClubName(c?.name ?? null))
      .catch(() => setClubName(null));
  }, []);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;
    setPending("form");
    try {
      const user = await login(email.trim(), password);
      await new Promise((resolve) => setTimeout(resolve, 0));
      setLocation(ROLE_HOME[user.role] ?? "/portal");
    } catch {
      toast({ title: "Could not sign in", description: "Check your email and password.", variant: "destructive" });
      setPending(null);
    }
  }

  const portals = [
    {
      href: "/portal/supervisor",
      email: "carlos@augustapines.com",
      password: "Password123!",
      icon: LayoutDashboard,
      title: "Supervisor Portal",
      desc: "Oversee the team, live course map, F&B, leads, tee sheet, and tasks.",
      cta: "Enter supervisor portal",
      testid: "card-portal-supervisor",
    },
    {
      href: "/portal/employees",
      email: "maria@augustapines.com",
      password: "Password123!",
      icon: HardHat,
      title: "Employees Portal",
      desc: "Clock in, take and fulfill F&B orders, check your schedule and tasks.",
      cta: "Enter employees portal",
      testid: "card-portal-employees",
    },
    {
      href: "/portal/members",
      email: "james@augustapines.com",
      password: "Password123!",
      icon: Users,
      title: "Members Portal",
      desc: "Book tee times, RSVP to events, reserve dining, and manage your account.",
      cta: "Enter members portal",
      testid: "card-portal-members",
    },
  ];

  async function enter(p: (typeof portals)[number]) {
    if (pending) return;
    setPending(p.href);
    try {
      await login(p.email, p.password);
      // Let the auth-query cache update commit before navigating, otherwise the
      // route guard can briefly see "logged out" and bounce back to /portal
      // (which made the card need a second click).
      await new Promise((resolve) => setTimeout(resolve, 0));
      setLocation(p.href);
    } catch {
      toast({
        title: "Could not sign in",
        description: "The demo account is unavailable. Please try again.",
        variant: "destructive",
      });
      setPending(null);
    }
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-[hsl(146_46%_17%)] px-4 py-16 text-white">
      <Seo title="Log In | Fairway360" description="Log in to your Fairway360 golf club management dashboard." path="/portal" noindex />
      <div className="absolute inset-0 opacity-[0.06] bg-[radial-gradient(circle_at_top,_white,_transparent_60%)] pointer-events-none" />
      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <PortalLogo size="lg" className="mx-auto mb-6" />
          <p className="eyebrow text-accent mb-3">Club Portal</p>
          <h1 className="text-3xl md:text-4xl font-semibold mb-3">
            {clubName ? `Welcome to ${clubName}` : "Sign in to your club"}
          </h1>
          <p className="text-white/60">Use the email and password for your club account.</p>
        </div>

        {/* PRIMARY: real club sign-in. Staff/members invited by their club set a
            password from their invite email, then sign in here. */}
        <form onSubmit={signIn} className="w-full space-y-3 rounded-2xl border border-white/10 bg-white/[0.05] p-6">
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border-white/15 bg-white/5 text-white placeholder:text-white/35"
            data-testid="input-login-email"
          />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border-white/15 bg-white/5 text-white placeholder:text-white/35"
            data-testid="input-login-password"
          />
          <Button
            type="submit"
            className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
            disabled={pending !== null || !email.includes("@") || password.length < 8}
            data-testid="button-login-submit"
          >
            {pending === "form" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
          </Button>
          <div className="flex items-center justify-between pt-1 text-xs">
            <Link href="/portal/forgot" className="text-accent hover:underline" data-testid="link-forgot-password">
              Forgot your password?
            </Link>
            <Link href="/onboarding" className="text-accent hover:underline" data-testid="link-onboarding">
              New club? Set up your club →
            </Link>
          </div>
        </form>

        {/* SECONDARY: sample-data demo, collapsed so real users aren't funnelled
            into the demo club by mistake. */}
        <div className="mt-8">
          <button
            type="button"
            onClick={() => setShowDemo((s) => !s)}
            className="mx-auto flex items-center gap-1.5 text-xs text-white/45 transition-colors hover:text-white/70"
            data-testid="button-toggle-demo"
          >
            {showDemo ? "Hide demo" : "Just exploring? Try the interactive demo"}
            <ArrowRight className={cn("h-3 w-3 transition-transform", showDemo && "rotate-90")} />
          </button>

          {showDemo && (
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {portals.map((p) => (
                <button
                  key={p.href}
                  type="button"
                  onClick={() => enter(p)}
                  disabled={pending !== null}
                  data-testid={p.testid}
                  className="block w-full text-left disabled:cursor-wait"
                >
                  <Card className="group h-full cursor-pointer border-white/10 bg-white/[0.04] p-4 text-white transition-all hover:border-accent/50 hover:bg-white/[0.08]">
                    <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-accent/20 text-accent">
                      <p.icon className="h-4 w-4" />
                    </div>
                    <h2 className="font-display text-sm font-semibold">{p.title}</h2>
                    <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-accent">
                      {pending === p.href ? <>Signing in <Loader2 className="h-3 w-3 animate-spin" /></> : <>Demo <ArrowRight className="h-3 w-3" /></>}
                    </span>
                  </Card>
                </button>
              ))}
            </div>
          )}
          {showDemo && (
            <p className="mt-3 text-center text-[11px] text-white/35">Sample data only — not your club.</p>
          )}
        </div>

        <div className="mt-8 text-center">
          <Link href="/" className="text-sm text-white/50 hover:text-white transition-colors" data-testid="link-back-site">
            ← Back to fairway360.io
          </Link>
        </div>
      </div>
    </div>
  );
}
