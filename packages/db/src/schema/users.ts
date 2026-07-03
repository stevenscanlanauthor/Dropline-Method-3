import { pgTable, text, timestamp, boolean, integer, uniqueIndex } from 'drizzle-orm/pg-core';

export const usersTable = pgTable(
  'users',
  {
    id: text('id').primaryKey(),
    email: text('email').notNull(),
    passwordHash: text('password_hash'),
    appleSub: text('apple_sub'),
    displayName: text('display_name'),
    firstName: text('first_name'),
    lastName: text('last_name'),
    isAdmin: boolean('is_admin').notNull().default(false),
    isDisabled: boolean('is_disabled').notNull().default(false),
    accessRevokedAt: timestamp('access_revoked_at'),
    accessRevokedReason: text('access_revoked_reason'),
    tokenVersion: integer('token_version').notNull().default(0),
    lastActiveAt: timestamp('last_active_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  t => [
    uniqueIndex('users_email_idx').on(t.email),
    uniqueIndex('users_apple_sub_idx').on(t.appleSub),
  ],
);

export type User = typeof usersTable.$inferSelect;
export type InsertUser = typeof usersTable.$inferInsert;
