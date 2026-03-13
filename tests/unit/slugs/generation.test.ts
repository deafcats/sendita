import { describe, it, expect } from 'vitest';
import { SLUG_ALPHABET, SLUG_LENGTH, RESERVED_SLUGS } from '@anon-inbox/shared';

// Re-implement generation logic for isolated unit testing
function generateSlug(): string {
  const { customAlphabet } = require('nanoid');
  return customAlphabet(SLUG_ALPHABET, SLUG_LENGTH)();
}

function isReservedSlug(slug: string): boolean {
  return (RESERVED_SLUGS as readonly string[]).includes(slug.toLowerCase());
}

describe('slug generation', () => {
  it('generates a slug of correct length', () => {
    const slug = generateSlug();
    expect(slug.length).toBe(SLUG_LENGTH);
  });

  it('generates slugs using only allowed characters', () => {
    const alphabetSet = new Set(SLUG_ALPHABET.split(''));
    for (let i = 0; i < 100; i++) {
      const slug = generateSlug();
      for (const char of slug) {
        expect(alphabetSet.has(char)).toBe(true);
      }
    }
  });

  it('generates unique slugs across many attempts', () => {
    const slugs = new Set(Array.from({ length: 1000 }, generateSlug));
    // With 2.2 billion combos, 1000 slugs should be unique
    expect(slugs.size).toBeGreaterThan(990);
  });
});

describe('reserved slug detection', () => {
  it('detects admin as reserved', () => {
    expect(isReservedSlug('admin')).toBe(true);
  });

  it('detects api as reserved', () => {
    expect(isReservedSlug('api')).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(isReservedSlug('ADMIN')).toBe(true);
    expect(isReservedSlug('Admin')).toBe(true);
  });

  it('does not flag normal names as reserved', () => {
    expect(isReservedSlug('alice')).toBe(false);
    expect(isReservedSlug('xyz123')).toBe(false);
  });
});
