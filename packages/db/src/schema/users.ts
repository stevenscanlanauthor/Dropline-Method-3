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
    emailVerifiedAt: timestamp('email_verified_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  t => [
    uniqueIndex('users_email_idx').on(t.email),
    uniqueIndex('users_apple_sub_idx').on(t.appleSub),
  ],
);

export const passwordResetTokensTable = pgTable('password_reset_tokens', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  usedAt: timestamp('used_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type PasswordResetToken = typeof passwordResetTokensTable.$inferSelect;

export const emailVerificationTokensTable = pgTable('email_verification_tokens', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  usedAt: timestamp('used_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type EmailVerificationToken = typeof emailVerificationTokensTable.$inferSelect;

export const inviteCodesTable = pgTable('invite_codes', {
  code: text('code').primaryKey(),
  note: text('note'),
  grantsBillingExempt: boolean('grants_billing_exempt').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  usedAt: timestamp('used_at'),
  usedByUserId: text('used_by_user_id'),
  isActive: boolean('is_active').notNull().default(true),
});

export type InviteCode = typeof inviteCodesTable.$inferSelect;

export type User = typeof usersTable.$inferSelect;
export type InsertUser = typeof usersTable.$inferInsert;
