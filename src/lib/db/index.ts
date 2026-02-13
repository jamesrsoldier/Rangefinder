import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Mock mode is only allowed in non-production environments
const isMockMode = process.env.USE_MOCK_ENGINE === 'true' && process.env.NODE_ENV !== 'production';

// Use globalThis to persist across HMR reloads in dev mode
const g = globalThis as unknown as {
  __rf_db?: ReturnType<typeof drizzle>;
  __rf_initDone?: boolean;
  __rf_initPromise?: Promise<void>;
};

if (!g.__rf_db) {
  if (isMockMode) {
    // PGlite: in-process PostgreSQL for mock/dev mode
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PGlite } = require('@electric-sql/pglite');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { drizzle: drizzlePglite } = require('drizzle-orm/pglite');
    const client = new PGlite();
    g.__rf_db = drizzlePglite(client, { schema }) as ReturnType<typeof drizzle>;

    // Run migrations + seed (queued in PGlite's internal FIFO queue)
    g.__rf_initPromise = (async () => {
      const { MIGRATION_SQL } = await import('./mock-migration-sql');
      await client.exec(MIGRATION_SQL);
      const { seedMockData } = await import('./mock-seed');
      await seedMockData(g.__rf_db!);
      g.__rf_initDone = true;
      console.log('[Rangefinder] Mock database initialized with seed data');
    })();
  } else {
    const connectionString = process.env.DATABASE_URL;
    if (connectionString) {
      const client = postgres(connectionString);
      g.__rf_db = drizzle(client, { schema });
    }
  }
}

export const db = g.__rf_db || null!;

export function getDb() {
  if (!g.__rf_db) throw new Error('Database not configured. Set DATABASE_URL env var.');
  return g.__rf_db;
}

/**
 * Wait for mock database initialization (migrations + seed).
 * Called from instrumentation.ts to ensure DB is ready before first request.
 * No-op in production mode.
 */
export async function waitForInit() {
  if (g.__rf_initPromise) {
    await g.__rf_initPromise;
  }
}
