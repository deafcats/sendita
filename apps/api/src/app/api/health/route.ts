import { NextResponse } from 'next/server';
import { getReplicaClient } from '@anon-inbox/db';
import { getRedisClient } from '@/lib/redis';
import { sql } from 'drizzle-orm';

export async function GET(): Promise<NextResponse> {
  const checks: Record<string, 'ok' | 'error'> = {};

  try {
    const db = getReplicaClient();
    await db.execute(sql`SELECT 1`);
    checks['database'] = 'ok';
  } catch {
    checks['database'] = 'error';
  }

  try {
    const redis = getRedisClient();
    await redis.ping();
    checks['redis'] = 'ok';
  } catch {
    checks['redis'] = 'error';
  }

  const allOk = Object.values(checks).every((v) => v === 'ok');
  return NextResponse.json(
    { status: allOk ? 'ok' : 'degraded', checks },
    { status: allOk ? 200 : 503 },
  );
}
