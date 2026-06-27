export const ROLES = ['superadmin', 'club_owner', 'manager', 'staff', 'ranger'] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_RANK: Record<Role, number> = {
  ranger: 1,
  staff: 2,
  manager: 3,
  club_owner: 4,
  superadmin: 5,
};

export const ROLE_LABELS: Record<Role, string> = {
  superadmin: 'Super Admin',
  club_owner: 'Club Owner',
  manager: 'Manager',
  staff: 'Staff',
  ranger: 'Ranger',
};

export const MEMBERSHIP_TYPES = [
  'individual',
  'family',
  'junior',
  'corporate',
  'social',
] as const;
export type MembershipType = (typeof MEMBERSHIP_TYPES)[number];

export const MEMBERSHIP_STATUSES = ['active', 'suspended', 'cancelled', 'pending'] as const;
export type MembershipStatus = (typeof MEMBERSHIP_STATUSES)[number];

export const TEE_TIME_STATUSES = ['available', 'booked', 'blocked', 'maintenance'] as const;
export type TeeTimeStatus = (typeof TEE_TIME_STATUSES)[number];

export const BOOKING_STATUSES = ['confirmed', 'cancelled', 'no_show', 'completed'] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const PAYMENT_METHODS = ['cash', 'card', 'member_account', 'comp'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const POS_CATEGORIES = [
  'greens_fee',
  'cart',
  'pro_shop',
  'food_beverage',
  'lesson',
  'tournament',
] as const;
export type PosCategory = (typeof POS_CATEGORIES)[number];

export const INVENTORY_CATEGORIES = [
  'equipment',
  'apparel',
  'food',
  'beverage',
  'accessories',
] as const;
export type InventoryCategory = (typeof INVENTORY_CATEGORIES)[number];

export const TOURNAMENT_FORMATS = [
  'stroke_play',
  'match_play',
  'stableford',
  'scramble',
  'skins',
] as const;
export type TournamentFormat = (typeof TOURNAMENT_FORMATS)[number];

export const TOURNAMENT_STATUSES = [
  'upcoming',
  'registration_open',
  'in_progress',
  'completed',
  'cancelled',
] as const;
export type TournamentStatus = (typeof TOURNAMENT_STATUSES)[number];

export const MAINTENANCE_PRIORITIES = ['low', 'medium', 'high', 'critical'] as const;
export type MaintenancePriority = (typeof MAINTENANCE_PRIORITIES)[number];

export const MAINTENANCE_STATUSES = ['open', 'in_progress', 'resolved', 'deferred'] as const;
export type MaintenanceStatus = (typeof MAINTENANCE_STATUSES)[number];

export const MAINTENANCE_AREAS = [
  'hole_1', 'hole_2', 'hole_3', 'hole_4', 'hole_5', 'hole_6',
  'hole_7', 'hole_8', 'hole_9', 'hole_10', 'hole_11', 'hole_12',
  'hole_13', 'hole_14', 'hole_15', 'hole_16', 'hole_17', 'hole_18',
  'clubhouse', 'driving_range', 'parking', 'cart_shed', 'restaurant',
] as const;
export type MaintenanceArea = (typeof MAINTENANCE_AREAS)[number];

/** Turn an enum value like `member_account` into `Member Account`. */
export function humanize(value: string | null | undefined): string {
  if (!value) return '—';
  return value
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
