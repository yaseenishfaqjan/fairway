import {
  LayoutDashboard,
  CalendarRange,
  ClipboardList,
  Users,
  ShoppingCart,
  Package,
  Trophy,
  UserCog,
  Wrench,
  BarChart3,
  Settings,
  type LucideIcon,
} from 'lucide-react';
import type { Role } from '@/lib/constants';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Minimum roles allowed to see this item; omit for everyone. */
  roles?: Role[];
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/tee-sheet', label: 'Tee Sheet', icon: CalendarRange },
  { to: '/bookings', label: 'Bookings', icon: ClipboardList },
  { to: '/members', label: 'Members', icon: Users },
  { to: '/pos', label: 'Point of Sale', icon: ShoppingCart },
  { to: '/inventory', label: 'Inventory', icon: Package },
  { to: '/tournaments', label: 'Tournaments', icon: Trophy },
  { to: '/staff', label: 'Staff', icon: UserCog, roles: ['superadmin', 'club_owner', 'manager'] },
  { to: '/maintenance', label: 'Maintenance', icon: Wrench },
  { to: '/reports', label: 'Reports', icon: BarChart3, roles: ['superadmin', 'club_owner', 'manager'] },
  { to: '/settings', label: 'Settings', icon: Settings, roles: ['superadmin', 'club_owner'] },
];
