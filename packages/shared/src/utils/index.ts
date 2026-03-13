import { createHash } from 'crypto';

export function hashIp(ip: string, salt: string): string {
  return createHash('sha256').update(ip + salt).digest('hex');
}

export function hashValue(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function normalizeUnicode(text: string): string {
  // NFC normalization
  let normalized = text.normalize('NFC');
  // Strip zero-width characters
  normalized = normalized.replace(/[\u200B-\u200D\uFEFF\u00AD]/g, '');
  // Strip RTL/LTR override characters
  normalized = normalized.replace(/[\u202A-\u202E\u2066-\u2069]/g, '');
  // Collapse excessive whitespace but preserve single spaces
  normalized = normalized.replace(/\s+/g, ' ').trim();
  return normalized;
}

export function isOnlyWhitespace(text: string): boolean {
  return normalizeUnicode(text).length === 0;
}

export function encodeCursor(data: { createdAt: Date; id: string }): string {
  return Buffer.from(JSON.stringify(data)).toString('base64url');
}

export function decodeCursor(
  cursor: string,
): { createdAt: Date; id: string } | null {
  try {
    const decoded = JSON.parse(Buffer.from(cursor, 'base64url').toString());
    return {
      createdAt: new Date(decoded.createdAt as string),
      id: decoded.id as string,
    };
  } catch {
    return null;
  }
}

export function parseUserAgent(ua: string): {
  deviceType: 'ios' | 'android' | 'desktop' | 'unknown';
  browser: string;
} {
  const lower = ua.toLowerCase();
  let deviceType: 'ios' | 'android' | 'desktop' | 'unknown' = 'unknown';

  if (/iphone|ipad|ipod/.test(lower)) {
    deviceType = 'ios';
  } else if (/android/.test(lower)) {
    deviceType = 'android';
  } else if (
    /windows|macintosh|linux/.test(lower) &&
    !/mobile/.test(lower)
  ) {
    deviceType = 'desktop';
  }

  let browser = 'unknown';
  if (/chrome/.test(lower) && !/edg/.test(lower)) browser = 'chrome';
  else if (/safari/.test(lower) && !/chrome/.test(lower)) browser = 'safari';
  else if (/firefox/.test(lower)) browser = 'firefox';
  else if (/edg/.test(lower)) browser = 'edge';

  return { deviceType, browser };
}

export function generateHints(metadata: {
  deviceType: string;
  userAgent: string;
  regionCountry: string | null;
  regionState: string | null;
  sendDelayMs: number | null;
  ownerCountry?: string | null;
  ownerState?: string | null;
  isRepeatSender?: boolean;
}): Record<string, string | boolean> {
  const hints: Record<string, string | boolean> = {};
  const ua = metadata.userAgent.toLowerCase();

  if (/iphone|ios/.test(ua)) {
    hints['device'] = 'iPhone';
  } else if (/android/.test(ua)) {
    hints['device'] = 'Android';
  } else if (metadata.deviceType === 'desktop') {
    hints['device'] = 'desktop';
  }

  if (
    metadata.regionCountry &&
    metadata.ownerCountry &&
    metadata.regionCountry === metadata.ownerCountry
  ) {
    if (
      metadata.regionState &&
      metadata.ownerState &&
      metadata.regionState === metadata.ownerState
    ) {
      hints['region'] = 'nearby';
    } else {
      hints['region'] = 'same_country';
    }
  }

  if (metadata.sendDelayMs !== null && metadata.sendDelayMs < 5000) {
    hints['fastSend'] = true;
  }

  if (metadata.isRepeatSender) {
    hints['repeatSender'] = true;
  }

  return hints;
}
