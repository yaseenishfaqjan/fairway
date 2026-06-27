import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import {
  announcements,
  carts,
  clubs,
  db,
  events,
  leads,
  members,
  memberPayments,
  memberRequests,
  menuItems,
  orderLines,
  orders,
  pool,
  rounds,
  shifts,
  staffProfiles,
  tasks,
  teeTimes,
  timeOffRequests,
  users,
} from "@workspace/db";

const CLUB_SLUG = "augusta-pines";
const DEMO_PASSWORD = "Password123!";
const YEAR = 2026;
const MONTHS: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};

function clock(t: string): [number, number] {
  const m = t.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!m) return [12, 0];
  let h = Number(m[1]);
  const mm = Number(m[2]);
  const ap = m[3].toUpperCase();
  if (ap === "PM" && h !== 12) h += 12;
  if (ap === "AM" && h === 12) h = 0;
  return [h, mm];
}
function dt(dateStr: string, timeStr: string): Date {
  const [mon, day] = dateStr.split(" ");
  const [h, mm] = clock(timeStr);
  return new Date(Date.UTC(YEAR, MONTHS[mon] ?? 5, Number(day), h, mm));
}
/** A time on the demo "today" (Jun 13, 2026). */
function todayAt(timeStr: string): Date {
  const [h, mm] = clock(timeStr);
  return new Date(Date.UTC(YEAR, 5, 13, h, mm));
}
function minsAgo(label: string): Date {
  const m = label.match(/(\d+)\s*min/);
  const mins = m ? Number(m[1]) : 0;
  return new Date(Date.now() - mins * 60_000);
}
const hash = (pw: string) => bcrypt.hashSync(pw, 10);

async function main() {
  const existing = await db
    .select({ id: clubs.id })
    .from(clubs)
    .where(eq(clubs.slug, CLUB_SLUG));
  if (existing.length > 0) {
    console.log(`[seed] Club "${CLUB_SLUG}" already exists — skipping (idempotent).`);
    return;
  }

  console.log("[seed] Creating Augusta Pines (tenant #1)…");
  const [club] = await db
    .insert(clubs)
    .values({
      name: "Augusta Pines",
      slug: CLUB_SLUG,
      businessType: "golf_course",
      timezone: "America/New_York",
      plan: "pro",
      status: "active",
    })
    .returning({ id: clubs.id });
  const clubId = club.id;

  const pwHash = hash(DEMO_PASSWORD);

  // ---- Members --------------------------------------------------------------
  type MemberSeed = {
    name: string;
    initials: string;
    email: string;
    tier?: string;
    since?: number;
    handicap?: string;
    rounds?: number;
    balance?: string;
    number: string;
  };
  const memberSeeds: MemberSeed[] = [
    { name: "James Whitmore", initials: "JW", email: "james@augustapines.com", tier: "Elite Club", since: 2019, handicap: "8.4", rounds: 37, balance: "142.50", number: "FW-10428" },
    { name: "Sandra Liu", initials: "SL", email: "sandra@augustapines.com", tier: "Premier", since: 2021, handicap: "14.2", rounds: 19, balance: "63.00", number: "FW-10512" },
    { name: "The Patterson Group", initials: "PG", email: "patterson@augustapines.com", tier: "Corporate", since: 2020, handicap: "12.0", rounds: 24, balance: "0.00", number: "FW-10677" },
    { name: "Robert Diaz", initials: "RD", email: "robert@augustapines.com", tier: "Premier", since: 2018, handicap: "9.7", rounds: 41, balance: "212.00", number: "FW-10233" },
    { name: "Emma Thompson", initials: "ET", email: "emma@augustapines.com", tier: "Standard", since: 2022, handicap: "18.5", rounds: 12, balance: "34.50", number: "FW-10890" },
    { name: "Marcus Reid", initials: "MR", email: "marcus@augustapines.com", tier: "Elite Club", since: 2017, handicap: "6.1", rounds: 52, balance: "88.00", number: "FW-10119" },
    { name: "Hannah Cole", initials: "HC", email: "hannah@augustapines.com", tier: "Standard", since: 2023, handicap: "22.0", rounds: 8, balance: "12.00", number: "FW-11002" },
    { name: "Wesley Grant", initials: "WG", email: "wesley@augustapines.com", tier: "Premier", since: 2019, handicap: "11.3", rounds: 27, balance: "0.00", number: "FW-10455" },
    { name: "Olivia Carter", initials: "OC", email: "olivia@augustapines.com", tier: "Standard", since: 2024, handicap: "26.4", rounds: 4, balance: "0.00", number: "FW-11140" },
    { name: "Daniel Brooks", initials: "DB", email: "daniel@augustapines.com", tier: "Premier", since: 2020, handicap: "10.8", rounds: 31, balance: "47.00", number: "FW-10720" },
    { name: "The Bennett Foursome", initials: "BF", email: "bennett@augustapines.com", tier: "Corporate", since: 2021, handicap: "13.0", rounds: 16, balance: "0.00", number: "FW-10988" },
    { name: "Priya Nair", initials: "PN", email: "priya@augustapines.com", tier: "Standard", since: 2023, handicap: "20.1", rounds: 9, balance: "0.00", number: "FW-11077" },
    { name: "Sophie Tran", initials: "ST", email: "sophie@augustapines.com", tier: "Standard", since: 2024, handicap: "24.0", rounds: 3, balance: "0.00", number: "FW-11203" },
    { name: "Ethan Wallace", initials: "EW", email: "ethan@augustapines.com", tier: "Premier", since: 2018, handicap: "8.9", rounds: 44, balance: "0.00", number: "FW-10301" },
  ];

  const memberId = new Map<string, string>();
  for (const m of memberSeeds) {
    const [u] = await db
      .insert(users)
      .values({
        clubId,
        email: m.email,
        passwordHash: pwHash,
        role: "member",
        name: m.name,
        initials: m.initials,
        status: "active",
      })
      .returning({ id: users.id });
    const [mem] = await db
      .insert(members)
      .values({
        clubId,
        userId: u.id,
        memberNumber: m.number,
        tier: m.tier ?? "Standard",
        memberSince: m.since ?? YEAR,
        handicap: m.handicap ?? null,
        roundsThisYear: m.rounds ?? 0,
        balance: m.balance ?? "0",
      })
      .returning({ id: members.id });
    memberId.set(m.name, mem.id);
  }
  console.log(`[seed]  ${memberSeeds.length} members`);

  // ---- Staff ----------------------------------------------------------------
  type StaffSeed = {
    name: string; initials: string; email: string; role: "supervisor" | "employee";
    jobTitle: string; employeeNo: string; area?: string;
    status: "On Shift" | "On Break" | "Clocked Out" | "Off Today"; hoursTarget?: number;
  };
  const staffSeeds: StaffSeed[] = [
    { name: "Carlos Mendez", initials: "CM", email: "carlos@augustapines.com", role: "supervisor", jobTitle: "Operations Manager", employeeNo: "EMP-1001", area: "Clubhouse", status: "On Shift" },
    { name: "Maria Santos", initials: "MS", email: "maria@augustapines.com", role: "employee", jobTitle: "F&B Server", employeeNo: "EMP-2048", area: "Beverage Cart 2", status: "On Shift" },
    { name: "Devon Clark", initials: "DC", email: "devon@augustapines.com", role: "employee", jobTitle: "Kitchen", employeeNo: "EMP-2051", area: "Clubhouse Kitchen", status: "On Shift" },
    { name: "Aisha Khan", initials: "AK", email: "aisha@augustapines.com", role: "employee", jobTitle: "Cart Attendant", employeeNo: "EMP-2063", area: "Front Nine", status: "On Break" },
    { name: "Tyler Brooks", initials: "TB", email: "tyler@augustapines.com", role: "employee", jobTitle: "Grounds", employeeNo: "EMP-2072", area: "Back Nine Greens", status: "On Shift" },
    { name: "Nina Alvarez", initials: "NA", email: "nina@augustapines.com", role: "employee", jobTitle: "Pro Shop", employeeNo: "EMP-2080", area: "Pro Shop", status: "On Shift" },
    { name: "Grant Wesley", initials: "GW", email: "grant@augustapines.com", role: "employee", jobTitle: "Marshal", employeeNo: "EMP-2091", area: "Course", status: "Off Today" },
    { name: "Riley Cooper", initials: "RC", email: "riley@augustapines.com", role: "employee", jobTitle: "F&B Server", employeeNo: "EMP-2099", area: "Sunset Grill", status: "Clocked Out" },
  ];
  const staffId = new Map<string, string>();
  for (const s of staffSeeds) {
    const [u] = await db
      .insert(users)
      .values({
        clubId, email: s.email, passwordHash: pwHash, role: s.role,
        name: s.name, initials: s.initials, status: "active",
      })
      .returning({ id: users.id });
    const [sp] = await db
      .insert(staffProfiles)
      .values({
        clubId, userId: u.id, jobTitle: s.jobTitle, employeeNo: s.employeeNo,
        defaultArea: s.area ?? null, currentStatus: s.status, hoursTarget: s.hoursTarget ?? 40,
      })
      .returning({ id: staffProfiles.id });
    staffId.set(s.name, sp.id);
  }
  console.log(`[seed]  ${staffSeeds.length} staff`);

  // ---- Carts ----------------------------------------------------------------
  const cartSeeds: Array<{ number: string; status: "available" | "in_use" | "charging" | "low_battery" }> = [
    { number: "Cart 02", status: "in_use" },
    { number: "Cart 04", status: "in_use" },
    { number: "Cart 09", status: "in_use" },
    { number: "Cart 12", status: "in_use" },
    { number: "Cart 17", status: "low_battery" },
    { number: "Cart 21", status: "in_use" },
    { number: "Cart 01", status: "available" },
    { number: "Cart 03", status: "charging" },
  ];
  const cartId = new Map<string, string>();
  for (const c of cartSeeds) {
    const [row] = await db
      .insert(carts)
      .values({ clubId, cartNumber: c.number, status: c.status })
      .returning({ id: carts.id });
    cartId.set(c.number, row.id);
  }

  // ---- Rounds (live on-course) ----------------------------------------------
  const roundSeeds = [
    { member: "James Whitmore", hole: 3, cart: "Cart 12", status: "Food Order", pace: "On pace", x: "24", y: "30" },
    { member: "Sandra Liu", hole: 6, cart: "Cart 04", status: "Needs Assistance", pace: "Slow play", x: "58", y: "22" },
    { member: "The Patterson Group", hole: 8, cart: "Cart 09", status: "Playing", pace: "On pace", x: "74", y: "44" },
    { member: "Robert Diaz", hole: 11, cart: "Cart 17", status: "Cart Request", pace: "Ahead", x: "46", y: "58" },
    { member: "Emma Thompson", hole: 14, cart: "Cart 02", status: "Playing", pace: "On pace", x: "30", y: "74" },
    { member: "Marcus Reid", hole: 16, cart: "Cart 21", status: "Playing", pace: "On pace", x: "68", y: "78" },
  ] as const;
  const roundId = new Map<string, string>();
  for (const r of roundSeeds) {
    const mid = memberId.get(r.member)!;
    const [row] = await db
      .insert(rounds)
      .values({
        clubId, memberId: mid, cartId: cartId.get(r.cart) ?? null,
        currentHole: r.hole, status: r.status, pace: r.pace,
        mapX: r.x, mapY: r.y,
      })
      .returning({ id: rounds.id });
    roundId.set(r.member, row.id);
  }

  // ---- Tee times (today's sheet) --------------------------------------------
  const bookingSeeds: Array<{ member: string; time: string; players: number; holes: number; status: "confirmed" | "checked_in" | "pending" }> = [
    { member: "James Whitmore", time: "7:10 AM", players: 4, holes: 18, status: "checked_in" },
    { member: "Sandra Liu", time: "7:40 AM", players: 2, holes: 18, status: "checked_in" },
    { member: "The Patterson Group", time: "8:00 AM", players: 4, holes: 18, status: "checked_in" },
    { member: "Emma Thompson", time: "8:30 AM", players: 3, holes: 18, status: "checked_in" },
    { member: "Marcus Reid", time: "9:10 AM", players: 4, holes: 18, status: "checked_in" },
    { member: "Robert Diaz", time: "11:20 AM", players: 3, holes: 9, status: "confirmed" },
    { member: "Olivia Carter", time: "11:50 AM", players: 2, holes: 9, status: "confirmed" },
    { member: "The Bennett Foursome", time: "12:40 PM", players: 4, holes: 18, status: "confirmed" },
    { member: "Hannah Cole", time: "1:50 PM", players: 2, holes: 18, status: "pending" },
    { member: "Daniel Brooks", time: "2:20 PM", players: 3, holes: 9, status: "confirmed" },
    { member: "Priya Nair", time: "2:50 PM", players: 2, holes: 9, status: "pending" },
    { member: "Wesley Grant", time: "3:30 PM", players: 4, holes: 9, status: "confirmed" },
    { member: "Sophie Tran", time: "4:00 PM", players: 2, holes: 9, status: "pending" },
    { member: "Ethan Wallace", time: "4:40 PM", players: 4, holes: 9, status: "confirmed" },
  ];
  for (const b of bookingSeeds) {
    await db.insert(teeTimes).values({
      clubId, memberId: memberId.get(b.member) ?? null,
      startsAt: todayAt(b.time), players: b.players, holes: b.holes, status: b.status,
    });
  }
  // A few open (bookable) slots for the members portal.
  for (const t of ["6:40 AM", "7:00 AM", "9:30 AM", "10:00 AM"]) {
    await db.insert(teeTimes).values({
      clubId, memberId: null, startsAt: todayAt(t), players: 1, holes: 18, status: "pending",
    });
  }
  console.log(`[seed]  ${bookingSeeds.length + 4} tee times`);

  // ---- Member requests ------------------------------------------------------
  const requestSeeds: Array<{ member: string; hole: number; request: string; type: "Beverage" | "Food" | "Cart" | "Assistance"; priority: "Normal" | "High" }> = [
    { member: "Sandra Liu", hole: 6, request: "Lost ball — needs marshal assistance", type: "Assistance", priority: "High" },
    { member: "James Whitmore", hole: 3, request: "2× turkey club, 1× iced tea to the tee", type: "Food", priority: "Normal" },
    { member: "Robert Diaz", hole: 11, request: "Replacement cart — battery low", type: "Cart", priority: "High" },
    { member: "The Patterson Group", hole: 8, request: "Beverage cart restock request", type: "Beverage", priority: "Normal" },
    { member: "Emma Thompson", hole: 14, request: "Round of cold brews for the group", type: "Beverage", priority: "Normal" },
    { member: "Marcus Reid", hole: 16, request: "Sunscreen and a bag of tees", type: "Assistance", priority: "Normal" },
    { member: "Hannah Cole", hole: 2, request: "Caesar salad + bottled water at the turn", type: "Food", priority: "Normal" },
    { member: "Wesley Grant", hole: 9, request: "Slow group ahead — pace check requested", type: "Assistance", priority: "High" },
    { member: "Sandra Liu", hole: 7, request: "Extra towels — sprinkler overspray", type: "Assistance", priority: "Normal" },
    { member: "The Bennett Foursome", hole: 12, request: "2× clubhouse burgers, 4× draft beer", type: "Food", priority: "Normal" },
    { member: "Daniel Brooks", hole: 5, request: "Cart pickup — twisted ankle", type: "Cart", priority: "High" },
    { member: "Olivia Carter", hole: 4, request: "Arnold Palmer to the next tee", type: "Beverage", priority: "Normal" },
  ];
  for (const r of requestSeeds) {
    await db.insert(memberRequests).values({
      clubId, memberId: memberId.get(r.member)!, roundId: roundId.get(r.member) ?? null,
      hole: r.hole, request: r.request, type: r.type, priority: r.priority, status: "open",
    });
  }
  console.log(`[seed]  ${requestSeeds.length} member requests`);

  // ---- Menu -----------------------------------------------------------------
  const menuSeeds: Array<{ id: string; name: string; price: string; category: "Drinks" | "Food" | "Snacks" }> = [
    { id: "d1", name: "Iced Tea", price: "4", category: "Drinks" },
    { id: "d2", name: "Lemonade", price: "4", category: "Drinks" },
    { id: "d3", name: "Bottled Water", price: "3", category: "Drinks" },
    { id: "d4", name: "Cold Brew Coffee", price: "5", category: "Drinks" },
    { id: "d5", name: "Draft Beer", price: "8", category: "Drinks" },
    { id: "d6", name: "Arnold Palmer", price: "5", category: "Drinks" },
    { id: "d7", name: "Bloody Mary", price: "11", category: "Drinks" },
    { id: "d8", name: "Soda", price: "3", category: "Drinks" },
    { id: "f1", name: "Turkey Club", price: "13", category: "Food" },
    { id: "f2", name: "Clubhouse Burger", price: "15", category: "Food" },
    { id: "f3", name: "Grilled Chicken Wrap", price: "12", category: "Food" },
    { id: "f4", name: "Caesar Salad", price: "11", category: "Food" },
    { id: "f5", name: "All-Beef Hot Dog", price: "7", category: "Food" },
    { id: "f6", name: "BLT Sandwich", price: "10", category: "Food" },
    { id: "s1", name: "Trail Mix", price: "4", category: "Snacks" },
    { id: "s2", name: "Kettle Chips", price: "3", category: "Snacks" },
    { id: "s3", name: "Fresh Fruit Cup", price: "5", category: "Snacks" },
    { id: "s4", name: "Granola Bar", price: "3", category: "Snacks" },
  ];
  const menuIdByName = new Map<string, string>();
  const menuPriceByName = new Map<string, string>();
  for (const mi of menuSeeds) {
    const [row] = await db
      .insert(menuItems)
      .values({
        clubId, name: mi.name, price: mi.price, category: mi.category,
        imageUrl: `menu_${mi.id}.png`, available: true,
      })
      .returning({ id: menuItems.id });
    menuIdByName.set(mi.name, row.id);
    menuPriceByName.set(mi.name, mi.price);
  }
  console.log(`[seed]  ${menuSeeds.length} menu items`);

  // ---- Orders ---------------------------------------------------------------
  const orderSeeds: Array<{
    member: string; hole: number; cart: string; note: string;
    status: "New" | "Preparing" | "Ready" | "Delivered"; placedAt: string;
    lines: Array<{ name: string; qty: number }>;
  }> = [
    { member: "Sandra Liu", hole: 6, cart: "Cart 04", note: "", status: "New", placedAt: "1 min ago", lines: [{ name: "Lemonade", qty: 2 }, { name: "Fresh Fruit Cup", qty: 1 }] },
    { member: "The Patterson Group", hole: 8, cart: "Cart 09", note: "", status: "New", placedAt: "2 min ago", lines: [{ name: "Draft Beer", qty: 4 }, { name: "Kettle Chips", qty: 2 }] },
    { member: "Emma Thompson", hole: 14, cart: "Cart 02", note: "Dressing on the side.", status: "New", placedAt: "4 min ago", lines: [{ name: "Grilled Chicken Wrap", qty: 1 }, { name: "Caesar Salad", qty: 1 }, { name: "Bottled Water", qty: 2 }] },
    { member: "James Whitmore", hole: 3, cart: "Cart 12", note: "Extra napkins, please.", status: "Preparing", placedAt: "6 min ago", lines: [{ name: "Turkey Club", qty: 2 }, { name: "Iced Tea", qty: 2 }] },
    { member: "Robert Diaz", hole: 11, cart: "Cart 17", note: "One burger no pickles.", status: "Preparing", placedAt: "8 min ago", lines: [{ name: "Clubhouse Burger", qty: 2 }, { name: "Soda", qty: 2 }] },
    { member: "Sandra Liu", hole: 6, cart: "Cart 04", note: "", status: "Preparing", placedAt: "9 min ago", lines: [{ name: "Cold Brew Coffee", qty: 2 }, { name: "Granola Bar", qty: 2 }] },
    { member: "Marcus Reid", hole: 16, cart: "Cart 21", note: "No onions.", status: "Ready", placedAt: "11 min ago", lines: [{ name: "Arnold Palmer", qty: 1 }, { name: "All-Beef Hot Dog", qty: 1 }] },
    { member: "The Patterson Group", hole: 8, cart: "Cart 09", note: "", status: "Ready", placedAt: "14 min ago", lines: [{ name: "BLT Sandwich", qty: 2 }, { name: "Bloody Mary", qty: 2 }] },
    { member: "James Whitmore", hole: 3, cart: "Cart 12", note: "", status: "Delivered", placedAt: "26 min ago", lines: [{ name: "Trail Mix", qty: 2 }, { name: "Bottled Water", qty: 4 }] },
  ];
  for (const o of orderSeeds) {
    const total = o.lines.reduce(
      (sum, l) => sum + Number(menuPriceByName.get(l.name) ?? 0) * l.qty,
      0,
    );
    const [row] = await db
      .insert(orders)
      .values({
        clubId, memberId: memberId.get(o.member)!, roundId: roundId.get(o.member) ?? null,
        hole: o.hole, cartId: cartId.get(o.cart) ?? null, note: o.note,
        status: o.status, placedAt: minsAgo(o.placedAt), total: total.toFixed(2),
      })
      .returning({ id: orders.id });
    for (const l of o.lines) {
      await db.insert(orderLines).values({
        clubId, orderId: row.id, menuItemId: menuIdByName.get(l.name) ?? null,
        nameSnapshot: l.name, priceSnapshot: menuPriceByName.get(l.name) ?? "0", qty: l.qty,
      });
    }
  }
  console.log(`[seed]  ${orderSeeds.length} orders`);

  // ---- Shifts (Maria Santos) ------------------------------------------------
  const maria = staffId.get("Maria Santos")!;
  const shiftSeeds: Array<{ date: string; time: string; assignment: string }> = [
    { date: "Jun 13", time: "6:00 AM – 2:00 PM", assignment: "Beverage Cart 2" },
    { date: "Jun 14", time: "6:00 AM – 2:00 PM", assignment: "Beverage Cart 1" },
    { date: "Jun 16", time: "10:00 AM – 6:00 PM", assignment: "Sunset Grill" },
    { date: "Jun 17", time: "6:00 AM – 2:00 PM", assignment: "Beverage Cart 2" },
    { date: "Jun 19", time: "7:00 AM – 3:00 PM", assignment: "Clubhouse Kitchen" },
    { date: "Jun 20", time: "6:00 AM – 2:00 PM", assignment: "Beverage Cart 2" },
    { date: "Jun 21", time: "11:00 AM – 7:00 PM", assignment: "Sunset Grill" },
    { date: "Jun 23", time: "6:00 AM – 2:00 PM", assignment: "Beverage Cart 1" },
  ];
  for (const sh of shiftSeeds) {
    const [start, end] = sh.time.split("–").map((s) => s.trim());
    await db.insert(shifts).values({
      clubId, staffId: maria, startsAt: dt(sh.date, start), endsAt: dt(sh.date, end),
      assignment: sh.assignment,
    });
  }
  console.log(`[seed]  ${shiftSeeds.length} shifts`);

  // ---- Time-off (Maria Santos) ----------------------------------------------
  const timeOffSeeds: Array<{ start: string; end: string; reason: string; status: "Pending" | "Approved" | "Denied" }> = [
    { start: "Jun 20", end: "Jun 22", reason: "Family event", status: "Approved" },
    { start: "Jul 4", end: "Jul 4", reason: "Holiday weekend", status: "Pending" },
    { start: "Jun 28", end: "Jun 28", reason: "Doctor appointment", status: "Approved" },
    { start: "Jul 10", end: "Jul 14", reason: "Summer vacation", status: "Pending" },
    { start: "Jun 16", end: "Jun 16", reason: "Personal day", status: "Denied" },
    { start: "Aug 1", end: "Aug 3", reason: "Wedding (out of state)", status: "Pending" },
  ];
  const isoDate = (s: string) => {
    const [mon, day] = s.split(" ");
    const mm = String((MONTHS[mon] ?? 0) + 1).padStart(2, "0");
    const dd = String(Number(day)).padStart(2, "0");
    return `${YEAR}-${mm}-${dd}`;
  };
  for (const to of timeOffSeeds) {
    await db.insert(timeOffRequests).values({
      clubId, staffId: maria, startDate: isoDate(to.start), endDate: isoDate(to.end),
      reason: to.reason, status: to.status,
    });
  }
  console.log(`[seed]  ${timeOffSeeds.length} time-off requests`);

  // ---- Tasks ----------------------------------------------------------------
  const taskSeeds: Array<{ label: string; due: string; done: boolean; priority: "High" | "Medium" | "Low" }> = [
    { label: "Re-stock beverage cart #2", due: "10:30 AM", done: false, priority: "High" },
    { label: "Mow & roll greens on back nine", due: "11:00 AM", done: false, priority: "Medium" },
    { label: "Confirm 8 tee times for tomorrow", due: "12:00 PM", done: true, priority: "Medium" },
    { label: "Prep clubhouse for 6pm wedding tasting", due: "2:00 PM", done: false, priority: "High" },
    { label: "Call back Olivia Carter (membership)", due: "3:00 PM", done: false, priority: "Medium" },
    { label: "Replace flagstick on hole 7", due: "9:45 AM", done: true, priority: "Low" },
    { label: "Rake all front-nine bunkers", due: "10:00 AM", done: true, priority: "Low" },
    { label: "Restock Pro Shop glove display", due: "11:30 AM", done: false, priority: "Low" },
    { label: "Send Member-Guest pairings to print", due: "1:00 PM", done: false, priority: "Medium" },
    { label: "Charge cart fleet overnight", due: "5:00 PM", done: false, priority: "Low" },
  ];
  for (const t of taskSeeds) {
    await db.insert(tasks).values({
      clubId, label: t.label, dueAt: todayAt(t.due), priority: t.priority,
      done: t.done, completedAt: t.done ? todayAt(t.due) : null,
    });
  }
  console.log(`[seed]  ${taskSeeds.length} tasks`);

  // ---- Leads ----------------------------------------------------------------
  const leadSeeds: Array<{ name: string; source: string; interest: string; status: "New" | "Contacted" | "Tour Booked" | "Won" }> = [
    { name: "Acme Corp", source: "Website", interest: "Corporate Outing", status: "New" },
    { name: "Olivia Carter", source: "Missed Call", interest: "Membership", status: "New" },
    { name: "Daniel Brooks", source: "Chatbot", interest: "Wedding Venue", status: "Contacted" },
    { name: "Priya Nair", source: "Instagram", interest: "Junior Clinic", status: "Tour Booked" },
    { name: "Greenfield HOA", source: "Referral", interest: "League Play", status: "Contacted" },
    { name: "Westlake Realty", source: "Website", interest: "Corporate Outing", status: "New" },
    { name: "Marcus Bell", source: "Missed Call", interest: "Membership", status: "Contacted" },
    { name: "Sophie Tran", source: "Google Ads", interest: "Wedding Venue", status: "Tour Booked" },
    { name: "Northgate Rotary Club", source: "Referral", interest: "Charity Scramble", status: "Tour Booked" },
    { name: "Ethan Wallace", source: "Website", interest: "Membership", status: "Won" },
    { name: "Harper Lane", source: "Instagram", interest: "Junior Clinic", status: "New" },
    { name: "Summit Financial", source: "Email", interest: "Corporate Outing", status: "Contacted" },
    { name: "Grace Kim", source: "Chatbot", interest: "Lessons", status: "New" },
    { name: "Riverside Country Day", source: "Referral", interest: "Junior League", status: "Tour Booked" },
    { name: "Oliver Hayes", source: "Walk-in", interest: "Membership", status: "Won" },
  ];
  for (const l of leadSeeds) {
    await db.insert(leads).values({
      clubId, name: l.name, source: l.source, interest: l.interest, status: l.status,
    });
  }
  console.log(`[seed]  ${leadSeeds.length} leads`);

  // ---- Events ---------------------------------------------------------------
  const eventSeeds: Array<{ title: string; date: string; time: string; tag: "Tournament" | "Dining" | "Clinic" | "Social" | "League"; capacity: number | null; spotsTaken: number }> = [
    { title: "Member-Guest Invitational", date: "Jun 14", time: "8:00 AM", tag: "Tournament", capacity: 48, spotsTaken: 36 },
    { title: "Sunset Wine & Dine", date: "Jun 18", time: "6:30 PM", tag: "Dining", capacity: null, spotsTaken: 0 },
    { title: "Junior Golf Clinic", date: "Jun 21", time: "9:00 AM", tag: "Clinic", capacity: 20, spotsTaken: 15 },
    { title: "Twilight Scramble", date: "Jun 27", time: "4:30 PM", tag: "Social", capacity: null, spotsTaken: 0 },
    { title: "Ladies' League Opener", date: "Jul 2", time: "10:00 AM", tag: "League", capacity: 32, spotsTaken: 24 },
    { title: "Independence Day BBQ", date: "Jul 4", time: "12:00 PM", tag: "Dining", capacity: null, spotsTaken: 0 },
    { title: "Club Championship — Round 1", date: "Jul 12", time: "7:30 AM", tag: "Tournament", capacity: 60, spotsTaken: 60 },
    { title: "Wine Pairing Dinner", date: "Jul 19", time: "7:00 PM", tag: "Dining", capacity: 40, spotsTaken: 37 },
  ];
  for (const e of eventSeeds) {
    await db.insert(events).values({
      clubId, title: e.title, startsAt: dt(e.date, e.time), tag: e.tag,
      capacity: e.capacity, spotsTaken: e.spotsTaken,
    });
  }
  console.log(`[seed]  ${eventSeeds.length} events`);

  // ---- Announcements --------------------------------------------------------
  const annSeeds: Array<{ tag: string; title: string; date: string }> = [
    { tag: "Course", title: "Back nine aeration complete — greens running fast", date: "Jun 7" },
    { tag: "Event", title: "Member-Guest Invitational — registration now open", date: "Jun 5" },
    { tag: "Dining", title: "New summer tasting menu launches at Sunset Grill", date: "Jun 2" },
    { tag: "Course", title: "Cart path repaving on holes 4–6 — expect detours", date: "Jun 1" },
    { tag: "Pro Shop", title: "New 2026 driver fittings now booking with Coach Reyes", date: "May 29" },
    { tag: "Event", title: "Ladies' League sign-ups close Jun 28", date: "May 27" },
    { tag: "Dining", title: "Sunday brunch returns to the Veranda — reservations open", date: "May 24" },
    { tag: "Course", title: "Range nets replaced — full bay availability restored", date: "May 21" },
  ];
  for (const a of annSeeds) {
    await db.insert(announcements).values({
      clubId, tag: a.tag, title: a.title, audience: "all", publishedAt: dt(a.date, "9:00 AM"),
    });
  }
  console.log(`[seed]  ${annSeeds.length} announcements`);

  // ---- Member payments (James Whitmore) -------------------------------------
  const james = memberId.get("James Whitmore")!;
  const paymentSeeds: Array<{ label: string; date: string; amount: string; category: string }> = [
    { label: "Monthly Membership", date: "Jun 1", amount: "350.00", category: "Membership" },
    { label: "Pro Shop — FootJoy gloves", date: "May 28", amount: "64.00", category: "Pro Shop" },
    { label: "Dining — Sunset Grill", date: "May 22", amount: "78.50", category: "Dining" },
    { label: "Cart rental (×4)", date: "May 19", amount: "60.00", category: "Cart" },
    { label: "On-course F&B — Beverage Cart", date: "May 17", amount: "34.00", category: "F&B" },
    { label: "Lesson — Short Game w/ Coach Reyes", date: "May 12", amount: "120.00", category: "Lessons" },
    { label: "Pro Shop — Titleist Pro V1 (2 dozen)", date: "May 8", amount: "110.00", category: "Pro Shop" },
    { label: "Guest fees (×2)", date: "May 3", amount: "180.00", category: "Guest" },
  ];
  for (const p of paymentSeeds) {
    await db.insert(memberPayments).values({
      clubId, memberId: james, label: p.label, amount: p.amount,
      chargedAt: dt(p.date, "12:00 PM"), category: p.category,
    });
  }
  console.log(`[seed]  ${paymentSeeds.length} member payments`);

  console.log("\n[seed] Done. Demo login (all roles share the same password):");
  console.log("  Supervisor : carlos@augustapines.com");
  console.log("  Employee   : maria@augustapines.com");
  console.log("  Member     : james@augustapines.com");
  console.log(`  Password   : ${DEMO_PASSWORD}`);
}

main()
  .then(async () => {
    await pool.end();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error("[seed] FAILED:", err);
    await pool.end();
    process.exit(1);
  });
