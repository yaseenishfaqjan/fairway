import bcrypt from 'bcryptjs';
import { db, closeDb } from './index.js';
import {
  clubs,
  users,
  members,
  teeTimes,
  bookings,
  posTransactions,
  inventoryItems,
  tournaments,
  tournamentEntries,
  maintenanceLogs,
  notifications,
} from './schema.js';

// ---------------------------------------------------------------------------
// Deterministic helpers
// ---------------------------------------------------------------------------
function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length];
}
function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function money(n: number): string {
  return n.toFixed(2);
}
function dateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

const FIRST_NAMES = [
  'James', 'Mary', 'Robert', 'Patricia', 'John', 'Jennifer', 'Michael', 'Linda',
  'William', 'Elizabeth', 'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica',
  'Thomas', 'Karen', 'Charles', 'Sarah', 'Daniel', 'Nancy', 'Matthew', 'Lisa',
  'Anthony', 'Margaret', 'Mark', 'Sandra', 'Donald', 'Ashley',
];
const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
  'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson',
  'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson',
];
const MEMBERSHIP_TYPES = ['individual', 'family', 'junior', 'corporate', 'social'];

async function seed() {
  console.log('[seed] starting…');

  // Idempotency guard: skip if the database has already been seeded. This makes
  // the seed safe to run on every container start.
  const existing = await db.select({ id: clubs.id }).from(clubs).limit(1);
  if (existing.length > 0) {
    console.log('[seed] database already has data — skipping');
    await closeDb();
    return;
  }

  // -------------------------------------------------------------------------
  // Club
  // -------------------------------------------------------------------------
  const [club] = await db
    .insert(clubs)
    .values({
      name: 'Pine Valley Golf & Country Club',
      subdomain: 'pinevalley',
      address: '1 Pine Valley Drive',
      city: 'Pine Valley',
      state: 'NJ',
      country: 'US',
      phone: '(856) 783-3000',
      email: 'info@pinevalley.com',
      timezone: 'America/New_York',
      currency: 'USD',
      plan: 'pro',
    })
    .returning();
  console.log(`[seed] club ${club.name}`);

  // -------------------------------------------------------------------------
  // Users
  // -------------------------------------------------------------------------
  const hash = (pw: string) => bcrypt.hashSync(pw, 10);
  const userRows = await db
    .insert(users)
    .values([
      { clubId: club.id, email: 'admin@pinevalley.com', passwordHash: hash('Password123!'), firstName: 'Arnold', lastName: 'Palmer', role: 'club_owner', phone: '(856) 783-3001' },
      { clubId: club.id, email: 'manager@pinevalley.com', passwordHash: hash('Password123!'), firstName: 'Nancy', lastName: 'Lopez', role: 'manager', phone: '(856) 783-3002' },
      { clubId: club.id, email: 'staff@pinevalley.com', passwordHash: hash('Password123!'), firstName: 'Tiger', lastName: 'Woods', role: 'staff', phone: '(856) 783-3003' },
      { clubId: club.id, email: 'ranger@pinevalley.com', passwordHash: hash('Password123!'), firstName: 'Lee', lastName: 'Trevino', role: 'ranger', phone: '(856) 783-3004' },
      { clubId: club.id, email: 'demo@fairway360.com', passwordHash: hash('Demo123!'), firstName: 'Fairway', lastName: 'Admin', role: 'superadmin' },
    ])
    .returning();
  console.log(`[seed] ${userRows.length} users`);
  const cashier = userRows[2];
  const owner = userRows[0];

  // -------------------------------------------------------------------------
  // Members (30)
  // -------------------------------------------------------------------------
  const memberValues = Array.from({ length: 30 }).map((_, i) => {
    const first = pick(FIRST_NAMES, i * 7 + 3);
    const last = pick(LAST_NAMES, i * 5 + 1);
    const join = addDays(new Date(), -rand(30, 2000));
    const status = i % 11 === 0 ? 'suspended' : i % 17 === 0 ? 'pending' : 'active';
    return {
      clubId: club.id,
      memberNumber: `PV-${String(1000 + i)}`,
      firstName: first,
      lastName: last,
      email: `${first.toLowerCase()}.${last.toLowerCase()}${i}@example.com`,
      phone: `(856) 555-${String(1000 + i).padStart(4, '0')}`,
      handicapIndex: money(2.4 + ((i * 9.13) % 26.2)),
      membershipType: pick(MEMBERSHIP_TYPES, i),
      membershipStatus: status,
      joinDate: dateStr(join),
      expiryDate: dateStr(addDays(join, 365)),
      balance: money(rand(-200, 1500)),
      emergencyContactName: `${pick(FIRST_NAMES, i + 2)} ${last}`,
      emergencyContactPhone: `(856) 555-${String(9000 + i).padStart(4, '0')}`,
    };
  });
  const memberRows = await db.insert(members).values(memberValues).returning();
  console.log(`[seed] ${memberRows.length} members`);

  // -------------------------------------------------------------------------
  // Tee times: 90 days (-30 .. +60), 7am–6pm every 10 min, 4 slots each
  // -------------------------------------------------------------------------
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const teeTimeValues: (typeof teeTimes.$inferInsert)[] = [];
  for (let dayOffset = -30; dayOffset < 60; dayOffset++) {
    const d = addDays(today, dayOffset);
    const dow = d.getDay(); // 0 Sun .. 6 Sat
    const weekend = dow === 0 || dow === 6;
    for (let mins = 7 * 60; mins <= 18 * 60; mins += 10) {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      const morning = h < 12;
      const base = weekend ? 75 : 50;
      const price = base + (morning ? 15 : 0);
      teeTimeValues.push({
        clubId: club.id,
        courseName: 'Main Course',
        date: dateStr(d),
        startTime: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`,
        slotsTotal: 4,
        slotsBooked: 0,
        status: 'available',
        pricePerPlayer: money(price),
        cartFee: money(20),
      });
    }
  }
  // Insert in chunks (PGlite/pg parameter limits)
  const teeChunks: typeof teeTimeValues[] = [];
  for (let i = 0; i < teeTimeValues.length; i += 500) {
    teeChunks.push(teeTimeValues.slice(i, i + 500));
  }
  let teeCount = 0;
  for (const chunk of teeChunks) {
    const inserted = await db.insert(teeTimes).values(chunk).returning({ id: teeTimes.id });
    teeCount += inserted.length;
  }
  console.log(`[seed] ${teeCount} tee times`);

  // -------------------------------------------------------------------------
  // Bookings: 60 over the past 30 days, tied to real tee times
  // -------------------------------------------------------------------------
  const { eq, and, gte, lte } = await import('drizzle-orm');
  const pastTeeTimes = await db
    .select()
    .from(teeTimes)
    .where(
      and(
        eq(teeTimes.clubId, club.id),
        gte(teeTimes.date, dateStr(addDays(today, -30))),
        lte(teeTimes.date, dateStr(today)),
      ),
    );

  let bookingCount = 0;
  const createdBookings: { id: string; memberId: string; total: number; date: string }[] = [];
  for (let i = 0; i < 60 && i < pastTeeTimes.length; i++) {
    const tt = pastTeeTimes[i * 13 % pastTeeTimes.length];
    const member = pick(memberRows, i * 3);
    const playerCount = rand(1, 4);
    const price = Number(tt.pricePerPlayer ?? 50);
    const total = price * playerCount + Number(tt.cartFee ?? 20);
    const status = i % 9 === 0 ? 'no_show' : i % 7 === 0 ? 'cancelled' : 'completed';
    const players = Array.from({ length: playerCount }).map((__, p) => {
      const m = pick(memberRows, i + p);
      return { member_id: m.id, name: `${m.firstName} ${m.lastName}`, handicap: Number(m.handicapIndex), is_guest: p > 0 && p % 2 === 0 };
    });
    const [b] = await db
      .insert(bookings)
      .values({
        clubId: club.id,
        teeTimeId: tt.id,
        bookedByMemberId: member.id,
        bookedByUserId: cashier.id,
        playerCount,
        players,
        status,
        totalAmount: money(total),
        paidAmount: status === 'cancelled' ? '0' : money(total),
        paymentMethod: pick(['cash', 'card', 'member_account'], i),
        checkInAt: status === 'completed' ? new Date(`${tt.date}T${tt.startTime}`) : null,
      })
      .returning();
    if (status !== 'cancelled') {
      await db
        .update(teeTimes)
        .set({ slotsBooked: playerCount, status: 'booked' })
        .where(eq(teeTimes.id, tt.id));
    }
    createdBookings.push({ id: b.id, memberId: member.id, total, date: tt.date });
    bookingCount++;
  }
  console.log(`[seed] ${bookingCount} bookings`);

  // -------------------------------------------------------------------------
  // POS transactions: 150 across all categories, past 30 days
  // -------------------------------------------------------------------------
  const PRODUCTS: Record<string, { name: string; price: number }[]> = {
    greens_fee: [{ name: '18 Holes Greens Fee', price: 65 }, { name: '9 Holes Greens Fee', price: 40 }],
    cart: [{ name: 'Golf Cart Rental', price: 20 }, { name: 'Pull Cart', price: 8 }],
    pro_shop: [{ name: 'Pro V1 Dozen', price: 54.99 }, { name: 'Golf Glove', price: 24.99 }, { name: 'Club Polo', price: 79.99 }, { name: 'Cap', price: 29.99 }],
    food_beverage: [{ name: 'Clubhouse Burger', price: 16.5 }, { name: 'Draft Beer', price: 8 }, { name: 'Turn Dog', price: 7.5 }, { name: 'Gatorade', price: 4 }],
    lesson: [{ name: 'Private Lesson (1hr)', price: 120 }, { name: 'Group Clinic', price: 45 }],
    tournament: [{ name: 'Tournament Entry', price: 150 }],
  };
  const categories = Object.keys(PRODUCTS);
  let posCount = 0;
  for (let i = 0; i < 150; i++) {
    const category = pick(categories, i);
    const catalog = PRODUCTS[category];
    const lineCount = rand(1, 3);
    const items = Array.from({ length: lineCount }).map((_, l) => {
      const prod = pick(catalog, i + l);
      const qty = rand(1, 3);
      return { name: prod.name, sku: `SKU-${category}-${l}`, qty, unit_price: prod.price, total: +(prod.price * qty).toFixed(2) };
    });
    const subtotal = +items.reduce((s, it) => s + it.total, 0).toFixed(2);
    const tax = +(subtotal * 0.07).toFixed(2);
    const total = +(subtotal + tax).toFixed(2);
    const member = i % 3 === 0 ? pick(memberRows, i) : null;
    await db.insert(posTransactions).values({
      clubId: club.id,
      memberId: member?.id ?? null,
      cashierId: cashier.id,
      items,
      subtotal: money(subtotal),
      tax: money(tax),
      discount: '0',
      total: money(total),
      paymentMethod: pick(['cash', 'card', 'member_account'], i),
      category,
      status: 'completed',
      createdAt: new Date(addDays(today, -rand(0, 30))),
    });
    posCount++;
  }
  console.log(`[seed] ${posCount} pos transactions`);

  // -------------------------------------------------------------------------
  // Inventory: 20 items across categories
  // -------------------------------------------------------------------------
  const INVENTORY = [
    { name: 'Titleist Pro V1 (Dozen)', category: 'equipment', price: 54.99, cost: 34, qty: 2, min: 12, supplier: 'Titleist' },
    { name: 'Callaway Chrome Soft (Dozen)', category: 'equipment', price: 49.99, cost: 30, qty: 30, min: 12, supplier: 'Callaway' },
    { name: 'FootJoy Golf Glove', category: 'apparel', price: 24.99, cost: 12, qty: 45, min: 20, supplier: 'FootJoy' },
    { name: 'Club Logo Polo', category: 'apparel', price: 79.99, cost: 38, qty: 18, min: 10, supplier: 'Nike Golf' },
    { name: 'Club Logo Cap', category: 'apparel', price: 29.99, cost: 11, qty: 60, min: 24, supplier: 'New Era' },
    { name: 'Bridgestone e6 (Dozen)', category: 'equipment', price: 27.99, cost: 16, qty: 5, min: 12, supplier: 'Bridgestone' },
    { name: 'Golf Tees (Bag of 100)', category: 'accessories', price: 9.99, cost: 3, qty: 120, min: 30, supplier: 'Pride' },
    { name: 'Divot Repair Tool', category: 'accessories', price: 12.99, cost: 4, qty: 80, min: 25, supplier: 'Generic' },
    { name: 'Sunscreen SPF 50', category: 'accessories', price: 8.99, cost: 3.5, qty: 40, min: 15, supplier: 'Banana Boat' },
    { name: 'Clubhouse Burger', category: 'food', price: 16.5, cost: 5.5, qty: 200, min: 50, supplier: 'Sysco' },
    { name: 'Turn Dog', category: 'food', price: 7.5, cost: 2, qty: 150, min: 50, supplier: 'Sysco' },
    { name: 'Pretzel', category: 'food', price: 5.0, cost: 1.5, qty: 8, min: 30, supplier: 'Sysco' },
    { name: 'Draft Beer Keg', category: 'beverage', price: 8.0, cost: 2.5, qty: 12, min: 6, supplier: 'Local Distributor' },
    { name: 'Gatorade (Case)', category: 'beverage', price: 4.0, cost: 1.2, qty: 90, min: 40, supplier: 'PepsiCo' },
    { name: 'Bottled Water (Case)', category: 'beverage', price: 2.5, cost: 0.6, qty: 200, min: 60, supplier: 'Nestle' },
    { name: 'Soft Spikes (Set)', category: 'accessories', price: 14.99, cost: 5, qty: 35, min: 15, supplier: 'Softspikes' },
    { name: 'Rangefinder', category: 'equipment', price: 299.99, cost: 180, qty: 6, min: 3, supplier: 'Bushnell' },
    { name: 'Golf Towel', category: 'accessories', price: 19.99, cost: 7, qty: 50, min: 20, supplier: 'Generic' },
    { name: 'Umbrella', category: 'accessories', price: 34.99, cost: 14, qty: 3, min: 10, supplier: 'GustBuster' },
    { name: 'Energy Bar', category: 'food', price: 3.5, cost: 1, qty: 110, min: 40, supplier: 'Clif' },
  ];
  await db.insert(inventoryItems).values(
    INVENTORY.map((it) => ({
      clubId: club.id,
      name: it.name,
      sku: `INV-${it.name.replace(/[^A-Z0-9]/gi, '').slice(0, 8).toUpperCase()}`,
      category: it.category,
      description: `${it.name} — stocked in the pro shop / clubhouse.`,
      price: money(it.price),
      cost: money(it.cost),
      quantityOnHand: it.qty,
      quantityMinimum: it.min,
      supplier: it.supplier,
    })),
  );
  console.log(`[seed] ${INVENTORY.length} inventory items`);

  // -------------------------------------------------------------------------
  // Tournaments: 3 (upcoming, in progress, completed)
  // -------------------------------------------------------------------------
  const [tUpcoming] = await db.insert(tournaments).values({
    clubId: club.id, name: 'Summer Member-Guest Invitational', date: dateStr(addDays(today, 21)),
    format: 'scramble', status: 'registration_open', maxPlayers: 72, entryFee: money(150), prizePool: money(8000),
    description: 'Our flagship two-day member-guest event.', rules: 'Two-person scramble. Handicaps applied.',
  }).returning();
  const [tProgress] = await db.insert(tournaments).values({
    clubId: club.id, name: "Club Championship", date: dateStr(today),
    format: 'stroke_play', status: 'in_progress', maxPlayers: 48, entryFee: money(100), prizePool: money(5000),
    description: 'Annual stroke-play club championship.', rules: '36 holes stroke play, gross and net divisions.',
  }).returning();
  const [tDone] = await db.insert(tournaments).values({
    clubId: club.id, name: 'Spring Stableford Classic', date: dateStr(addDays(today, -20)),
    format: 'stableford', status: 'completed', maxPlayers: 60, entryFee: money(80), prizePool: money(3500),
    description: 'Spring season opener.', rules: 'Modified Stableford scoring.',
  }).returning();

  // Entries for in-progress (with live scores) and completed (final positions)
  const progressEntries = memberRows.slice(0, 12).map((m, i) => ({
    tournamentId: tProgress.id, memberId: m.id, handicapAtEntry: m.handicapIndex,
    score: 68 + ((i * 3) % 18), status: 'registered', paymentStatus: 'paid',
  }));
  await db.insert(tournamentEntries).values(progressEntries);

  const doneEntriesData = memberRows.slice(5, 20).map((m, i) => ({
    member: m, score: 70 + ((i * 5) % 20),
  }));
  doneEntriesData.sort((a, b) => a.score - b.score);
  await db.insert(tournamentEntries).values(
    doneEntriesData.map((e, i) => ({
      tournamentId: tDone.id, memberId: e.member.id, handicapAtEntry: e.member.handicapIndex,
      score: e.score, position: i + 1, status: 'completed', paymentStatus: 'paid',
    })),
  );
  // A few registrations for the upcoming event
  await db.insert(tournamentEntries).values(
    memberRows.slice(0, 8).map((m) => ({
      tournamentId: tUpcoming.id, memberId: m.id, handicapAtEntry: m.handicapIndex,
      status: 'registered', paymentStatus: 'pending',
    })),
  );
  console.log('[seed] 3 tournaments + entries');

  // -------------------------------------------------------------------------
  // Maintenance logs: 5
  // -------------------------------------------------------------------------
  await db.insert(maintenanceLogs).values([
    { clubId: club.id, area: 'hole_7', issueType: 'irrigation', priority: 'high', description: 'Sprinkler head broken on 7th fairway, flooding the landing area.', status: 'open', reportedBy: cashier.id },
    { clubId: club.id, area: 'hole_12', issueType: 'turf', priority: 'medium', description: 'Bare patch on 12 green needs reseeding.', status: 'in_progress', assignedTo: userRows[3].id, reportedBy: owner.id },
    { clubId: club.id, area: 'cart_shed', issueType: 'equipment', priority: 'critical', description: 'Cart #14 battery failure — out of service.', status: 'open', reportedBy: cashier.id },
    { clubId: club.id, area: 'clubhouse', issueType: 'facility', priority: 'low', description: 'Replace lightbulb in men\'s locker room.', status: 'resolved', assignedTo: userRows[3].id, reportedBy: owner.id, resolvedAt: new Date(addDays(today, -2)) },
    { clubId: club.id, area: 'driving_range', issueType: 'equipment', priority: 'medium', description: 'Ball dispenser jamming intermittently.', status: 'in_progress', assignedTo: userRows[3].id, reportedBy: cashier.id },
  ]);
  console.log('[seed] 5 maintenance logs');

  // -------------------------------------------------------------------------
  // A couple of notifications
  // -------------------------------------------------------------------------
  await db.insert(notifications).values([
    { clubId: club.id, userId: owner.id, type: 'inventory', title: 'Low stock alert', message: 'Titleist Pro V1 (Dozen) is below the reorder threshold (2 left).', actionUrl: '/inventory' },
    { clubId: club.id, userId: owner.id, type: 'maintenance', title: 'Critical issue reported', message: 'Cart #14 battery failure — out of service.', actionUrl: '/maintenance' },
    { clubId: club.id, userId: null, type: 'tournament', title: 'Club Championship underway', message: 'Live scoring is now open for the Club Championship.', actionUrl: '/tournaments' },
  ]);
  console.log('[seed] notifications');

  console.log('[seed] complete ✓');
  await closeDb();
}

seed().catch((err) => {
  console.error('[seed] failed:', err);
  process.exit(1);
});
