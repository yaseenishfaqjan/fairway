import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { db, closeDb } from './index.js';
import { usePostgres } from '../config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsFolder = path.resolve(__dirname, '../../drizzle');

async function run() {
  console.log(`[migrate] applying migrations from ${migrationsFolder}`);
  if (usePostgres) {
    const { migrate } = await import('drizzle-orm/node-postgres/migrator');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await migrate(db as any, { migrationsFolder });
  } else {
    const { migrate } = await import('drizzle-orm/pglite/migrator');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await migrate(db as any, { migrationsFolder });
  }
  console.log('[migrate] done');
  await closeDb();
}

run().catch((err) => {
  console.error('[migrate] failed:', err);
  process.exit(1);
});
