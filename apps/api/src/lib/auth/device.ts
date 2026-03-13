import bcrypt from 'bcryptjs';
import { randomBytes, createHash } from 'crypto';

const BCRYPT_ROUNDS = 12;
const REFRESH_TOKEN_BYTES = 48;

export async function hashSecret(secret: string): Promise<string> {
  return bcrypt.hash(secret, BCRYPT_ROUNDS);
}

export async function verifySecret(
  secret: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(secret, hash);
}

export function generateRefreshToken(): string {
  return randomBytes(REFRESH_TOKEN_BYTES).toString('base64url');
}

export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function generateRecoveryCode(deviceSecret: string): string {
  const hash = createHash('sha256').update(deviceSecret).digest('hex');
  // Split into 8 groups of 8 hex chars → map to indices in a wordlist
  const segments = [];
  for (let i = 0; i < 8; i++) {
    segments.push(hash.slice(i * 8, i * 8 + 8));
  }
  // Return as a hyphen-separated code (production: map to BIP-39 words)
  return segments.join('-');
}
