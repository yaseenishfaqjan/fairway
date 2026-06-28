import { useState } from "react";
import { useLocation } from "wouter";
import { Link } from "wouter";
import {
  LayoutDashboard,
  HardHat,
  Users,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { PortalLogo } from "@/components/portal/portal-logo";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

export function PortalLogin() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  const [pending, setPending] = useState<string | null>(null);

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
    <div className="min-h-screen flex flex-col items-center justify-center bg-[hsl(146_46%_17%)] px-4 py-16 text-white">
      <div className="absolute inset-0 opacity-[0.06] bg-[radial-gradient(circle_at_top,_white,_transparent_60%)] pointer-events-none" />
      <div className="relative z-10 w-full max-w-5xl">
        <div className="text-center mb-10">
          <PortalLogo size="lg" className="mx-auto mb-6" />
          <p className="eyebrow text-accent mb-3">Club Portal</p>
          <h1 className="text-3xl md:text-4xl font-semibold mb-3">Welcome to Augusta Pines</h1>
          <p className="text-white/60 max-w-md mx-auto">Choose your portal to continue. This is an interactive demo with sample data.</p>
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          {portals.map((p) => (
            <button
              key={p.href}
              type="button"
              onClick={() => enter(p)}
              disabled={pending !== null}
              data-testid={p.testid}
              className="block w-full text-left disabled:cursor-wait"
            >
              <Card className="group h-full cursor-pointer border-white/10 bg-white/[0.05] p-6 text-white transition-all hover:-translate-y-1 hover:border-accent/50 hover:bg-white/[0.08]">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent/20 text-accent">
                  <p.icon className="h-6 w-6" />
                </div>
                <h2 className="font-display text-xl font-semibold mb-2">{p.title}</h2>
                <p className="text-sm text-white/60 mb-5 leading-relaxed">{p.desc}</p>
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-accent">
                  {pending === p.href ? (
                    <>
                      Signing in
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </>
                  ) : (
                    <>
                      {p.cta}
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </span>
              </Card>
            </button>
          ))}
        </div>

        <div className="mt-8 flex flex-col items-center gap-3 text-center">
          <Link href="/portal/forgot" className="text-sm text-accent hover:underline" data-testid="link-forgot-password">
            Forgot your password?
          </Link>
          <Link href="/" className="text-sm text-white/50 hover:text-white transition-colors" data-testid="link-back-site">
            ← Back to fairway360.com
          </Link>
        </div>
      </div>
    </div>
  );
}
