import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import { randomUUID } from 'crypto';
import { getRedisClient } from '../redis';

export interface TokenPayload extends JWTPayload {
  sub: string; // userId
  jti: string; // JWT ID for blocklist
}

function getSecret() {
  const secret = process.env['JWT_SECRET'];
  if (!secret) throw new Error('JWT_SECRET is not set');
  return new TextEncoder().encode(secret);
}

export async function signAccessToken(userId: string, jti?: string): Promise<string> {
  const tokenJti = jti ?? randomUUID();
  return new SignJWT({ sub: userId, jti: tokenJti })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('15m')
    .setAudience('anon-inbox-api')
    .setIssuer('anon-inbox')
    .sign(getSecret());
}

export async function verifyAccessToken(token: string): Promise<TokenPayload> {
  const { payload } = await jwtVerify(token, getSecret(), {
    audience: 'anon-inbox-api',
    issuer: 'anon-inbox',
    algorithms: ['HS256'],
  });

  const jti = payload['jti'] as string;
  if (!jti) throw new Error('Missing jti claim');

  // Check blocklist
  const redis = getRedisClient();
  const blocked = await redis.get(`jwt:blocklist:${jti}`);
  if (blocked) throw new Error('Token has been revoked');

  return payload as TokenPayload;
}

export async function revokeToken(jti: string, expiresAt: Date): Promise<void> {
  const redis = getRedisClient();
  const ttlSeconds = Math.max(
    0,
    Math.floor((expiresAt.getTime() - Date.now()) / 1000),
  );
  if (ttlSeconds > 0) {
    await redis.setex(`jwt:blocklist:${jti}`, ttlSeconds, '1');
  }
}

export async function revokeAllUserTokens(userId: string): Promise<void> {
  // Used during JWT secret rotation or account deletion
  // Store a user-level revocation timestamp; all tokens issued before this are invalid
  const redis = getRedisClient();
  await redis.setex(
    `jwt:user-revoked:${userId}`,
    90 * 24 * 60 * 60, // 90 days (max refresh token lifetime)
    Date.now().toString(),
  );
}
