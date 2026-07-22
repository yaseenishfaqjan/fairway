import { Link } from "wouter";
import { BrandLogo } from "@/components/brand-logo";

export function Footer() {
  return (
    <footer className="border-t border-border bg-background py-12 md:py-16">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid gap-8 md:grid-cols-5">
          <div className="md:col-span-2">
            <Link href="/" className="inline-flex items-center" data-testid="link-footer-home">
              <BrandLogo size="md" tone="light" />
            </Link>
            <p className="mt-4 max-w-xs text-sm text-muted-foreground">
              Powered by Scalaro. The AI Operating System for Golf Courses & Country Clubs.
            </p>
            <address className="mt-4 text-sm not-italic text-muted-foreground">
              Fairway360<br />
              Powered by Scalaro<br />
              <a href="mailto:info@fairway360.io" className="hover:text-primary" data-testid="link-footer-email">info@fairway360.io</a><br />
              <a href="tel:+14122851554" className="hover:text-primary" data-testid="link-footer-phone">+1 (412) 285-1554</a>
              <span className="block text-xs text-muted-foreground/70">Answered 24/7 by our AI assistant</span>
            </address>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Platform</h3>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/platform" className="hover:text-primary" data-testid="link-footer-platform">Platform</Link>
              </li>
              <li>
                <Link href="/solutions" className="hover:text-primary" data-testid="link-footer-solutions">Solutions</Link>
              </li>
              <li>
                <Link href="/dining" className="hover:text-primary" data-testid="link-footer-dining">Dining</Link>
              </li>
              <li>
                <Link href="/events" className="hover:text-primary" data-testid="link-footer-events">Events</Link>
              </li>
              <li>
                <Link href="/automations" className="hover:text-primary" data-testid="link-footer-automations">Automations</Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-primary" data-testid="link-footer-pricing">Pricing</Link>
              </li>
              <li>
                <Link href="/demo" className="hover:text-primary" data-testid="link-footer-demo">Request Demo</Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Portals</h3>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/portal/supervisor" className="hover:text-primary" data-testid="link-footer-supervisor">Supervisor Portal</Link>
              </li>
              <li>
                <Link href="/portal/employees" className="hover:text-primary" data-testid="link-footer-employees">Employees Portal</Link>
              </li>
              <li>
                <Link href="/portal/members" className="hover:text-primary" data-testid="link-footer-members">Members Portal</Link>
              </li>
              <li>
                <Link href="/portal" className="hover:text-primary" data-testid="link-footer-login">Portal Login</Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Legal</h3>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/privacy" className="hover:text-primary" data-testid="link-footer-privacy">Privacy Policy</Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-primary" data-testid="link-footer-terms">Terms of Service</Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-12 border-t border-border pt-8 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Fairway360. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
