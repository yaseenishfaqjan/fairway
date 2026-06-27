import type {
  Role,
  MembershipType,
  MembershipStatus,
  TeeTimeStatus,
  BookingStatus,
  PaymentMethod,
  PosCategory,
  InventoryCategory,
  TournamentFormat,
  TournamentStatus,
  MaintenancePriority,
  MaintenanceStatus,
} from './constants';

export interface AuthUser {
  id: string;
  clubId: string | null;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: Role;
  avatarUrl: string | null;
  phone: string | null;
  lastLoginAt: string | null;
}

export interface Club {
  id: string;
  name: string;
  subdomain: string;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  phone: string | null;
  email: string | null;
  logoUrl: string | null;
  timezone: string | null;
  currency: string | null;
  plan: string | null;
  settings: Record<string, unknown> | null;
  isActive: boolean | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface Member {
  id: string;
  clubId: string | null;
  memberNumber: string | null;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  handicapIndex: string | null;
  membershipType: MembershipType | null;
  membershipStatus: MembershipStatus | null;
  joinDate: string | null;
  expiryDate: string | null;
  balance: string | null;
  notes: string | null;
  avatarUrl: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  isActive: boolean | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface TeeTime {
  id: string;
  clubId: string | null;
  courseName: string | null;
  date: string;
  startTime: string;
  slotsTotal: number | null;
  slotsBooked: number | null;
  status: TeeTimeStatus | null;
  pricePerPlayer: string | null;
  cartFee: string | null;
  notes: string | null;
  createdAt: string | null;
}

export interface BookingPlayer {
  name: string;
  memberId?: string | null;
}

export interface Booking {
  id: string;
  clubId: string | null;
  teeTimeId: string | null;
  bookedByMemberId: string | null;
  bookedByUserId: string | null;
  playerCount: number;
  players: BookingPlayer[] | null;
  status: BookingStatus | null;
  totalAmount: string | null;
  paidAmount: string | null;
  paymentMethod: PaymentMethod | null;
  checkInAt: string | null;
  notes: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface BookingWithTeeTime extends Booking {
  teeTime?: TeeTime | null;
  memberName?: string | null;
}

export interface PosItem {
  name: string;
  qty: number;
  price: number;
  category?: PosCategory;
}

export interface PosTransaction {
  id: string;
  clubId: string | null;
  bookingId: string | null;
  memberId: string | null;
  cashierId: string | null;
  items: PosItem[] | null;
  subtotal: string | null;
  tax: string | null;
  discount: string | null;
  total: string | null;
  paymentMethod: PaymentMethod | null;
  paymentReference: string | null;
  category: PosCategory | null;
  status: string | null;
  voidedAt: string | null;
  voidReason: string | null;
  createdAt: string | null;
}

export interface InventoryItem {
  id: string;
  clubId: string | null;
  name: string;
  sku: string | null;
  category: InventoryCategory | null;
  description: string | null;
  price: string | null;
  cost: string | null;
  quantityOnHand: number | null;
  quantityMinimum: number | null;
  supplier: string | null;
  isActive: boolean | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface Tournament {
  id: string;
  clubId: string | null;
  name: string;
  date: string;
  format: TournamentFormat | null;
  status: TournamentStatus | null;
  maxPlayers: number | null;
  entryFee: string | null;
  prizePool: string | null;
  description: string | null;
  rules: string | null;
  createdAt: string | null;
  entryCount?: number;
}

export interface TournamentEntry {
  id: string;
  tournamentId: string | null;
  memberId: string | null;
  handicapAtEntry: string | null;
  score: number | null;
  scoreDetail: unknown;
  position: number | null;
  status: string | null;
  paymentStatus: string | null;
  createdAt: string | null;
}

export interface LeaderboardRow extends TournamentEntry {
  memberName: string;
  toPar: number | null;
}

export interface StaffUser extends AuthUser {
  isActive: boolean | null;
}

export interface StaffSchedule {
  id: string;
  clubId: string | null;
  userId: string | null;
  date: string;
  shiftStart: string | null;
  shiftEnd: string | null;
  roleThatDay: string | null;
  notes: string | null;
  createdAt: string | null;
  userName?: string | null;
}

export interface MaintenanceLog {
  id: string;
  clubId: string | null;
  area: string | null;
  issueType: string | null;
  priority: MaintenancePriority | null;
  description: string;
  status: MaintenanceStatus | null;
  assignedTo: string | null;
  reportedBy: string | null;
  resolvedAt: string | null;
  createdAt: string | null;
}

export interface AppNotification {
  id: string;
  clubId: string | null;
  userId: string | null;
  type: string | null;
  title: string | null;
  message: string | null;
  isRead: boolean | null;
  actionUrl: string | null;
  createdAt: string | null;
}

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  data: T[];
  pagination: Pagination;
}

// ---- Dashboard ----
export interface DashboardStats {
  occupancy: { booked: number; total: number; pct: number };
  revenueToday: number;
  revenueYesterday: number;
  revenueChangePct: number;
  bookingsToday: number;
  checkedInToday: number;
  openMaintenance: number;
}

export interface RevenueByCategory {
  category: PosCategory | null;
  total: number;
}

export interface RevenueByDay {
  day: string;
  total: number;
}

export interface RevenueResponse {
  byCategory: RevenueByCategory[];
  byDay: RevenueByDay[];
}

export interface OccupancyCell {
  date: string;
  hour: number;
  total: number;
  booked: number;
  pct: number;
}

export interface MemberBreakdown {
  byStatus: { status: MembershipStatus | null; count: number }[];
  byType: { type: MembershipType | null; count: number }[];
}

export interface Insight {
  type: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  actionUrl?: string;
}

export interface InsightsResponse {
  insights: Insight[];
  atRiskMemberIds: string[];
}

export interface TopMember {
  id: string;
  firstName: string;
  lastName: string;
  memberNumber: string | null;
  rounds: number;
}
