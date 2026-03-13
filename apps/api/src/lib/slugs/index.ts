import { customAlphabet } from 'nanoid';
import { SLUG_ALPHABET, SLUG_LENGTH, RESERVED_SLUGS, VANITY_SLUG_MIN_LENGTH } from '@anon-inbox/shared';

const generate = customAlphabet(SLUG_ALPHABET, SLUG_LENGTH);

export function generateSlug(): string {
  return generate();
}

export function isReservedSlug(slug: string): boolean {
  const lower = slug.toLowerCase();
  return (RESERVED_SLUGS as readonly string[]).includes(lower);
}

export function isValidVanitySlug(slug: string): boolean {
  if (slug.length < VANITY_SLUG_MIN_LENGTH) return false;
  if (isReservedSlug(slug)) return false;
  // Only alphanumeric and hyphens allowed; no leading/trailing hyphens
  if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(slug) && slug.length > 1) return false;
  if (!/^[a-z0-9]+$/.test(slug) && slug.length === 1) return false;
  return true;
}

export function sanitizeSlugInput(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 20);
}
