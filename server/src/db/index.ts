import { config, usePostgres } from '../config.js';
import * as schema from './schema.js';

// We support two drivers behind one identical Drizzle API:
//   - node-postgres  → when DATABASE_URL is a real postgres:// connection (production / docker)
//   - PGlite (WASM)  → embedded, file-backed Postgres for local development (no server needed)
type Db = import('drizzle-orm/node-postgres').NodePgDatabase<typeof schema>;

let db: Db;
let closeDb: () => Promise<void>;

if (usePostgres) {
  const { drizzle } = await import('drizzle-orm/node-postgres');
  const pg = (await import('pg')).default;
  const pool = new pg.Pool({ connectionString: config.DATABASE_URL });
  db = drizzle(pool, { schema }) as unknown as Db;
  closeDb = async () => {
    await pool.end();
  };
  console.log('[db] using node-postgres');
} else {
  const { drizzle } = await import('drizzle-orm/pglite');
  const { PGlite } = await import('@electric-sql/pglite');
  const client = new PGlite(config.PGLITE_DATA_DIR);
  db = drizzle(client, { schema }) as unknown as Db;
  closeDb = async () => {
    await client.close();
  };
  console.log(`[db] using PGlite (embedded) at ${config.PGLITE_DATA_DIR}`);
}

export { db, closeDb, schema };
