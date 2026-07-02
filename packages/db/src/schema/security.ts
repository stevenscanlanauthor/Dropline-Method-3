import { pgTable, text, timestamp, boolean, uuid, index } from 'drizzle-orm/pg-core';
import { usersTable } from './users';

export const loginEventsTable = pgTable('login_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').references(() => usersTable.id, { onDelete: 'set null' }),
  emailAttempted: text('email_attempted').notNull(),
  ipAddress: text('ip_address').notNull(),
  succeeded: boolean('succeeded').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [
  index('login_events_user_id_created_at_idx').on(t.userId, t.createdAt),
  index('login_events_email_created_at_idx').on(t.emailAttempted, t.createdAt),
]);

export const blockedIpsTable = pgTable('blocked_ips', {
  ip: text('ip').primaryKey(),
  note: text('note'),
  blockedAt: timestamp('blocked_at').defaultNow().notNull(),
  blockedByUserId: text('blocked_by_user_id'),
});

export const adminAlertsTable = pgTable('admin_alerts', {
  id: uuid('id').primaryKey().defaultRandom(),
  type: text('type').notNull(),
  message: text('message').notNull(),
  metadata: text('metadata'),
  isRead: boolean('is_read').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type LoginEvent = typeof loginEventsTable.$inferSelect;
export type BlockedIp = typeof blockedIpsTable.$inferSelect;
export type AdminAlert = typeof adminAlertsTable.$inferSelect;
