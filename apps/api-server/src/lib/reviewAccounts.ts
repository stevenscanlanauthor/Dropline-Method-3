import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { db, usersTable, entitlementsTable, inviteCodesTable } from '@dropline/db';
import { and, eq, sql } from 'drizzle-orm';
import { grantPaidAllPlatforms, TRIAL_DAYS } from './entitlement';

export const APPLE_REVIEW_EMAIL = 'apple-review@droplinemethod.com';
export const APPLE_REVIEW_EXPIRED_EMAIL = 'apple-review-expired@droplinemethod.com';
export const APPLE_REVIEW_INVITE_CODE = 'APPLEMAS2026';

export async function ensureAppleReviewInviteCode(): Promise<void> {
  const existing = await db
    .select({ code: inviteCodesTable.code })
    .from(inviteCodesTable)
    .where(eq(inviteCodesTable.code, APPLE_REVIEW_INVITE_CODE))
    .limit(1);
  if (existing[0]) return;
  await db.insert(inviteCodesTable).values({
    code: APPLE_REVIEW_INVITE_CODE,
    note: 'App Review invite (trial only)',
    grantsBillingExempt: false,
    isActive: true,
    createdAt: new Date(),
  });
}

export async function ensureAppleReviewAccount(): Promise<void> {
  const password = process.env.APPLE_REVIEW_PASSWORD?.trim();
  if (!password) return;

  const now = new Date();
  const passwordHash = await bcrypt.hash(password, 12);
  const existing = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, APPLE_REVIEW_EMAIL))
    .limit(1);

  let userId: string;
  if (!existing[0]) {
    userId = uuidv4();
    await db.insert(usersTable).values({
      id: userId,
      email: APPLE_REVIEW_EMAIL,
      passwordHash,
      displayName: 'Apple Review',
      isAdmin: false,
      isDisabled: false,
      emailVerifiedAt: now,
      tokenVersion: 0,
      lastActiveAt: now,
      createdAt: now,
      updatedAt: now,
    });
  } else {
    userId = existing[0].id;
    await db
      .update(usersTable)
      .set({
        passwordHash,
        emailVerifiedAt: sql`COALESCE(${usersTable.emailVerifiedAt}, ${now})`,
        isDisabled: false,
        accessRevokedAt: null,
        tokenVersion: sql`${usersTable.tokenVersion} + 1`,
        updatedAt: now,
      })
      .where(eq(usersTable.id, userId));
  }

  await grantPaidAllPlatforms({
    userId,
    source: 'admin_grant',
    externalId: 'apple-review-exempt',
  });
  console.log(`[bootstrap] Apple review account ready: ${APPLE_REVIEW_EMAIL}`);
}

export async function ensureAppleReviewExpiredAccount(): Promise<void> {
  const password = process.env.APPLE_REVIEW_EXPIRED_PASSWORD?.trim();
  if (!password) return;

  const now = new Date();
  const passwordHash = await bcrypt.hash(password, 12);
  const expiredTrialEndsAt = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const existing = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, APPLE_REVIEW_EXPIRED_EMAIL))
    .limit(1);

  let userId: string;
  if (!existing[0]) {
    userId = uuidv4();
    await db.insert(usersTable).values({
      id: userId,
      email: APPLE_REVIEW_EXPIRED_EMAIL,
      passwordHash,
      displayName: 'Apple Review Expired',
      isAdmin: false,
      isDisabled: false,
      emailVerifiedAt: now,
      tokenVersion: 0,
      lastActiveAt: now,
      createdAt: new Date(now.getTime() - (TRIAL_DAYS + 1) * 24 * 60 * 60 * 1000),
      updatedAt: now,
    });
  } else {
    userId = existing[0].id;
    await db
      .update(usersTable)
      .set({
        passwordHash,
        emailVerifiedAt: sql`COALESCE(${usersTable.emailVerifiedAt}, ${now})`,
        isDisabled: false,
        accessRevokedAt: null,
        tokenVersion: sql`${usersTable.tokenVersion} + 1`,
        updatedAt: now,
      })
      .where(eq(usersTable.id, userId));
  }

  // Ensure expired trial on all platforms, no paid access
  for (const platform of ['web', 'ios', 'macos'] as const) {
    const [row] = await db
      .select()
      .from(entitlementsTable)
      .where(and(eq(entitlementsTable.userId, userId), eq(entitlementsTable.platform, platform)))
      .limit(1);
    if (row) {
      await db
        .update(entitlementsTable)
        .set({
          source: 'trial',
          trialExpiresAt: expiredTrialEndsAt,
          paidAt: null,
          revokedAt: null,
          revokedReason: null,
          externalId: null,
        })
        .where(eq(entitlementsTable.id, row.id));
    } else {
      await db.insert(entitlementsTable).values({
        userId,
        platform,
        source: 'trial',
        trialExpiresAt: expiredTrialEndsAt,
        paidAt: null,
      });
    }
  }
  console.log(`[bootstrap] Apple review expired account ready: ${APPLE_REVIEW_EXPIRED_EMAIL}`);
}
