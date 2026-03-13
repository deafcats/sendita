import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index';

function createClient(url: string) {
  const sql = postgres(url, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  });
  return drizzle(sql, { schema });
}

type DbClient = ReturnType<typeof createClient>;

let primaryClient: DbClient | null = null;
let replicaClient: DbClient | null = null;

// Primary client (reads + writes) — singleton per process
export function getPrimaryClient(): DbClient {
  if (!primaryClient) {
    const url = process.env['DATABASE_URL'];
    if (!url) throw new Error('DATABASE_URL is not set');
    primaryClient = createClient(url);
  }
  return primaryClient;
}

// Replica client (reads only) — singleton per process
export function getReplicaClient(): DbClient {
  if (!replicaClient) {
    const url =
      process.env['DATABASE_URL_REPLICA'] ?? process.env['DATABASE_URL'];
    if (!url) throw new Error('DATABASE_URL is not set');
    replicaClient = createClient(url);
  }
  return replicaClient;
}

export type DbClient = ReturnType<typeof getPrimaryClient>;

export { schema };
