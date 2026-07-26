// Blog article — honest to what Fairway360 ships: members order F&B from their
// phone, the AI concierge places the real order against the club's menu, staff
// fulfil it to the hole. No phone-answering claims.

import { Link } from "wouter";
import { ArrowRight, Check } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Seo } from "@/components/seo";
import { Button } from "@/components/ui/button";

const PATH = "/blog/on-course-food-and-beverage-revenue";
const URL = `https://fairway360.io${PATH}`;

const ARTICLE_JSONLD = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "How On-Course Food & Beverage Ordering Grows Golf Club Revenue",
  description:
    "Most on-course F&B revenue is lost to friction. Here's how letting members order from their phone — delivered to their hole — recovers it.",
  author: { "@type": "Organization", name: "Fairway360", url: "https://fairway360.io" },
  publisher: { "@type": "Organization", name: "Fairway360", url: "https://fairway360.io" },
  datePublished: "2026-07-26",
  dateModified: "2026-07-26",
  url: URL,
  mainEntityOfPage: { "@type": "WebPage", "@id": URL },
};

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-10 mb-3 text-2xl font-semibold tracking-tight text-foreground">{children}</h2>;
}
function P({ children }: { children: React.ReactNode }) {
  return <p className="mb-4 text-[17px] leading-relaxed text-muted-foreground">{children}</p>;
}

export function OnCourseFnbRevenue() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Seo
        title="How On-Course F&B Ordering Grows Golf Club Revenue | Fairway360"
        description="Most on-course food & beverage revenue is lost to friction. Here's how letting members order from their phone — delivered to their hole — recovers it, without adding cart staff."
        path={PATH}
        jsonLd={ARTICLE_JSONLD}
      />
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-16 md:px-6 md:py-24 max-w-2xl">
        <div className="mb-8">
          <Link href="/blog">
            <span className="text-sm text-[hsl(38_55%_55%)] hover:underline">← All guides</span>
          </Link>
        </div>

        <div className="mb-8 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="rounded-full bg-[hsl(38_55%_40%)]/15 px-2.5 py-0.5 font-medium text-[hsl(38_55%_55%)]">Operations</span>
          <span>July 26, 2026</span>
          <span>· 6 min read</span>
        </div>

        <h1 className="mb-6 text-4xl md:text-5xl font-semibold tracking-tight text-foreground">
          How On-Course Food &amp; Beverage Ordering Grows Golf Club Revenue
        </h1>

        <P>
          Ask most golf course managers where they're leaving money on the table, and
          food and beverage is near the top of the list. Not because members don't want
          to spend — but because the moment to spend keeps slipping away. A group on the
          seventh hole is thirsty on a hot afternoon, the beverage cart is somewhere on
          the back nine, and by the time anyone tracks it down the moment has passed. The
          sale never happens, and nobody records that it didn't.
        </P>

        <H2>The real problem is friction, not demand</H2>
        <P>
          On-course F&amp;B is a friction business. Every extra step between "I'd like
          something" and "here it is" costs you a percentage of sales. The traditional
          model — a single beverage cart circling 18 holes — was built around the
          cart's route, not the golfer's thirst. On a busy Saturday one cart simply can't
          be in the right place often enough, and staffing a second cart only pays off on
          your busiest days.
        </P>
        <P>
          The result is predictable: revenue concentrates around the turn and the
          clubhouse, and the four-plus hours a member spends actually on the course
          generate far less than they could. That gap isn't a demand problem. It's a
          logistics problem — and logistics problems are exactly what software solves.
        </P>

        <H2>Let members order from where they already are</H2>
        <P>
          The shift that changes the math is simple: let members order from their phone,
          from wherever they are on the course, and bring it to them. No flagging down a
          cart, no walking back to the clubhouse, no waiting for the turn. A member on the
          fifth hole opens their club's portal, taps in an order, and keeps playing.
        </P>
        <P>
          This is where an AI concierge earns its place. Instead of forcing members to
          learn an app or scroll a menu mid-swing, Fairway360 lets them simply say what
          they want — "two iced teas and a turkey club to the fifth hole" — and the AI
          reads it against the club's real menu, places a real order, and confirms it with
          an order number that comes from the order it just created. It cannot invent a
          menu item you don't sell or confirm an order that didn't go through, because the
          confirmation is generated from the record, not from a language model guessing.
        </P>

        <H2>What the staff side looks like</H2>
        <P>
          An order placed on the course lands instantly on a live kitchen and beverage
          queue — New, then Preparing, then Ready, then Delivered — visible to whoever is
          working F&amp;B that shift. There's no relayed phone message to mishear and no
          ticket to lose. Staff see the hole and cart number, prepare the order, and run
          it out. The member watches the status update on their own screen, so nobody is
          left wondering whether the order was received.
        </P>
        <P>
          Just as importantly, every order is captured. Even the ones that used to
          evaporate — the thirsty group on the seventh that never found the cart — now
          become a recorded sale with a timestamp, a total, and a location. Over a season
          that captured demand is the difference between a beverage program that breaks
          even and one that contributes real margin.
        </P>

        <H2>Why this beats adding another cart</H2>
        <div className="my-6 space-y-3">
          {[
            "It scales with demand, not headcount — busy afternoons don't need a second cart driver on payroll all week.",
            "It removes the search-and-flag-down step that quietly kills most impulse orders.",
            "It works in your own club's voice and menu — including custom categories like a halfway house or grill room.",
            "It records demand you were previously blind to, so you can staff and stock against real patterns.",
          ].map((t) => (
            <div key={t} className="flex items-start gap-3">
              <Check className="mt-1 h-4 w-4 shrink-0 text-[hsl(38_55%_55%)]" />
              <span className="text-[17px] leading-relaxed text-muted-foreground">{t}</span>
            </div>
          ))}
        </div>

        <H2>The compounding effect over a season</H2>
        <P>
          Any single recovered order is small — a couple of drinks, a sandwich. The point
          is the volume of moments you're currently missing. Multiply a modest lift in
          per-round F&amp;B spend across every round your course books in a season, and a
          program that felt like a rounding error becomes a line item worth managing. And
          because it runs on software rather than added staff, the incremental revenue
          largely drops to the bottom line.
        </P>
        <P>
          None of this replaces the hospitality that makes a club feel like a club — a
          good beverage cart attendant is still worth having. It removes the friction that
          was costing you sales the cart could never reach, and gives your team a clear
          queue instead of a scramble.
        </P>

        <div className="mt-12 rounded-2xl border border-[hsl(38_55%_40%)]/30 bg-[hsl(38_55%_40%)]/[0.06] p-6 text-center">
          <h2 className="mb-2 text-2xl font-semibold text-foreground">See it on your own menu</h2>
          <p className="mx-auto mb-5 max-w-lg text-muted-foreground">
            Fairway360 is the AI operating system for golf courses and country clubs —
            on-course ordering, tee sheet, member CRM, and staff workflows in one place.
            Book a free demo and we'll set it up around your course.
          </p>
          <Link href="/demo">
            <Button size="lg" data-testid="link-article-demo">
              Book a free demo
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
