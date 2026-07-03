import type { Platform } from '@dropline/db';

export function parsePlatform(value: unknown): Platform | null {
  if (value === 'ios' || value === 'web' || value === 'macos') return value;
  return null;
}

export function platformFromRequest(req: { headers: Record<string, unknown> }): Platform {
  const header = req.headers['x-platform'];
  if (typeof header === 'string') {
    const p = parsePlatform(header.toLowerCase());
    if (p) return p;
  }
  const ua = req.headers['user-agent'];
  if (typeof ua === 'string' && ua.includes('Dropline/MacAppStore')) return 'macos';
  return 'web';
}
