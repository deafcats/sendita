import { describe, it, expect } from 'vitest';
import { parseUserAgent, hashIp, hashValue } from '@anon-inbox/shared';

describe('parseUserAgent', () => {
  it('detects iOS device', () => {
    const { deviceType } = parseUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)');
    expect(deviceType).toBe('ios');
  });

  it('detects iPad as iOS', () => {
    const { deviceType } = parseUserAgent('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)');
    expect(deviceType).toBe('ios');
  });

  it('detects Android device', () => {
    const { deviceType } = parseUserAgent('Mozilla/5.0 (Linux; Android 14; Pixel 7)');
    expect(deviceType).toBe('android');
  });

  it('detects desktop Mac', () => {
    const { deviceType } = parseUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
    expect(deviceType).toBe('desktop');
  });

  it('detects desktop Windows', () => {
    const { deviceType } = parseUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64)');
    expect(deviceType).toBe('desktop');
  });

  it('returns unknown for empty UA', () => {
    const { deviceType } = parseUserAgent('');
    expect(deviceType).toBe('unknown');
  });

  it('detects Chrome browser', () => {
    const { browser } = parseUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    expect(browser).toBe('chrome');
  });

  it('detects Safari browser (not Chrome)', () => {
    const { browser } = parseUserAgent('Mozilla/5.0 (Macintosh) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15');
    expect(browser).toBe('safari');
  });
});

describe('hashIp', () => {
  it('produces a hex string', () => {
    const hash = hashIp('192.168.1.1', 'test-salt');
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('produces different hashes for same IP with different salts', () => {
    const h1 = hashIp('192.168.1.1', 'salt1');
    const h2 = hashIp('192.168.1.1', 'salt2');
    expect(h1).not.toBe(h2);
  });

  it('is consistent for same inputs', () => {
    const h1 = hashIp('10.0.0.1', 'same-salt');
    const h2 = hashIp('10.0.0.1', 'same-salt');
    expect(h1).toBe(h2);
  });

  it('is different for different IPs', () => {
    const h1 = hashIp('1.2.3.4', 'salt');
    const h2 = hashIp('5.6.7.8', 'salt');
    expect(h1).not.toBe(h2);
  });
});
