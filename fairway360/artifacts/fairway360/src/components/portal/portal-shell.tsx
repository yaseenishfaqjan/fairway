import { useState, type ComponentType, type ReactNode } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Bell, LogOut, CheckCheck } from "lucide-react";
import { PortalLogo } from "@/components/portal/portal-logo";
import { PresenceControl } from "@/components/portal/presence-control";
import { cn } from "@/lib/utils";

export interface PortalNavItem {
  key: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
}

export interface PortalNotification {
  id: string;
  title: string;
  detail?: string;
  tone?: "default" | "gold" | "red";
  onClick?: () => void;
}

interface PortalShellProps {
  /** Small uppercase label under the logo, e.g. "Supervisor Console". */
  consoleLabel: string;
  nav: PortalNavItem[];
  active: string;
  onSelect: (key: string) => void;
  user: { name: string; role: string; initials: string };
  /** Live notifications shown in the bell dropdown. */
  notifications?: PortalNotification[];
  /** Show the staff presence selector (employees/supervisor only). */
  showPresence?: boolean;
  children: ReactNode;
}

const toneDot: Record<string, string> = {
  default: "bg-emerald-400",
  gold: "bg-accent",
  red: "bg-red-500",
};

function NotificationBell({
  items,
  align,
}: {
  items: PortalNotification[];
  align: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const count = items.length;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-full p-2 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
        aria-label="Notifications"
        aria-expanded={open}
        data-testid="button-notifications"
      >
        <Bell className="h-5 w-5" />
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-foreground">
            {count}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <button
              aria-hidden
              tabIndex={-1}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40 cursor-default"
            />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              transition={{ duration: 0.16, ease: "easeOut" }}
              className={cn(
                "absolute top-full z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-white/10 bg-[#071a10] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.85)]",
                align === "right" ? "right-0" : "left-0",
              )}
              data-testid="notifications-panel"
            >
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                <span className="text-sm font-semibold text-white">Notifications</span>
                {count > 0 && (
                  <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-medium text-accent">
                    {count} new
                  </span>
                )}
              </div>

              {count === 0 ? (
                <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
                  <CheckCheck className="h-7 w-7 text-emerald-400" />
                  <p className="text-sm text-white/60">You're all caught up.</p>
                </div>
              ) : (
                <div className="max-h-[60vh] overflow-y-auto py-1">
                  {items.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => {
                        n.onClick?.();
                        setOpen(false);
                      }}
                      data-testid={`notification-${n.id}`}
                      className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-white/5"
                    >
                      <span
                        className={cn(
                          "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                          toneDot[n.tone ?? "default"],
                        )}
                      />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-white">{n.title}</span>
                        {n.detail && (
                          <span className="block truncate text-xs text-white/55">{n.detail}</span>
                        )}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Shared portal chrome: a persistent animated left sidebar on desktop and a
 * slide-in left drawer on mobile (the app is mobile-first, so the drawer is the
 * primary nav on phones). The active item is marked with a spring-animated pill.
 */
export function PortalShell({
  consoleLabel,
  nav,
  active,
  onSelect,
  user,
  notifications = [],
  showPresence = false,
  children,
}: PortalShellProps) {
  const [open, setOpen] = useState(false);

  function pick(key: string) {
    onSelect(key);
    setOpen(false);
  }

  function Sidebar({ scope }: { scope: string }) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between px-5 pt-5">
          <Link href="/" className="flex items-center" data-testid="link-portal-home">
            <PortalLogo size="sm" />
          </Link>
          <NotificationBell items={notifications} align="left" />
        </div>
        <div className="px-5 pb-5 pt-1">
          <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-accent/90">
            {consoleLabel}
          </span>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3">
          {nav.map((n) => {
            const isActive = active === n.key;
            return (
              <button
                key={n.key}
                onClick={() => pick(n.key)}
                data-testid={`nav-${n.key}`}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors",
                  isActive
                    ? "text-white"
                    : "text-white/60 hover:bg-white/5 hover:text-white",
                )}
              >
                {isActive && (
                  <motion.span
                    layoutId={`portal-active-${scope}`}
                    className="absolute inset-0 -z-10 rounded-xl border border-accent/50 bg-accent/15 shadow-[0_0_24px_-10px_hsl(43_65%_55%/0.8)]"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
                <n.icon
                  className={cn(
                    "h-5 w-5 shrink-0 transition-colors",
                    isActive ? "text-accent" : "text-white/55",
                  )}
                />
                <span>{n.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="border-t border-white/10 pt-3">
          {showPresence && <PresenceControl />}
          <div className="flex items-center gap-3 rounded-xl px-2 py-2 pb-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-accent-foreground ring-2 ring-accent/30">
              {user.initials}
            </div>
            <div className="min-w-0 flex-1 leading-tight">
              <div className="truncate text-sm font-medium text-white">{user.name}</div>
              <div className="truncate text-xs text-white/55">{user.role}</div>
            </div>
            <Link
              href="/portal"
              aria-label="Sign out"
              data-testid="link-portal-logout"
              className="rounded-full p-2 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#04130c] text-white">
      {/* Ambient emerald + gold backdrop */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(125%_85%_at_50%_-10%,hsl(150_60%_16%/0.65),transparent_60%)]" />
        <div className="absolute -left-24 top-1/4 h-72 w-72 rounded-full bg-emerald-500/10 blur-[110px]" />
        <div className="absolute right-0 top-8 h-72 w-72 rounded-full bg-amber-400/10 blur-[120px]" />
      </div>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-white/10 bg-[#04130c]/80 backdrop-blur-xl lg:block">
        <Sidebar scope="desktop" />
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="scrim"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
            />
            <motion.aside
              key="drawer"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 360, damping: 36 }}
              className="fixed inset-y-0 left-0 z-50 w-72 max-w-[82vw] border-r border-white/10 bg-[#071a10] lg:hidden"
            >
              <button
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                data-testid="button-close-menu"
                className="absolute right-3 top-5 rounded-full p-2 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
              <Sidebar scope="mobile" />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-white/10 bg-[#04130c]/85 px-4 py-3 backdrop-blur-xl lg:hidden">
        <button
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          data-testid="button-open-menu"
          className="rounded-lg p-2 text-white/80 transition-colors hover:bg-white/10"
        >
          <Menu className="h-5 w-5" />
        </button>
        <PortalLogo size="sm" />
        <div className="flex items-center gap-1">
          <NotificationBell items={notifications} align="right" />
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-sm font-bold text-accent-foreground">
            {user.initials}
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="lg:pl-64">
        <main className="mx-auto max-w-6xl px-4 pb-16 pt-6">{children}</main>
      </div>
    </div>
  );
}
