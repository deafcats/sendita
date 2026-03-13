import { describe, it, expect } from 'vitest';
import { generateHints } from '@anon-inbox/shared';

describe('generateHints', () => {
  const baseInput = {
    deviceType: 'unknown',
    userAgent: '',
    regionCountry: null,
    regionState: null,
    sendDelayMs: null,
    ownerCountry: null,
    ownerState: null,
    isRepeatSender: false,
  };

  it('detects iPhone from user agent', () => {
    const hints = generateHints({ ...baseInput, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)' });
    expect(hints['device']).toBe('iPhone');
  });

  it('detects iOS from user agent', () => {
    const hints = generateHints({ ...baseInput, userAgent: 'some iOS browser' });
    expect(hints['device']).toBe('iPhone');
  });

  it('detects Android from user agent', () => {
    const hints = generateHints({ ...baseInput, userAgent: 'Mozilla/5.0 (Linux; Android 14)' });
    expect(hints['device']).toBe('Android');
  });

  it('detects desktop from deviceType', () => {
    const hints = generateHints({ ...baseInput, deviceType: 'desktop', userAgent: 'Mozilla/5.0 (Macintosh)' });
    expect(hints['device']).toBe('desktop');
  });

  it('detects same country as owner', () => {
    const hints = generateHints({
      ...baseInput,
      regionCountry: 'US',
      ownerCountry: 'US',
    });
    expect(hints['region']).toBe('same_country');
  });

  it('detects nearby when same state as owner', () => {
    const hints = generateHints({
      ...baseInput,
      regionCountry: 'US',
      regionState: 'CA',
      ownerCountry: 'US',
      ownerState: 'CA',
    });
    expect(hints['region']).toBe('nearby');
  });

  it('does not add region hint when countries differ', () => {
    const hints = generateHints({
      ...baseInput,
      regionCountry: 'US',
      ownerCountry: 'GB',
    });
    expect(hints['region']).toBeUndefined();
  });

  it('detects fast send below 5000ms', () => {
    const hints = generateHints({ ...baseInput, sendDelayMs: 3000 });
    expect(hints['fastSend']).toBe(true);
  });

  it('does not flag fast send at or above 5000ms', () => {
    const hints = generateHints({ ...baseInput, sendDelayMs: 5000 });
    expect(hints['fastSend']).toBeUndefined();
  });

  it('detects repeat sender', () => {
    const hints = generateHints({ ...baseInput, isRepeatSender: true });
    expect(hints['repeatSender']).toBe(true);
  });

  it('returns empty hints for unknown inputs', () => {
    const hints = generateHints(baseInput);
    expect(Object.keys(hints).length).toBe(0);
  });
});
