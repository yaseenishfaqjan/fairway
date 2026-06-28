// Reusable JSON-LD structured data for Fairway360. Values must match visible
// page content (avoid "schema drift"). Fed into <Seo jsonLd={...} />.

import { SITE_URL } from "@/components/seo";

export const ORGANIZATION_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Fairway360",
  url: SITE_URL,
  logo: `${SITE_URL}/favicon.png`,
  description:
    "AI-powered club operation system for golf courses and country clubs. Automates tee times, memberships, events, dining, reviews, and staff workflows.",
  email: "hello@fairway360.io",
  foundingDate: "2026",
  areaServed: "United States",
  sameAs: ["https://linkedin.com/company/fairway360", "https://twitter.com/fairway360"],
  parentOrganization: { "@type": "Organization", name: "Scalaro", url: "https://scalaro.io" },
};

export const SOFTWARE_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Fairway360",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description:
    "AI-powered club operation system for golf courses and country clubs with 12 modules including tee times, CRM, voice AI, events, dining, and reviews.",
  url: SITE_URL,
  screenshot: `${SITE_URL}/opengraph.jpg`,
  featureList: [
    "Membership Sales Automation",
    "AI Tee Time Booking",
    "Event & Wedding Automation",
    "Intelligent CRM",
    "AI Marketing Campaigns",
    "24/7 Member Support",
    "Dining Reservation Automation",
    "Pro Shop Automation",
    "Real-time Analytics Dashboard",
    "Automated Review Generation",
    "SMS Text Automation",
    "24/7 AI Voice Agent",
  ],
  offers: [
    { "@type": "Offer", name: "Starter Automation", price: "497", priceCurrency: "USD", description: "For small public golf courses" },
    { "@type": "Offer", name: "Growth Automation", price: "997", priceCurrency: "USD", description: "For active golf courses and clubs" },
    { "@type": "Offer", name: "Elite Club Automation", price: "1997", priceCurrency: "USD", description: "For private country clubs" },
  ],
};

export const WEBSITE_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Fairway360",
  url: SITE_URL,
  description: "AI Club Operation System for golf courses and country clubs",
};

export const HOME_FAQ_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    ["What is Fairway360?", "Fairway360 is an AI-powered club operation system for golf courses and country clubs. It automates tee times, membership sales, events, dining reservations, reviews, missed calls, and staff workflows in one connected platform."],
    ["How does the AI Voice Agent work?", "Fairway360's AI Voice Agent answers every inbound call 24/7 in your club's voice. It can book tee times, answer member questions, capture membership inquiries, and schedule tours — even after hours when staff are unavailable."],
    ["What golf club operations can Fairway360 automate?", "Fairway360 automates 12 core club operations: membership sales, tee time booking, event and wedding management, CRM, marketing campaigns, member support, dining reservations, pro shop, analytics, review generation, SMS automation, and voice AI."],
    ["How much does Fairway360 cost?", "Fairway360 offers three plans: Starter at $497/month for small public golf courses, Growth at $997/month for active golf courses and clubs, and Elite at $1,997/month for private country clubs. All plans include a demo before purchase."],
    ["Does Fairway360 handle missed calls?", "Yes. Fairway360 automatically sends an SMS text back to anyone who calls and doesn't get an answer. The AI follows up, captures their inquiry, and routes them into the correct pipeline."],
    ["Can Fairway360 manage wedding and corporate event inquiries?", "Yes. Fairway360's Event Revenue Engine captures wedding and corporate outing inquiries, sends immediate AI follow-up, schedules tours, and tracks the entire sales process in a dedicated pipeline."],
    ["How quickly can Fairway360 be set up?", "Fairway360 can be configured and live for your club within days. Book a demo to see a personalized setup walkthrough for your specific club operations."],
  ].map(([q, a]) => ({
    "@type": "Question",
    name: q,
    acceptedAnswer: { "@type": "Answer", text: a },
  })),
};

/** Build a BreadcrumbList from a Home → … trail of [name, path] pairs. */
export function breadcrumb(trail: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((t, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: t.name,
      item: `${SITE_URL}${t.path === "/" ? "" : t.path}`,
    })),
  };
}

/** A Service offered by Fairway360. */
export function serviceSchema(name: string, description: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name,
    provider: { "@type": "Organization", name: "Fairway360", url: SITE_URL },
    description,
    areaServed: "United States",
  };
}
