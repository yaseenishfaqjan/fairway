import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Flag, PanelLeftClose, PanelLeft, X } from 'lucide-react';
import { NAV_ITEMS } from './nav';
import { useAuthStore } from '@/stores/auth';
import { useUiStore } from '@/stores/ui';
import { cn } from '@/lib/utils';

function NavList({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const role = useAuthStore((s) => s.user?.role);
  const items = NAV_ITEMS.filter((i) => !i.roles || (role && i.roles.includes(role)));

  return (
    <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-fairway-500/15 text-fairway-300'
                  : 'text-night-300 hover:bg-night-800 hover:text-white',
                collapsed && 'justify-center px-0',
              )
            }
            title={collapsed ? item.label : undefined}
          >
            <Icon className="h-5 w-5 shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        );
      })}
    </nav>
  );
}

function Brand({ collapsed }: { collapsed: boolean }) {
  return (
    <div className={cn('flex items-center gap-2.5 px-5 py-5', collapsed && 'justify-center px-0')}>
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-fairway-500">
        <Flag className="h-5 w-5 text-white" />
      </div>
      {!collapsed && <span className="font-display text-lg font-extrabold text-white">Fairway360</span>}
    </div>
  );
}

export function Sidebar() {
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggle = useUiStore((s) => s.toggleSidebar);

  return (
    <aside
      className={cn(
        'hidden shrink-0 flex-col border-r border-night-800 bg-night-900 transition-all duration-200 lg:flex',
        collapsed ? 'w-[72px]' : 'w-[260px]',
      )}
    >
      <Brand collapsed={collapsed} />
      <NavList collapsed={collapsed} />
      <button
        onClick={toggle}
        className="flex items-center gap-3 border-t border-night-800 px-5 py-4 text-sm text-night-400 hover:text-white"
      >
        {collapsed ? <PanelLeft className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
        {!collapsed && <span>Collapse</span>}
      </button>
    </aside>
  );
}

export function MobileSidebar() {
  const open = useUiStore((s) => s.mobileNavOpen);
  const setOpen = useUiStore((s) => s.setMobileNav);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <motion.div
            className="absolute inset-0 bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          />
          <motion.aside
            className="absolute left-0 top-0 flex h-full w-[260px] flex-col bg-night-900"
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: 'tween', duration: 0.2 }}
          >
            <div className="flex items-center justify-between pr-3">
              <Brand collapsed={false} />
              <button onClick={() => setOpen(false)} className="btn-ghost p-2" aria-label="Close menu">
                <X className="h-5 w-5" />
              </button>
            </div>
            <NavList collapsed={false} onNavigate={() => setOpen(false)} />
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
