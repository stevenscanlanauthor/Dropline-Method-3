import { pgTable, text, timestamp, integer, uuid, uniqueIndex, boolean } from 'drizzle-orm/pg-core';
import { usersTable } from './users';

export const accessCodesTable = pgTable('access_codes', {
  code: text('code').primaryKey(),
  note: text('note'),
  maxRedemptions: integer('max_redemptions').notNull().default(1),
  redemptionCount: integer('redemption_count').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const accessCodeRedemptionsTable = pgTable(
  'access_code_redemptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    code: text('code')
      .notNull()
      .references(() => accessCodesTable.code, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),
    redeemedAt: timestamp('redeemed_at').defaultNow().notNull(),
  },
  t => [uniqueIndex('access_code_redemptions_code_user_idx').on(t.code, t.userId)],
);

export type AccessCode = typeof accessCodesTable.$inferSelect;
export type AccessCodeRedemption = typeof accessCodeRedemptionsTable.$inferSelect;
