// Blog index — a hub for indexable, keyword-targeted content. Kept honest to
// what Fairway360 actually ships (AI concierge, on-course F&B, tee sheet,
// member CRM), not the aspirational phone-answering positioning.

import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Seo } from "@/components/seo";

type Post = {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  dateISO: string;
  tag: string;
  readMins: number;
};

export const POSTS: Post[] = [
  {
    slug: "24-7-tee-time-booking-for-members",
    title: "How to Give Golf Members 24/7 Tee Time Booking Without Adding Staff",
    excerpt:
      "Members want to book anytime; the pro shop phone is staffed for a slice of the day. Here's how member self-service and an AI concierge close that gap — against your real tee sheet, without extra staff.",
    date: "July 26, 2026",
    dateISO: "2026-07-26",
    tag: "Member Experience",
    readMins: 6,
  },
  {
    slug: "on-course-food-and-beverage-revenue",
    title: "How On-Course Food & Beverage Ordering Grows Golf Club Revenue",
    excerpt:
      "Most on-course F&B revenue is lost to friction: a golfer who won't leave the fairway to find a beverage cart. Here's how letting members order from their phone — and having it delivered to their hole — turns slow afternoons into sales.",
    date: "July 26, 2026",
    dateISO: "2026-07-26",
    tag: "Operations",
    readMins: 6,
  },
];

export function Blog() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "Fairway360 Blog",
    url: "https://fairway360.io/blog",
    description:
      "Guides for golf course and country club managers on AI operations, on-course F&B, tee sheet management, and member experience.",
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Seo
        title="Golf Club Operations & AI Blog | Fairway360"
        description="Practical guides for golf course and country club managers: on-course F&B revenue, AI member service, tee sheet management, and running a club at full capacity."
        path="/blog"
        jsonLd={jsonLd}
      />
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-16 md:px-6 md:py-24 max-w-4xl">
        <div className="mb-12 max-w-2xl">
          <p className="eyebrow text-[hsl(38_55%_40%)] mb-5">The Fairway360 Blog</p>
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-foreground mb-4">
            Running a better club, one round at a time
          </h1>
          <p className="text-xl text-muted-foreground">
            Operational guides for golf course and country club managers — on-course
            F&amp;B, AI member service, tee sheet strategy, and the day-to-day of running
            a club at full capacity.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {POSTS.map((p) => (
            <Link key={p.slug} href={`/blog/${p.slug}`}>
              <article
                className="group flex h-full cursor-pointer flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition hover:border-white/20 hover:bg-white/[0.05]"
                data-testid={`post-card-${p.slug}`}
              >
                <div className="mb-3 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="rounded-full bg-[hsl(38_55%_40%)]/15 px-2.5 py-0.5 font-medium text-[hsl(38_55%_55%)]">
                    {p.tag}
                  </span>
                  <span>{p.date}</span>
                  <span>· {p.readMins} min read</span>
                </div>
                <h2 className="mb-2 text-xl font-semibold text-foreground">{p.title}</h2>
                <p className="mb-4 flex-1 text-sm text-muted-foreground">{p.excerpt}</p>
                <span className="inline-flex items-center gap-1 text-sm font-medium text-[hsl(38_55%_55%)]">
                  Read the guide
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </span>
              </article>
            </Link>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
