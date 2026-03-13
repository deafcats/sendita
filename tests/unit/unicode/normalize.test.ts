import { describe, it, expect } from 'vitest';
import { normalizeUnicode, isOnlyWhitespace } from '@anon-inbox/shared';

describe('normalizeUnicode', () => {
  it('applies NFC normalization', () => {
    // café with combining accent vs precomposed
    const combining = 'cafe\u0301';
    const precomposed = 'caf\u00E9';
    expect(normalizeUnicode(combining)).toBe(precomposed);
  });

  it('strips zero-width characters', () => {
    const withZeroWidth = 'hello\u200Bworld';
    expect(normalizeUnicode(withZeroWidth)).toBe('helloworld');
  });

  it('strips RTL override characters', () => {
    const withRTL = '\u202Ehello';
    expect(normalizeUnicode(withRTL)).toBe('hello');
  });

  it('strips soft hyphen (invisible separator)', () => {
    const withSoftHyphen = 'hel\u00ADlo';
    expect(normalizeUnicode(withSoftHyphen)).toBe('hello');
  });

  it('collapses excessive whitespace', () => {
    expect(normalizeUnicode('hello   world')).toBe('hello world');
  });

  it('trims leading and trailing whitespace', () => {
    expect(normalizeUnicode('  hello  ')).toBe('hello');
  });

  it('preserves normal text unchanged', () => {
    const text = 'Hello, this is a normal message!';
    expect(normalizeUnicode(text)).toBe(text);
  });

  it('handles empty string', () => {
    expect(normalizeUnicode('')).toBe('');
  });

  it('handles string of only zero-width chars becoming empty', () => {
    const invisible = '\u200B\u200C\u200D';
    expect(normalizeUnicode(invisible)).toBe('');
  });
});

describe('isOnlyWhitespace', () => {
  it('returns true for empty string', () => {
    expect(isOnlyWhitespace('')).toBe(true);
  });

  it('returns true for whitespace-only string', () => {
    expect(isOnlyWhitespace('   ')).toBe(true);
  });

  it('returns true for zero-width-only string', () => {
    expect(isOnlyWhitespace('\u200B\u200C')).toBe(true);
  });

  it('returns false for text with content', () => {
    expect(isOnlyWhitespace('hello')).toBe(false);
  });

  it('returns false for whitespace + content', () => {
    expect(isOnlyWhitespace('  hello  ')).toBe(false);
  });
});
