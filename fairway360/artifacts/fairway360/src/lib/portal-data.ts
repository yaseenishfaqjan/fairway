import m_d1 from "@assets/generated_images/menu_d1.jpg";
import m_d2 from "@assets/generated_images/menu_d2.jpg";
import m_d3 from "@assets/generated_images/menu_d3.jpg";
import m_d4 from "@assets/generated_images/menu_d4.jpg";
import m_d5 from "@assets/generated_images/menu_d5.jpg";
import m_d6 from "@assets/generated_images/menu_d6.jpg";
import m_d7 from "@assets/generated_images/menu_d7.jpg";
import m_d8 from "@assets/generated_images/menu_d8.jpg";
import m_f1 from "@assets/generated_images/menu_f1.jpg";
import m_f2 from "@assets/generated_images/menu_f2.jpg";
import m_f3 from "@assets/generated_images/menu_f3.jpg";
import m_f4 from "@assets/generated_images/menu_f4.jpg";
import m_f5 from "@assets/generated_images/menu_f5.jpg";
import m_f6 from "@assets/generated_images/menu_f6.jpg";
import m_s1 from "@assets/generated_images/menu_s1.jpg";
import m_s2 from "@assets/generated_images/menu_s2.jpg";
import m_s3 from "@assets/generated_images/menu_s3.jpg";
import m_s4 from "@assets/generated_images/menu_s4.jpg";

export type CourseStatus = "Playing" | "Needs Assistance" | "Cart Request" | "Food Order";

export interface MemberOnCourse {
  id: string;
  name: string;
  initials: string;
  hole: number;
  cartNumber: string;
  status: CourseStatus;
  pace: "On pace" | "Slow play" | "Ahead";
  since: string;
  /** position on the stylized course map, in percentages */
  x: number;
  y: number;
}

export const membersOnCourse: MemberOnCourse[] = [
  { id: "g1", name: "James Whitmore", initials: "JW", hole: 3, cartNumber: "Cart 12", status: "Food Order", pace: "On pace", since: "1h 12m", x: 24, y: 30 },
  { id: "g2", name: "Sandra Liu", initials: "SL", hole: 6, cartNumber: "Cart 04", status: "Needs Assistance", pace: "Slow play", since: "1h 48m", x: 58, y: 22 },
  { id: "g3", name: "The Patterson Group", initials: "PG", hole: 8, cartNumber: "Cart 09", status: "Playing", pace: "On pace", since: "2h 05m", x: 74, y: 44 },
  { id: "g4", name: "Robert Diaz", initials: "RD", hole: 11, cartNumber: "Cart 17", status: "Cart Request", pace: "Ahead", since: "0h 54m", x: 46, y: 58 },
  { id: "g5", name: "Emma Thompson", initials: "ET", hole: 14, cartNumber: "Cart 02", status: "Playing", pace: "On pace", since: "1h 30m", x: 30, y: 74 },
  { id: "g6", name: "Marcus Reid", initials: "MR", hole: 16, cartNumber: "Cart 21", status: "Playing", pace: "On pace", since: "2h 22m", x: 68, y: 78 },
];

export interface Lead {
  id: string;
  name: string;
  source: string;
  interest: string;
  status: "New" | "Contacted" | "Tour Booked" | "Won";
  time: string;
}

export const leads: Lead[] = [
  { id: "l1", name: "Acme Corp", source: "Website", interest: "Corporate Outing", status: "New", time: "8m ago" },
  { id: "l2", name: "Olivia Carter", source: "Missed Call", interest: "Membership", status: "New", time: "26m ago" },
  { id: "l3", name: "Daniel Brooks", source: "Chatbot", interest: "Wedding Venue", status: "Contacted", time: "1h ago" },
  { id: "l4", name: "Priya Nair", source: "Instagram", interest: "Junior Clinic", status: "Tour Booked", time: "3h ago" },
  { id: "l5", name: "Greenfield HOA", source: "Referral", interest: "League Play", status: "Contacted", time: "5h ago" },
  { id: "l6", name: "Westlake Realty", source: "Website", interest: "Corporate Outing", status: "New", time: "12m ago" },
  { id: "l7", name: "Marcus Bell", source: "Missed Call", interest: "Membership", status: "Contacted", time: "42m ago" },
  { id: "l8", name: "Sophie Tran", source: "Google Ads", interest: "Wedding Venue", status: "Tour Booked", time: "2h ago" },
  { id: "l9", name: "Northgate Rotary Club", source: "Referral", interest: "Charity Scramble", status: "Tour Booked", time: "4h ago" },
  { id: "l10", name: "Ethan Wallace", source: "Website", interest: "Membership", status: "Won", time: "6h ago" },
  { id: "l11", name: "Harper Lane", source: "Instagram", interest: "Junior Clinic", status: "New", time: "1h ago" },
  { id: "l12", name: "Summit Financial", source: "Email", interest: "Corporate Outing", status: "Contacted", time: "Yesterday" },
  { id: "l13", name: "Grace Kim", source: "Chatbot", interest: "Lessons", status: "New", time: "18m ago" },
  { id: "l14", name: "Riverside Country Day", source: "Referral", interest: "Junior League", status: "Tour Booked", time: "Yesterday" },
  { id: "l15", name: "Oliver Hayes", source: "Walk-in", interest: "Membership", status: "Won", time: "2d ago" },
];

export interface Booking {
  id: string;
  member: string;
  time: string;
  players: number;
  holes: 9 | 18;
  status: "Confirmed" | "Checked In" | "Pending";
}

export const bookings: Booking[] = [
  { id: "b1", member: "James Whitmore", time: "7:10 AM", players: 4, holes: 18, status: "Checked In" },
  { id: "b2", member: "Sandra Liu", time: "7:40 AM", players: 2, holes: 18, status: "Checked In" },
  { id: "b3", member: "Patterson Group", time: "8:00 AM", players: 4, holes: 18, status: "Checked In" },
  { id: "b4", member: "Emma Thompson", time: "8:30 AM", players: 3, holes: 18, status: "Checked In" },
  { id: "b5", member: "Marcus Reid", time: "9:10 AM", players: 4, holes: 18, status: "Checked In" },
  { id: "b6", member: "Robert Diaz", time: "11:20 AM", players: 3, holes: 9, status: "Confirmed" },
  { id: "b7", member: "Olivia Carter", time: "11:50 AM", players: 2, holes: 9, status: "Confirmed" },
  { id: "b8", member: "The Bennett Foursome", time: "12:40 PM", players: 4, holes: 18, status: "Confirmed" },
  { id: "b9", member: "Hannah Cole", time: "1:50 PM", players: 2, holes: 18, status: "Pending" },
  { id: "b10", member: "Daniel Brooks", time: "2:20 PM", players: 3, holes: 9, status: "Confirmed" },
  { id: "b11", member: "Priya Nair", time: "2:50 PM", players: 2, holes: 9, status: "Pending" },
  { id: "b12", member: "Wesley Grant", time: "3:30 PM", players: 4, holes: 9, status: "Confirmed" },
  { id: "b13", member: "Sophie Tran", time: "4:00 PM", players: 2, holes: 9, status: "Pending" },
  { id: "b14", member: "Ethan Wallace", time: "4:40 PM", players: 4, holes: 9, status: "Confirmed" },
];

export interface MemberRequest {
  id: string;
  member: string;
  hole: number;
  request: string;
  type: "Beverage" | "Food" | "Cart" | "Assistance";
  priority: "Normal" | "High";
}

export const requests: MemberRequest[] = [
  { id: "r1", member: "Sandra Liu", hole: 6, request: "Lost ball — needs marshal assistance", type: "Assistance", priority: "High" },
  { id: "r2", member: "James Whitmore", hole: 3, request: "2× turkey club, 1× iced tea to the tee", type: "Food", priority: "Normal" },
  { id: "r3", member: "Robert Diaz", hole: 11, request: "Replacement cart — battery low", type: "Cart", priority: "High" },
  { id: "r4", member: "The Patterson Group", hole: 8, request: "Beverage cart restock request", type: "Beverage", priority: "Normal" },
  { id: "r5", member: "Emma Thompson", hole: 14, request: "Round of cold brews for the group", type: "Beverage", priority: "Normal" },
  { id: "r6", member: "Marcus Reid", hole: 16, request: "Sunscreen and a bag of tees", type: "Assistance", priority: "Normal" },
  { id: "r7", member: "Hannah Cole", hole: 2, request: "Caesar salad + bottled water at the turn", type: "Food", priority: "Normal" },
  { id: "r8", member: "Wesley Grant", hole: 9, request: "Slow group ahead — pace check requested", type: "Assistance", priority: "High" },
  { id: "r9", member: "Sandra Liu", hole: 7, request: "Extra towels — sprinkler overspray", type: "Assistance", priority: "Normal" },
  { id: "r10", member: "The Bennett Foursome", hole: 12, request: "2× clubhouse burgers, 4× draft beer", type: "Food", priority: "Normal" },
  { id: "r11", member: "Daniel Brooks", hole: 5, request: "Cart pickup — twisted ankle", type: "Cart", priority: "High" },
  { id: "r12", member: "Olivia Carter", hole: 4, request: "Arnold Palmer to the next tee", type: "Beverage", priority: "Normal" },
];

export type TaskPriority = "High" | "Medium" | "Low";

export interface StaffTask {
  id: string;
  label: string;
  due: string;
  done: boolean;
  priority?: TaskPriority;
}

export const initialTasks: StaffTask[] = [
  { id: "t1", label: "Re-stock beverage cart #2", due: "10:30 AM", done: false, priority: "High" },
  { id: "t2", label: "Mow & roll greens on back nine", due: "11:00 AM", done: false, priority: "Medium" },
  { id: "t3", label: "Confirm 8 tee times for tomorrow", due: "12:00 PM", done: true, priority: "Medium" },
  { id: "t4", label: "Prep clubhouse for 6pm wedding tasting", due: "2:00 PM", done: false, priority: "High" },
  { id: "t5", label: "Call back Olivia Carter (membership)", due: "3:00 PM", done: false, priority: "Medium" },
  { id: "t6", label: "Replace flagstick on hole 7", due: "9:45 AM", done: true, priority: "Low" },
  { id: "t7", label: "Rake all front-nine bunkers", due: "10:00 AM", done: true, priority: "Low" },
  { id: "t8", label: "Restock Pro Shop glove display", due: "11:30 AM", done: false, priority: "Low" },
  { id: "t9", label: "Send Member-Guest pairings to print", due: "1:00 PM", done: false, priority: "Medium" },
  { id: "t10", label: "Charge cart fleet overnight", due: "5:00 PM", done: false, priority: "Low" },
];

export interface ClubEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  spots: string;
  tag: string;
}

export const clubEvents: ClubEvent[] = [
  { id: "e1", title: "Member-Guest Invitational", date: "Jun 14", time: "8:00 AM", spots: "12 spots left", tag: "Tournament" },
  { id: "e2", title: "Sunset Wine & Dine", date: "Jun 18", time: "6:30 PM", spots: "Open", tag: "Dining" },
  { id: "e3", title: "Junior Golf Clinic", date: "Jun 21", time: "9:00 AM", spots: "5 spots left", tag: "Clinic" },
  { id: "e4", title: "Twilight Scramble", date: "Jun 27", time: "4:30 PM", spots: "Open", tag: "Social" },
  { id: "e5", title: "Ladies' League Opener", date: "Jul 2", time: "10:00 AM", spots: "8 spots left", tag: "League" },
  { id: "e6", title: "Independence Day BBQ", date: "Jul 4", time: "12:00 PM", spots: "Open", tag: "Dining" },
  { id: "e7", title: "Club Championship — Round 1", date: "Jul 12", time: "7:30 AM", spots: "Field set", tag: "Tournament" },
  { id: "e8", title: "Wine Pairing Dinner", date: "Jul 19", time: "7:00 PM", spots: "3 spots left", tag: "Dining" },
];

export const teeTimeSlots = [
  "6:40 AM", "7:00 AM", "7:20 AM", "7:40 AM", "8:00 AM", "8:20 AM",
  "9:10 AM", "9:30 AM", "10:00 AM", "11:20 AM", "1:50 PM", "3:30 PM",
];

export const diningSlots = ["5:30 PM", "6:00 PM", "6:30 PM", "7:00 PM", "7:30 PM", "8:00 PM"];

export const memberAccount = {
  name: "James Whitmore",
  memberSince: "2019",
  tier: "Elite Club",
  number: "FW-10428",
  balance: 142.5,
  handicap: 8.4,
  roundsThisYear: 37,
  payments: [
    { id: "p1", label: "Monthly Membership", date: "Jun 1", amount: 350.0 },
    { id: "p2", label: "Pro Shop — FootJoy gloves", date: "May 28", amount: 64.0 },
    { id: "p3", label: "Dining — Sunset Grill", date: "May 22", amount: 78.5 },
    { id: "p4", label: "Cart rental (×4)", date: "May 19", amount: 60.0 },
    { id: "p5", label: "On-course F&B — Beverage Cart", date: "May 17", amount: 34.0 },
    { id: "p6", label: "Lesson — Short Game w/ Coach Reyes", date: "May 12", amount: 120.0 },
    { id: "p7", label: "Pro Shop — Titleist Pro V1 (2 dozen)", date: "May 8", amount: 110.0 },
    { id: "p8", label: "Guest fees (×2)", date: "May 3", amount: 180.0 },
  ],
};

export const memberUpcoming = [
  { id: "u1", label: "Tee Time — Foursome", date: "Tomorrow", time: "7:10 AM" },
  { id: "u2", label: "Sunset Wine & Dine", date: "Jun 18", time: "6:30 PM" },
  { id: "u3", label: "Lesson — Short Game w/ Coach Reyes", date: "Jun 20", time: "9:00 AM" },
  { id: "u4", label: "Member-Guest Invitational", date: "Jun 14", time: "8:00 AM" },
  { id: "u5", label: "Tee Time — Twosome", date: "Jun 22", time: "8:40 AM" },
];

export const clubAnnouncements = [
  { id: "an1", tag: "Course", title: "Back nine aeration complete — greens running fast", date: "Jun 7" },
  { id: "an2", tag: "Event", title: "Member-Guest Invitational — registration now open", date: "Jun 5" },
  { id: "an3", tag: "Dining", title: "New summer tasting menu launches at Sunset Grill", date: "Jun 2" },
  { id: "an4", tag: "Course", title: "Cart path repaving on holes 4–6 — expect detours", date: "Jun 1" },
  { id: "an5", tag: "Pro Shop", title: "New 2026 driver fittings now booking with Coach Reyes", date: "May 29" },
  { id: "an6", tag: "Event", title: "Ladies' League sign-ups close Jun 28", date: "May 27" },
  { id: "an7", tag: "Dining", title: "Sunday brunch returns to the Veranda — reservations open", date: "May 24" },
  { id: "an8", tag: "Course", title: "Range nets replaced — full bay availability restored", date: "May 21" },
];

export const conciergeSuggestions = [
  "When is my next tee time?",
  "What's good on the menu today?",
  "What's my account balance?",
  "Any events this weekend?",
];

// ---- Food & Beverage service (staff/workers portal) ----

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: "Drinks" | "Food" | "Snacks";
  image: string;
}

export const menuItems: MenuItem[] = [
  { id: "d1", name: "Iced Tea", price: 4, category: "Drinks", image: m_d1 },
  { id: "d2", name: "Lemonade", price: 4, category: "Drinks", image: m_d2 },
  { id: "d3", name: "Bottled Water", price: 3, category: "Drinks", image: m_d3 },
  { id: "d4", name: "Cold Brew Coffee", price: 5, category: "Drinks", image: m_d4 },
  { id: "d5", name: "Draft Beer", price: 8, category: "Drinks", image: m_d5 },
  { id: "d6", name: "Arnold Palmer", price: 5, category: "Drinks", image: m_d6 },
  { id: "d7", name: "Bloody Mary", price: 11, category: "Drinks", image: m_d7 },
  { id: "d8", name: "Soda", price: 3, category: "Drinks", image: m_d8 },
  { id: "f1", name: "Turkey Club", price: 13, category: "Food", image: m_f1 },
  { id: "f2", name: "Clubhouse Burger", price: 15, category: "Food", image: m_f2 },
  { id: "f3", name: "Grilled Chicken Wrap", price: 12, category: "Food", image: m_f3 },
  { id: "f4", name: "Caesar Salad", price: 11, category: "Food", image: m_f4 },
  { id: "f5", name: "All-Beef Hot Dog", price: 7, category: "Food", image: m_f5 },
  { id: "f6", name: "BLT Sandwich", price: 10, category: "Food", image: m_f6 },
  { id: "s1", name: "Trail Mix", price: 4, category: "Snacks", image: m_s1 },
  { id: "s2", name: "Kettle Chips", price: 3, category: "Snacks", image: m_s2 },
  { id: "s3", name: "Fresh Fruit Cup", price: 5, category: "Snacks", image: m_s3 },
  { id: "s4", name: "Granola Bar", price: 3, category: "Snacks", image: m_s4 },
];

export interface OrderLine {
  itemId: string;
  name: string;
  price: number;
  qty: number;
}

// ---- Workforce (supervisor + employees portals) ----

export type ShiftStatus = "On Shift" | "On Break" | "Clocked Out" | "Off Today";

export interface TeamMember {
  id: string;
  name: string;
  initials: string;
  role: string;
  status: ShiftStatus;
  shift: string;
  area: string;
  tasksOpen: number;
}

export const teamMembers: TeamMember[] = [
  { id: "tm1", name: "Maria Santos", initials: "MS", role: "F&B Server", status: "On Shift", shift: "6:00 AM – 2:00 PM", area: "Beverage Cart 2", tasksOpen: 2 },
  { id: "tm2", name: "Devon Clark", initials: "DC", role: "Kitchen", status: "On Shift", shift: "5:30 AM – 1:30 PM", area: "Clubhouse Kitchen", tasksOpen: 1 },
  { id: "tm3", name: "Aisha Khan", initials: "AK", role: "Cart Attendant", status: "On Break", shift: "7:00 AM – 3:00 PM", area: "Front Nine", tasksOpen: 0 },
  { id: "tm4", name: "Tyler Brooks", initials: "TB", role: "Grounds", status: "On Shift", shift: "5:00 AM – 1:00 PM", area: "Back Nine Greens", tasksOpen: 3 },
  { id: "tm5", name: "Nina Alvarez", initials: "NA", role: "Pro Shop", status: "On Shift", shift: "8:00 AM – 4:00 PM", area: "Pro Shop", tasksOpen: 1 },
  { id: "tm6", name: "Grant Wesley", initials: "GW", role: "Marshal", status: "Off Today", shift: "—", area: "—", tasksOpen: 0 },
  { id: "tm7", name: "Riley Cooper", initials: "RC", role: "F&B Server", status: "Clocked Out", shift: "Ended 2:00 PM", area: "Sunset Grill", tasksOpen: 0 },
];

export interface Shift {
  id: string;
  day: string;
  date: string;
  time: string;
  role: string;
  status: "Today" | "Upcoming";
}

export const employeeShifts: Shift[] = [
  { id: "sh1", day: "Today", date: "Jun 13", time: "6:00 AM – 2:00 PM", role: "Beverage Cart 2", status: "Today" },
  { id: "sh2", day: "Sunday", date: "Jun 14", time: "6:00 AM – 2:00 PM", role: "Beverage Cart 1", status: "Upcoming" },
  { id: "sh3", day: "Tuesday", date: "Jun 16", time: "10:00 AM – 6:00 PM", role: "Sunset Grill", status: "Upcoming" },
  { id: "sh4", day: "Wednesday", date: "Jun 17", time: "6:00 AM – 2:00 PM", role: "Beverage Cart 2", status: "Upcoming" },
  { id: "sh5", day: "Friday", date: "Jun 19", time: "7:00 AM – 3:00 PM", role: "Clubhouse Kitchen", status: "Upcoming" },
  { id: "sh6", day: "Saturday", date: "Jun 20", time: "6:00 AM – 2:00 PM", role: "Beverage Cart 2", status: "Upcoming" },
  { id: "sh7", day: "Sunday", date: "Jun 21", time: "11:00 AM – 7:00 PM", role: "Sunset Grill", status: "Upcoming" },
  { id: "sh8", day: "Tuesday", date: "Jun 23", time: "6:00 AM – 2:00 PM", role: "Beverage Cart 1", status: "Upcoming" },
];

export type TimeOffStatus = "Pending" | "Approved" | "Denied";

export interface TimeOffRequest {
  id: string;
  dates: string;
  reason: string;
  status: TimeOffStatus;
  submitted: string;
}

export const timeOffRequests: TimeOffRequest[] = [
  { id: "to1", dates: "Jun 20 – Jun 22", reason: "Family event", status: "Approved", submitted: "May 30" },
  { id: "to2", dates: "Jul 4", reason: "Holiday weekend", status: "Pending", submitted: "Jun 6" },
  { id: "to3", dates: "Jun 28", reason: "Doctor appointment", status: "Approved", submitted: "Jun 4" },
  { id: "to4", dates: "Jul 10 – Jul 14", reason: "Summer vacation", status: "Pending", submitted: "Jun 9" },
  { id: "to5", dates: "Jun 16", reason: "Personal day", status: "Denied", submitted: "Jun 2" },
  { id: "to6", dates: "Aug 1 – Aug 3", reason: "Wedding (out of state)", status: "Pending", submitted: "Jun 11" },
];

export const employeeAccount = {
  name: "Maria Santos",
  initials: "MS",
  role: "F&B Server",
  employeeNo: "EMP-2048",
  shift: "6:00 AM – 2:00 PM",
  station: "Beverage Cart 2",
  hoursThisWeek: 28,
  hoursTarget: 40,
};

export const supervisorAccount = {
  name: "Carlos Mendez",
  initials: "CM",
  role: "Operations Manager",
};
