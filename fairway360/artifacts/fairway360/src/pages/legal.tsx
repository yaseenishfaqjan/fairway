import type { ReactNode } from "react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Seo } from "@/components/seo";

function LegalShell({
  title,
  updated,
  seoTitle,
  seoDescription,
  path,
  children,
}: {
  title: string;
  updated: string;
  seoTitle: string;
  seoDescription: string;
  path: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Seo title={seoTitle} description={seoDescription} path={path} />
      <Navbar />
      <main className="flex-1">
        <div className="container mx-auto max-w-3xl px-4 py-16 md:px-6 md:py-24">
          <p className="eyebrow text-[hsl(38_55%_40%)] mb-4">Legal</p>
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-foreground mb-3">{title}</h1>
          <p className="text-sm text-muted-foreground mb-10">Last updated: {updated}</p>
          <div className="space-y-8 text-[15px] leading-relaxed text-muted-foreground [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-foreground [&_h2]:mb-2 [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5">
            {children}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export function PrivacyPolicy() {
  return (
    <LegalShell
      title="Privacy Policy"
      updated="June 2026"
      seoTitle="Privacy Policy | Fairway360"
      seoDescription="How Fairway360 collects, uses, and protects data for golf courses, country clubs, and their members."
      path="/privacy"
    >
      <section>
        <p>
          Fairway360 ("we", "us") provides software for golf courses and country clubs. This policy
          explains what information we collect, how we use it, and the choices you have. It is a
          template and should be reviewed by your legal counsel before launch.
        </p>
      </section>
      <section>
        <h2>Information we collect</h2>
        <ul>
          <li>Account information (name, email, phone, role) for club staff and members.</li>
          <li>Operational data you enter — tee times, orders, requests, tasks, and leads.</li>
          <li>Usage and device information collected automatically to keep the service secure and reliable.</li>
        </ul>
      </section>
      <section>
        <h2>How we use information</h2>
        <ul>
          <li>To operate the platform and provide the features your club uses.</li>
          <li>To send transactional messages (e.g. order and booking confirmations) you have opted into.</li>
          <li>To secure the service, prevent abuse, and meet legal obligations.</li>
        </ul>
      </section>
      <section>
        <h2>Data sharing</h2>
        <p>
          Each club's data is isolated to that club. We do not sell personal information. We share data
          only with service providers that help us run the platform (e.g. payments, email, SMS) under
          appropriate agreements, or where required by law.
        </p>
      </section>
      <section>
        <h2>Data retention &amp; security</h2>
        <p>
          We retain data for as long as your club maintains an account and as required by law. We use
          industry-standard safeguards to protect data in transit and at rest.
        </p>
      </section>
      <section>
        <h2>Your choices</h2>
        <p>
          You can request access, correction, or deletion of your personal data by contacting your club
          administrator or us at the address below.
        </p>
      </section>
      <section>
        <h2>Contact</h2>
        <p>Questions about this policy? Email privacy@fairway360.com.</p>
      </section>
    </LegalShell>
  );
}

export function TermsOfService() {
  return (
    <LegalShell
      title="Terms of Service"
      updated="June 2026"
      seoTitle="Terms of Service | Fairway360"
      seoDescription="The terms governing use of the Fairway360 platform by golf courses, country clubs, and their users."
      path="/terms"
    >
      <section>
        <p>
          These terms govern your use of Fairway360. By accessing the platform you agree to them. This
          is a template and should be reviewed by your legal counsel before launch.
        </p>
      </section>
      <section>
        <h2>Use of the service</h2>
        <ul>
          <li>You must be authorized by your club to access its portal.</li>
          <li>You are responsible for activity under your account and for keeping credentials secure.</li>
          <li>You agree not to misuse the service or attempt to access data belonging to other clubs.</li>
        </ul>
      </section>
      <section>
        <h2>Subscriptions &amp; billing</h2>
        <p>
          Paid plans are billed monthly per the pricing agreed during onboarding. Fees are described on
          our pricing page and in your order. Taxes may apply.
        </p>
      </section>
      <section>
        <h2>Acceptable use</h2>
        <p>
          You may not use the platform for unlawful purposes, to send unsolicited messages, or in a way
          that disrupts the service for others.
        </p>
      </section>
      <section>
        <h2>Availability &amp; changes</h2>
        <p>
          We work to keep the service available but do not guarantee uninterrupted access. We may update
          features and these terms; material changes will be communicated to club administrators.
        </p>
      </section>
      <section>
        <h2>Liability</h2>
        <p>
          The service is provided "as is." To the extent permitted by law, our liability is limited to
          the fees paid for the service in the prior twelve months.
        </p>
      </section>
      <section>
        <h2>Contact</h2>
        <p>Questions about these terms? Email legal@fairway360.com.</p>
      </section>
    </LegalShell>
  );
}
