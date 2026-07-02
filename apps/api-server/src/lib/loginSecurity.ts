import { db, loginEventsTable, blockedIpsTable, adminAlertsTable } from '@dropline/db';
import { and, desc, eq, gte, or, sql } from 'drizzle-orm';

const DEFAULT_RATE_LIMIT_THRESHOLD = 5;
const DEFAULT_RATE_LIMIT_WINDOW_MINUTES = 10;

function getRateLimitConfig(): { threshold: number; windowMinutes: number } {
  const threshold = parseInt(process.env.FAILED_LOGIN_THRESHOLD ?? String(DEFAULT_RATE_LIMIT_THRESHOLD), 10);
  const windowMinutes = parseInt(process.env.FAILED_LOGIN_WINDOW_MINUTES ?? String(DEFAULT_RATE_LIMIT_WINDOW_MINUTES), 10);
  return {
    threshold: Number.isFinite(threshold) && threshold >= 1 ? threshold : DEFAULT_RATE_LIMIT_THRESHOLD,
    windowMinutes: Number.isFinite(windowMinutes) && windowMinutes >= 1 ? windowMinutes : DEFAULT_RATE_LIMIT_WINDOW_MINUTES,
  };
}

export async function isIpBlocked(ip: string): Promise<boolean> {
  const rows = await db.select({ ip: blockedIpsTable.ip }).from(blockedIpsTable).where(eq(blockedIpsTable.ip, ip)).limit(1);
  return rows.length > 0;
}

export async function checkLoginRateLimit(
  emailAttempted: string,
  ipAddress: string,
): Promise<{ blocked: boolean; retryAfterSeconds?: number }> {
  if (process.env.NODE_ENV === 'development') {
    return { blocked: false };
  }

  const { threshold, windowMinutes } = getRateLimitConfig();
  const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000);

  const recentFailures = await db
    .select({ createdAt: loginEventsTable.createdAt })
    .from(loginEventsTable)
    .where(
      and(
        or(
          eq(loginEventsTable.emailAttempted, emailAttempted),
          eq(loginEventsTable.ipAddress, ipAddress),
        ),
        eq(loginEventsTable.succeeded, false),
        gte(loginEventsTable.createdAt, windowStart),
      ),
    )
    .orderBy(loginEventsTable.createdAt);

  if (recentFailures.length >= threshold) {
    const oldest = recentFailures[0].createdAt;
    const retryAfterMs = oldest.getTime() + windowMinutes * 60 * 1000 - Date.now();
    return { blocked: true, retryAfterSeconds: Math.ceil(Math.max(retryAfterMs, 1000) / 1000) };
  }

  return { blocked: false };
}

async function maybeFireUnknownLoginAlert(): Promise<void> {
  try {
    const threshold = parseInt(process.env.UNKNOWN_LOGIN_ALERT_THRESHOLD ?? '10', 10);
    const windowMs = parseInt(process.env.UNKNOWN_LOGIN_ALERT_WINDOW_MS ?? '300000', 10);
    if (!Number.isFinite(threshold) || threshold < 1) return;

    const windowStart = new Date(Date.now() - windowMs);
    const recent = await db
      .select({ id: loginEventsTable.id })
      .from(loginEventsTable)
      .where(
        and(
          eq(loginEventsTable.succeeded, false),
          gte(loginEventsTable.createdAt, windowStart),
        ),
      )
      .limit(threshold + 1);

    if (recent.length < threshold) return;

    const cooldownMs = parseInt(process.env.UNKNOWN_LOGIN_ALERT_COOLDOWN_MS ?? '1800000', 10);
    const cooldownStart = new Date(Date.now() - cooldownMs);
    const existing = await db
      .select({ id: adminAlertsTable.id })
      .from(adminAlertsTable)
      .where(
        and(
          eq(adminAlertsTable.type, 'unknown_login_burst'),
          eq(adminAlertsTable.isRead, false),
          gte(adminAlertsTable.createdAt, cooldownStart),
        ),
      )
      .limit(1);
    if (existing[0]) return;

    await db.insert(adminAlertsTable).values({
      type: 'unknown_login_burst',
      message: `${threshold}+ failed login attempts in the last ${Math.round(windowMs / 60000)} minutes.`,
      metadata: JSON.stringify({ threshold, windowMs }),
    });
  } catch {
    // non-fatal
  }
}

export async function recordLoginEvent(
  userId: string | null,
  emailAttempted: string,
  ipAddress: string,
  succeeded: boolean,
): Promise<void> {
  try {
    await db.insert(loginEventsTable).values({ userId, emailAttempted, ipAddress, succeeded });
    if (!succeeded && userId === null) {
      await maybeFireUnknownLoginAlert();
    }
  } catch {
    // non-fatal
  }
}

export async function listRecentLoginEvents(limit = 100, query?: string) {
  const base = db
    .select({
      id: loginEventsTable.id,
      userId: loginEventsTable.userId,
      emailAttempted: loginEventsTable.emailAttempted,
      ipAddress: loginEventsTable.ipAddress,
      succeeded: loginEventsTable.succeeded,
      createdAt: loginEventsTable.createdAt,
    })
    .from(loginEventsTable);

  if (query?.trim()) {
    const q = `%${query.trim().toLowerCase()}%`;
    return base
      .where(
        or(
          sql`lower(${loginEventsTable.emailAttempted}) like ${q}`,
          sql`lower(${loginEventsTable.ipAddress}) like ${q}`,
        ),
      )
      .orderBy(desc(loginEventsTable.createdAt))
      .limit(limit);
  }

  return base.orderBy(desc(loginEventsTable.createdAt)).limit(limit);
}
