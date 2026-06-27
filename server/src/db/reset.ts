import { db, closeDb } from './index.js';
import {
  refreshTokens,
  notifications,
  maintenanceLogs,
  staffSchedules,
  tournamentEntries,
  tournaments,
  inventoryItems,
  posTransactions,
  bookings,
  teeTimes,
  members,
  users,
  clubs,
} from './schema.js';

// Truncate everything in FK-safe order. Useful before re-seeding.
async function run() {
  console.log('[reset] clearing all tables');
  await db.delete(refreshTokens);
  await db.delete(notifications);
  await db.delete(maintenanceLogs);
  await db.delete(staffSchedules);
  await db.delete(tournamentEntries);
  await db.delete(tournaments);
  await db.delete(inventoryItems);
  await db.delete(posTransactions);
  await db.delete(bookings);
  await db.delete(teeTimes);
  await db.delete(members);
  await db.delete(users);
  await db.delete(clubs);
  console.log('[reset] done');
  await closeDb();
}

run().catch((err) => {
  console.error('[reset] failed:', err);
  process.exit(1);
});
