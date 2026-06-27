import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  date,
  time,
  integer,
  decimal,
  jsonb,
} from 'drizzle-orm/pg-core';

// ---------------------------------------------------------------------------
// Clubs
// ---------------------------------------------------------------------------
export const clubs = pgTable('clubs', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 200 }).notNull(),
  subdomain: varchar('subdomain', { length: 100 }).unique().notNull(),
  address: text('address'),
  city: varchar('city', { length: 100 }),
  state: varchar('state', { length: 100 }),
  country: varchar('country', { length: 100 }).default('US'),
  phone: varchar('phone', { length: 30 }),
  email: varchar('email', { length: 200 }),
  logoUrl: text('logo_url'),
  timezone: varchar('timezone', { length: 60 }).default('America/New_York'),
  currency: varchar('currency', { length: 10 }).default('USD'),
  plan: varchar('plan', { length: 30 }).default('starter'),
  settings: jsonb('settings'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ---------------------------------------------------------------------------
// Users (staff accounts)
// ---------------------------------------------------------------------------
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  clubId: uuid('club_id').references(() => clubs.id, { onDelete: 'cascade' }),
  email: varchar('email', { length: 200 }).unique().notNull(),
  passwordHash: text('password_hash').notNull(),
  firstName: varchar('first_name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }),
  role: varchar('role', { length: 30 }).notNull(),
  avatarUrl: text('avatar_url'),
  phone: varchar('phone', { length: 30 }),
  isActive: boolean('is_active').default(true),
  lastLoginAt: timestamp('last_login_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

// ---------------------------------------------------------------------------
// Members
// ---------------------------------------------------------------------------
export const members = pgTable('members', {
  id: uuid('id').defaultRandom().primaryKey(),
  clubId: uuid('club_id').references(() => clubs.id, { onDelete: 'cascade' }),
  memberNumber: varchar('member_number', { length: 50 }).unique(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  email: varchar('email', { length: 200 }),
  phone: varchar('phone', { length: 30 }),
  handicapIndex: decimal('handicap_index', { precision: 4, scale: 1 }),
  membershipType: varchar('membership_type', { length: 60 }),
  membershipStatus: varchar('membership_status', { length: 30 }).default('active'),
  joinDate: date('join_date'),
  expiryDate: date('expiry_date'),
  balance: decimal('balance', { precision: 10, scale: 2 }).default('0.00'),
  notes: text('notes'),
  avatarUrl: text('avatar_url'),
  emergencyContactName: varchar('emergency_contact_name', { length: 200 }),
  emergencyContactPhone: varchar('emergency_contact_phone', { length: 30 }),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ---------------------------------------------------------------------------
// Tee times
// ---------------------------------------------------------------------------
export const teeTimes = pgTable('tee_times', {
  id: uuid('id').defaultRandom().primaryKey(),
  clubId: uuid('club_id').references(() => clubs.id, { onDelete: 'cascade' }),
  courseName: varchar('course_name', { length: 200 }).default('Main Course'),
  date: date('date').notNull(),
  startTime: time('start_time').notNull(),
  slotsTotal: integer('slots_total').default(4),
  slotsBooked: integer('slots_booked').default(0),
  status: varchar('status', { length: 30 }).default('available'),
  pricePerPlayer: decimal('price_per_player', { precision: 8, scale: 2 }),
  cartFee: decimal('cart_fee', { precision: 8, scale: 2 }),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
});

// ---------------------------------------------------------------------------
// Bookings
// ---------------------------------------------------------------------------
export const bookings = pgTable('bookings', {
  id: uuid('id').defaultRandom().primaryKey(),
  clubId: uuid('club_id').references(() => clubs.id, { onDelete: 'cascade' }),
  teeTimeId: uuid('tee_time_id').references(() => teeTimes.id, { onDelete: 'set null' }),
  bookedByMemberId: uuid('booked_by_member_id').references(() => members.id, {
    onDelete: 'set null',
  }),
  bookedByUserId: uuid('booked_by_user_id').references(() => users.id, { onDelete: 'set null' }),
  playerCount: integer('player_count').notNull().default(1),
  players: jsonb('players'),
  status: varchar('status', { length: 30 }).default('confirmed'),
  totalAmount: decimal('total_amount', { precision: 10, scale: 2 }),
  paidAmount: decimal('paid_amount', { precision: 10, scale: 2 }).default('0'),
  paymentMethod: varchar('payment_method', { length: 30 }),
  checkInAt: timestamp('check_in_at'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ---------------------------------------------------------------------------
// POS transactions
// ---------------------------------------------------------------------------
export const posTransactions = pgTable('pos_transactions', {
  id: uuid('id').defaultRandom().primaryKey(),
  clubId: uuid('club_id').references(() => clubs.id, { onDelete: 'cascade' }),
  bookingId: uuid('booking_id').references(() => bookings.id, { onDelete: 'set null' }),
  memberId: uuid('member_id').references(() => members.id, { onDelete: 'set null' }),
  cashierId: uuid('cashier_id').references(() => users.id, { onDelete: 'set null' }),
  items: jsonb('items'),
  subtotal: decimal('subtotal', { precision: 10, scale: 2 }),
  tax: decimal('tax', { precision: 10, scale: 2 }),
  discount: decimal('discount', { precision: 10, scale: 2 }).default('0'),
  total: decimal('total', { precision: 10, scale: 2 }),
  paymentMethod: varchar('payment_method', { length: 30 }),
  paymentReference: varchar('payment_reference', { length: 200 }),
  category: varchar('category', { length: 60 }),
  status: varchar('status', { length: 30 }).default('completed'),
  voidedAt: timestamp('voided_at'),
  voidReason: text('void_reason'),
  createdAt: timestamp('created_at').defaultNow(),
});

// ---------------------------------------------------------------------------
// Inventory items
// ---------------------------------------------------------------------------
export const inventoryItems = pgTable('inventory_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  clubId: uuid('club_id').references(() => clubs.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 200 }).notNull(),
  sku: varchar('sku', { length: 100 }),
  category: varchar('category', { length: 60 }),
  description: text('description'),
  price: decimal('price', { precision: 8, scale: 2 }),
  cost: decimal('cost', { precision: 8, scale: 2 }),
  quantityOnHand: integer('quantity_on_hand').default(0),
  quantityMinimum: integer('quantity_minimum').default(0),
  supplier: varchar('supplier', { length: 200 }),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ---------------------------------------------------------------------------
// Tournaments
// ---------------------------------------------------------------------------
export const tournaments = pgTable('tournaments', {
  id: uuid('id').defaultRandom().primaryKey(),
  clubId: uuid('club_id').references(() => clubs.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 200 }).notNull(),
  date: date('date').notNull(),
  format: varchar('format', { length: 60 }),
  status: varchar('status', { length: 30 }).default('upcoming'),
  maxPlayers: integer('max_players'),
  entryFee: decimal('entry_fee', { precision: 8, scale: 2 }),
  prizePool: decimal('prize_pool', { precision: 10, scale: 2 }),
  description: text('description'),
  rules: text('rules'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const tournamentEntries = pgTable('tournament_entries', {
  id: uuid('id').defaultRandom().primaryKey(),
  tournamentId: uuid('tournament_id').references(() => tournaments.id, { onDelete: 'cascade' }),
  memberId: uuid('member_id').references(() => members.id, { onDelete: 'cascade' }),
  handicapAtEntry: decimal('handicap_at_entry', { precision: 4, scale: 1 }),
  score: integer('score'),
  scoreDetail: jsonb('score_detail'),
  position: integer('position'),
  status: varchar('status', { length: 30 }).default('registered'),
  paymentStatus: varchar('payment_status', { length: 30 }).default('pending'),
  createdAt: timestamp('created_at').defaultNow(),
});

// ---------------------------------------------------------------------------
// Staff schedules
// ---------------------------------------------------------------------------
export const staffSchedules = pgTable('staff_schedules', {
  id: uuid('id').defaultRandom().primaryKey(),
  clubId: uuid('club_id').references(() => clubs.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  date: date('date').notNull(),
  shiftStart: time('shift_start'),
  shiftEnd: time('shift_end'),
  roleThatDay: varchar('role_that_day', { length: 60 }),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
});

// ---------------------------------------------------------------------------
// Maintenance logs
// ---------------------------------------------------------------------------
export const maintenanceLogs = pgTable('maintenance_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  clubId: uuid('club_id').references(() => clubs.id, { onDelete: 'cascade' }),
  area: varchar('area', { length: 100 }),
  issueType: varchar('issue_type', { length: 60 }),
  priority: varchar('priority', { length: 20 }),
  description: text('description').notNull(),
  status: varchar('status', { length: 30 }).default('open'),
  assignedTo: uuid('assigned_to').references(() => users.id, { onDelete: 'set null' }),
  reportedBy: uuid('reported_by').references(() => users.id, { onDelete: 'set null' }),
  resolvedAt: timestamp('resolved_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------
export const notifications = pgTable('notifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  clubId: uuid('club_id').references(() => clubs.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 60 }),
  title: varchar('title', { length: 200 }),
  message: text('message'),
  isRead: boolean('is_read').default(false),
  actionUrl: text('action_url'),
  createdAt: timestamp('created_at').defaultNow(),
});

// ---------------------------------------------------------------------------
// Refresh tokens
// ---------------------------------------------------------------------------
export const refreshTokens = pgTable('refresh_tokens', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// ---------------------------------------------------------------------------
// Inferred types
// ---------------------------------------------------------------------------
export type Club = typeof clubs.$inferSelect;
export type NewClub = typeof clubs.$inferInsert;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Member = typeof members.$inferSelect;
export type NewMember = typeof members.$inferInsert;
export type TeeTime = typeof teeTimes.$inferSelect;
export type NewTeeTime = typeof teeTimes.$inferInsert;
export type Booking = typeof bookings.$inferSelect;
export type NewBooking = typeof bookings.$inferInsert;
export type PosTransaction = typeof posTransactions.$inferSelect;
export type NewPosTransaction = typeof posTransactions.$inferInsert;
export type InventoryItem = typeof inventoryItems.$inferSelect;
export type NewInventoryItem = typeof inventoryItems.$inferInsert;
export type Tournament = typeof tournaments.$inferSelect;
export type NewTournament = typeof tournaments.$inferInsert;
export type TournamentEntry = typeof tournamentEntries.$inferSelect;
export type NewTournamentEntry = typeof tournamentEntries.$inferInsert;
export type StaffSchedule = typeof staffSchedules.$inferSelect;
export type NewStaffSchedule = typeof staffSchedules.$inferInsert;
export type MaintenanceLog = typeof maintenanceLogs.$inferSelect;
export type NewMaintenanceLog = typeof maintenanceLogs.$inferInsert;
export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
