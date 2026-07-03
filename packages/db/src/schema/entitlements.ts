import { pgTable, text, timestamp, serial, uniqueIndex } from 'drizzle-orm/pg-core';
import { usersTable } from './users';

export const PLATFORMS = ['web', 'ios', 'macos'] as const;
export type Platform = (typeof PLATFORMS)[number];

export const SOURCES = ['trial', 'stripe', 'iap', 'admin_grant'] as const;
export type EntitlementSource = (typeof SOURCES)[number];

export const entitlementsTable = pgTable(
  'entitlements',
  {
    id: serial('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),
    platform: text('platform').$type<Platform>().notNull(),
    source: text('source').$type<EntitlementSource>().notNull(),
    grantedAt: timestamp('granted_at').notNull().defaultNow(),
    trialExpiresAt: timestamp('trial_expires_at'),
    paidAt: timestamp('paid_at'),
    externalId: text('external_id'),
    revokedAt: timestamp('revoked_at'),
    revokedReason: text('revoked_reason'),
  },
  t => [uniqueIndex('entitlements_user_platform_idx').on(t.userId, t.platform)],
);

export type Entitlement = typeof entitlementsTable.$inferSelect;
