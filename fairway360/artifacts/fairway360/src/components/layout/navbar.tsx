import { Link, useLocation } from "wouter";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { BrandLogo } from "@/components/brand-logo";

export function Navbar() {
  const [location] = useLocation();

  const links = [
    { href: "/platform", label: "Platform" },
    { href: "/solutions", label: "Solutions" },
    { href: "/dining", label: "Dining" },
    { href: "/events", label: "Events" },
    { href: "/automations", label: "Automations" },
    { href: "/pricing", label: "Pricing" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="container mx-auto flex h-20 items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center" data-testid="link-home">
          <BrandLogo size="md" tone="light" />
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`relative text-sm font-medium tracking-wide transition-colors hover:text-primary after:absolute after:-bottom-1.5 after:left-0 after:h-px after:bg-accent after:transition-all after:duration-300 ${
                location === link.href
                  ? "text-primary after:w-full"
                  : "text-foreground/70 after:w-0 hover:after:w-full"
              }`}
              data-testid={`link-${link.label.toLowerCase()}`}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/portal"
            className="text-sm font-medium tracking-wide text-foreground/70 transition-colors hover:text-primary"
            data-testid="link-nav-login"
          >
            Log In
          </Link>
          <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-sm tracking-wide" size="sm">
            <Link href="/demo" data-testid="link-nav-demo">Book a Demo</Link>
          </Button>
        </nav>

        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden" data-testid="button-mobile-menu">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right">
            <nav className="flex flex-col gap-4 mt-8">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-lg font-medium text-foreground hover:text-primary"
                  data-testid={`link-mobile-${link.label.toLowerCase()}`}
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href="/portal"
                className="text-lg font-medium text-foreground hover:text-primary"
                data-testid="link-mobile-login"
              >
                Log In
              </Link>
              <Button asChild className="mt-4 w-full bg-accent text-accent-foreground hover:bg-accent/90">
                <Link href="/demo" data-testid="link-mobile-demo">Book a Demo</Link>
              </Button>
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
