import { customAlphabet } from 'nanoid';
import { SLUG_ALPHABET, SLUG_LENGTH, RESERVED_SLUGS, VANITY_SLUG_MIN_LENGTH } from '@anon-inbox/shared';

const generate = customAlphabet(SLUG_ALPHABET, SLUG_LENGTH);
const VANITY_SLUG_MAX_LENGTH = 20;

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
  return input.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, VANITY_SLUG_MAX_LENGTH);
}

function trimSlugPart(value: string): string {
  return value.replace(/^-+|-+$/g, '');
}

export function buildUsernameSuggestionCandidates(input: string): string[] {
  const sanitized = sanitizeSlugInput(input);
  const normalized = trimSlugPart(sanitized);
  const base = normalized.length >= VANITY_SLUG_MIN_LENGTH ? normalized : 'creator';
  const variants = [
    base,
    `${base}-live`,
    `${base}-tv`,
    `${base}-hq`,
    `${base}-stream`,
    `${base}1`,
    `${base}7`,
    `${base}10`,
    `${base}live`,
    `${base}tv`,
  ];

  return Array.from(
    new Set(
      variants
        .map((candidate) => trimSlugPart(candidate).slice(0, VANITY_SLUG_MAX_LENGTH))
        .filter((candidate) => candidate.length > 0 && isValidVanitySlug(candidate)),
    ),
  );
}
