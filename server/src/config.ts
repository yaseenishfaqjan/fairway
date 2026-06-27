import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3001),
  // When DATABASE_URL is a postgres:// URL the server uses node-postgres.
  // Otherwise it falls back to an embedded PGlite database (no server required).
  DATABASE_URL: z.string().optional(),
  PGLITE_DATA_DIR: z.string().default('./.pgdata'),
  JWT_SECRET: z.string().min(16).default('dev_jwt_secret_change_me_in_production_0001'),
  JWT_REFRESH_SECRET: z
    .string()
    .min(16)
    .default('dev_jwt_refresh_secret_change_me_in_production_0002'),
  ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().default(7),
  CLIENT_URL: z.string().default('http://localhost:5173'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = parsed.data;

export const usePostgres = !!config.DATABASE_URL && /^postgres(ql)?:\/\//.test(config.DATABASE_URL);
