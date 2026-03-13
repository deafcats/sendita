export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  requestId?: string;
  userId?: string;
  latencyMs?: number;
  statusCode?: number;
  path?: string;
  [key: string]: unknown;
}

// Structured JSON logger — never logs secrets
const REDACTED_KEYS = new Set([
  'password',
  'deviceSecret',
  'accessToken',
  'refreshToken',
  'ipHash',
  'fingerprintHash',
  'device_secret_hash',
  'refresh_token_hash',
  'encryption_key',
]);

function redact(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [
      k,
      REDACTED_KEYS.has(k) ? '[REDACTED]' : v,
    ]),
  );
}

export function log(level: LogLevel, entry: Omit<LogEntry, 'level'>): void {
  const { message, ...rest } = entry;
  const sanitized = redact(rest as Record<string, unknown>);
  const output = JSON.stringify({
    level,
    message,
    timestamp: new Date().toISOString(),
    ...sanitized,
  });

  if (level === 'error') {
    console.error(output);
  } else if (level === 'warn') {
    console.warn(output);
  } else {
    console.log(output);
  }
}

export const logger = {
  debug: (message: string, extra?: Record<string, unknown>) =>
    log('debug', { message, ...extra }),
  info: (message: string, extra?: Record<string, unknown>) =>
    log('info', { message, ...extra }),
  warn: (message: string, extra?: Record<string, unknown>) =>
    log('warn', { message, ...extra }),
  error: (message: string, extra?: Record<string, unknown>) =>
    log('error', { message, ...extra }),
};
