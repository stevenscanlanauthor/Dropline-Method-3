import {
  pgTable,
  text,
  timestamp,
  serial,
  integer,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { usersTable } from './users';
import type { Platform, EntitlementSource } from './entitlements';

export const purchasesTable = pgTable(
  'purchases',
  {
    id: serial('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),
    platform: text('platform').$type<Platform>().notNull(),
    source: text('source').$type<EntitlementSource>().notNull(),
    amountCents: integer('amount_cents').notNull().default(0),
    currency: text('currency').notNull().default('USD'),
    externalId: text('external_id'),
    occurredAt: timestamp('occurred_at').notNull().defaultNow(),
  },
  t => [
    index('purchases_user_idx').on(t.userId, t.occurredAt),
    uniqueIndex('purchases_external_id_unique').on(t.externalId),
  ],
);

export type Purchase = typeof purchasesTable.$inferSelect;
