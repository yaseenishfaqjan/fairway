import { Navbar } from "@/components/layout/navbar";
import { Seo } from "@/components/seo";
import { Footer } from "@/components/layout/footer";
import { Check, PhoneCall, ClipboardList, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { RevealText } from "@/components/anim/reveal";
import { breadcrumb, HOME_FAQ_SCHEMA } from "@/lib/seo-schema";

export function Pricing() {
  const tiers = [
    {
      name: "Fairway Core",
      plan: "core",
      description: "Public and smaller golf courses",
      price: "$497",
      setup: "$750 one-time implementation",
      features: [
        "Website AI concierge for your club page",
        "Tee-time lead capture",
        "Club CRM with lead pipeline",
        "Automated email follow-up",
        "Review automation",
        "Member & player database",
        "Reporting dashboard",
        "Unlimited staff users",
      ],
      cta: "Talk to us about Core",
      highlighted: false,
    },
    {
      name: "Fairway Pro",
      plan: "pro",
      description: "Active golf courses and semi-private clubs",
      price: "$997",
      setup: "$1,500 one-time implementation",
      features: [
        "Everything in Core, plus:",
        "24/7 AI phone receptionist*",
        "Full tee-time automation & member booking",
        "Membership sales automation & follow-up",
        "Event & wedding lead capture",
        "Tournament & event registration",
        "Staff task automation & shifts",
        "AI concierge with member memory",
        "Advanced dashboards & analytics",
        "Priority support",
      ],
      cta: "Talk to us about Pro",
      highlighted: true,
    },
    {
      name: "Fairway Elite",
      plan: "elite",
      description: "Private country clubs & full-service facilities",
      price: "$1,997",
      setup: "$2,500 one-time implementation",
      features: [
        "Everything in Pro, plus:",
        "Dining & restaurant system",
        "Mobile food ordering to hole or cart",
        "Kitchen command center",
        "Multi-department workflows",
        "Custom AI voice scripts",
        "Executive analytics & CSV reporting",
        "White-glove onboarding",
        "Dedicated success manager",
      ],
      cta: "Talk to us about Elite",
      highlighted: false,
    },
    {
      name: "Fairway Enterprise",
      plan: "enterprise",
      description: "Multi-club groups, resorts & operators",
      price: "From $2,997",
      setup: "Custom implementation",
      features: [
        "Everything in Elite, plus:",
        "Multi-location management",
        "Central executive dashboard",
        "Cross-club analytics",
        "Multiple AI agents",
        "Custom integrations (quoted)",
        "Enterprise permissions & roles",
        "SLA & uptime commitments",
        "Dedicated account manager",
      ],
      cta: "Talk to us about Enterprise",
      highlighted: false,
    },
  ];

  const steps = [
    {
      icon: PhoneCall,
      title: "1. Book a call",
      body: "Every club starts with a conversation. Tell us how your club runs today and pick the plan that fits.",
    },
    {
      icon: ClipboardList,
      title: "2. We onboard your club",
      body: "Our team sets everything up with you — branding, menu, tee sheet, knowledge base, staff and member accounts.",
    },
    {
      icon: Rocket,
      title: "3. We integrate & launch",
      body: "We train your staff, run a live end-to-end test, and stay with you through your first weeks of operation.",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Seo
        title="Golf Club Software Pricing | Fairway360"
        description="Fairway360 plans: Core $497/mo, Pro $997/mo, Elite $1,997/mo, Enterprise from $2,997/mo — plus white-glove implementation. Every club starts with a call."
        path="/pricing"
        jsonLd={[breadcrumb([{ name: "Home", path: "/" }, { name: "Pricing", path: "/pricing" }]), HOME_FAQ_SCHEMA]}
      />
      <Navbar />
      <main className="flex-1">
        <section className="py-20 md:py-32 px-4 md:px-6">
          <div className="container mx-auto text-center max-w-3xl mb-16">
            <p className="eyebrow text-[hsl(38_55%_40%)] mb-5">Plans & Implementation</p>
            <RevealText as="h1" className="text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight text-foreground mb-6 leading-[1.05]">
              One Operating System. Four Plans.
            </RevealText>
            <p className="text-xl text-muted-foreground">
              Every Fairway360 club is onboarded personally by our team — you pick the plan,
              we set up your entire club, then we launch together.
            </p>
          </div>

          <div className="container mx-auto grid gap-8 md:grid-cols-2 xl:grid-cols-4 max-w-7xl items-start">
            {tiers.map((tier, i) => (
              <Card
                key={i}
                className={`fw-glow relative flex flex-col ${
                  tier.highlighted
                    ? "border-accent shadow-lg xl:-mt-6 xl:mb-6"
                    : "border-border"
                }`}
              >
                {tier.highlighted && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
                    <span className="bg-accent text-accent-foreground text-xs font-bold uppercase tracking-wider py-1 px-3 rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="text-2xl">{tier.name}</CardTitle>
                  <CardDescription className="min-h-[40px]">{tier.description}</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">{tier.price}</span>
                    <span className="text-muted-foreground">/mo</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{tier.setup}</p>
                </CardHeader>
                <CardContent className="flex-1">
                  <ul className="space-y-3">
                    {tier.features.map((feature, j) => (
                      <li key={j} className="flex items-start gap-3">
                        <Check className="h-5 w-5 text-primary shrink-0" />
                        <span className="text-muted-foreground text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button
                    asChild
                    variant={tier.highlighted ? "default" : "outline"}
                    className={`w-full ${
                      tier.highlighted
                        ? "bg-accent text-accent-foreground hover:bg-accent/90"
                        : ""
                    }`}
                  >
                    <Link href={`/demo?plan=${tier.plan}`}>{tier.cta}</Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>

          <p className="container mx-auto max-w-4xl text-center text-sm text-muted-foreground mt-10">
            *AI phone receptionist is provisioned per club during onboarding. Premium add-ons and
            custom integrations (POS, tee sheet, accounting) are scoped with you during onboarding.
          </p>
        </section>

        {/* Contact-first: how a club goes live */}
        <section className="py-16 md:py-24 px-4 md:px-6 bg-muted/40 border-y border-border">
          <div className="container mx-auto max-w-5xl">
            <div className="text-center mb-12">
              <p className="eyebrow text-[hsl(38_55%_40%)] mb-4">How it works</p>
              <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">
                No self-serve checkout. A real launch.
              </h2>
              <p className="text-lg text-muted-foreground mt-4 max-w-2xl mx-auto">
                Choosing a plan starts a conversation, not a credit-card form. We onboard
                every club personally so day one actually works.
              </p>
            </div>
            <div className="grid gap-8 md:grid-cols-3">
              {steps.map((s, i) => (
                <div key={i} className="text-center px-4">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <s.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{s.title}</h3>
                  <p className="text-muted-foreground text-sm">{s.body}</p>
                </div>
              ))}
            </div>
            <div className="text-center mt-12">
              <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
                <Link href="/demo">Book your call</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
