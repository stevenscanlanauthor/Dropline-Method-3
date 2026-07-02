import { db, usersTable } from '@dropline/db';
import { desc, eq, gte, sql } from 'drizzle-orm';

const TOUCH_THROTTLE_MS = 2 * 60 * 1000;
const lastTouchByUser = new Map<string, number>();
const DEFAULT_ACTIVE_WINDOW_MINUTES = 15;

export function getActiveUserWindowMs(): number {
  const mins = parseInt(process.env.ACTIVE_USER_WINDOW_MINUTES ?? String(DEFAULT_ACTIVE_WINDOW_MINUTES), 10);
  return (Number.isFinite(mins) && mins > 0 ? mins : DEFAULT_ACTIVE_WINDOW_MINUTES) * 60 * 1000;
}

export async function ensureUserActivityColumn(): Promise<void> {
  await db.execute(sql`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP
  `);
}

export interface AdminUserRow {
  id: string;
  email: string;
  displayName: string | null;
  isAdmin: boolean;
  isDisabled: boolean;
  createdAt: Date;
  lastActiveAt: Date | null;
  bookCount: number;
}

export async function touchUserActivity(userId: string): Promise<void> {
  const now = Date.now();
  const last = lastTouchByUser.get(userId) ?? 0;
  if (now - last < TOUCH_THROTTLE_MS) return;
  lastTouchByUser.set(userId, now);
  try {
    await db
      .update(usersTable)
      .set({ lastActiveAt: new Date(), updatedAt: new Date() })
      .where(eq(usersTable.id, userId));
  } catch {
    // non-fatal
  }
}
