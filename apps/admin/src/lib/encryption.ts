import { createDecipheriv } from 'crypto';

export function decrypt(ciphertext: string): string {
  const key = Buffer.from(process.env['ENCRYPTION_KEY'] ?? '', 'hex');
  const parts = ciphertext.split(':');
  if (parts.length !== 3) throw new Error('Invalid ciphertext');
  const [ivB64, tagB64, dataB64] = parts as [string, string, string];
  const iv = Buffer.from(ivB64, 'base64');
  const tag = Buffer.from(tagB64, 'base64');
  const data = Buffer.from(dataB64, 'base64');
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(data).toString('utf8') + decipher.final('utf8');
}
