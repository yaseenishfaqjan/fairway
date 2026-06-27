import { Navbar } from "@/components/layout/navbar";
import { Seo } from "@/components/seo";
import { Footer } from "@/components/layout/footer";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export function Pricing() {
  const tiers = [
    {
      name: "Starter Automation",
      description: "For small public golf courses",
      price: "$497",
      features: [
        "AI Missed Call Text Back",
        "AI Website Chatbot",
        "Tee Time Lead Capture",
        "Basic CRM Pipeline",
        "SMS/Email Follow-Up",
        "Review Generation",
        "Monthly Reporting",
      ],
      cta: "Start with Starter",
      highlighted: false,
    },
    {
      name: "Growth Automation",
      description: "For active golf courses and semi-private clubs",
      price: "$997",
      features: [
        "Everything in Starter, plus:",
        "AI Phone Receptionist",
        "Membership Automation",
        "Event & Wedding Automation",
        "Pro Shop Automation",
        "Staff Task Automation",
        "Advanced Reporting Dashboard",
        "Priority Support",
      ],
      cta: "Get Growth Plan",
      highlighted: true,
    },
    {
      name: "Elite Club Automation",
      description: "For private country clubs and multi-department operations",
      price: "$1,997",
      features: [
        "Everything in Growth, plus:",
        "Full Multi-Department Automation",
        "Dining & Restaurant Automation",
        "Maintenance Request Routing",
        "Custom AI Scripts",
        "Dedicated Success Manager",
        "White-Glove Onboarding",
        "Custom Reporting",
      ],
      cta: "Go Elite",
      highlighted: false,
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Seo
        title="Pricing — Simple Plans for Every Club | Fairway360"
        description="Transparent monthly plans for golf courses and country clubs: Starter, Growth, and Elite Club automation. No hidden fees — book a demo to get started."
        path="/pricing"
      />
      <Navbar />
      <main className="flex-1">
        <section className="py-20 md:py-32 px-4 md:px-6">
          <div className="container mx-auto text-center max-w-3xl mb-16">
            <p className="eyebrow text-[hsl(38_55%_40%)] mb-5">Membership Plans</p>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight text-foreground mb-6 leading-[1.05]">
              Simple, Transparent Pricing
            </h1>
            <p className="text-xl text-muted-foreground">
              Choose the plan that fits your operation. No hidden fees.
            </p>
          </div>

          <div className="container mx-auto grid gap-8 md:grid-cols-3 max-w-6xl items-start">
            {tiers.map((tier, i) => (
              <Card
                key={i}
                className={`relative flex flex-col ${
                  tier.highlighted
                    ? "border-accent shadow-lg md:-mt-8 md:mb-8"
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
                </CardHeader>
                <CardContent className="flex-1">
                  <ul className="space-y-4">
                    {tier.features.map((feature, j) => (
                      <li key={j} className="flex items-start gap-3">
                        <Check className="h-5 w-5 text-primary shrink-0" />
                        <span className="text-muted-foreground">{feature}</span>
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
                    <Link href="/demo">{tier.cta}</Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
