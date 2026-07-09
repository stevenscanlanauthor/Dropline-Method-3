import { and, eq, sql } from 'drizzle-orm';
import {
  db,
  inviteCodesTable,
  accessCodesTable,
  accessCodeRedemptionsTable,
} from '@dropline/db';
import { grantPaidAllPlatforms, userHasPaidAnywhere } from './entitlement';

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export function normalizeAccessCode(code: string): string {
  return code.trim().toUpperCase();
}

export function getAccessCodeMaxRedemptions(accessCode: { maxRedemptions: number | null }): number {
  const max = accessCode.maxRedemptions ?? 1;
  return max > 0 ? max : 1;
}

export function isAccessCodeUsedUp(accessCode: {
  maxRedemptions: number | null;
  redemptionCount: number;
}): boolean {
  return accessCode.redemptionCount >= getAccessCodeMaxRedemptions(accessCode);
}

export function validateAccessCodeForUse(
  accessCode: typeof accessCodesTable.$inferSelect | undefined,
): string | null {
  if (!accessCode || !accessCode.isActive) return 'Invalid or inactive code';
  if (accessCode.expiresAt && accessCode.expiresAt <= new Date()) return 'This code has expired';
  if (isAccessCodeUsedUp(accessCode)) return 'This code has already been used';
  return null;
}

export type RegistrationCodeResolution =
  | { ok: false; error: string }
  | { ok: true; grantsFreeAccess: true; kind: 'invite' | 'access'; code: string }
  | { ok: true; grantsFreeAccess: false; kind: 'invite'; code: string };

export async function resolveRegistrationCode(rawCode: string): Promise<RegistrationCodeResolution> {
  const code = normalizeAccessCode(rawCode);
  if (!code) return { ok: false, error: 'Sign-up code is required' };

  const invite = await db.select().from(inviteCodesTable).where(eq(inviteCodesTable.code, code)).limit(1);
  if (invite[0]) {
    if (!invite[0].isActive || invite[0].usedAt !== null) {
      return { ok: false, error: 'Invalid or already used sign-up code' };
    }
    if (invite[0].grantsBillingExempt) {
      return { ok: true, grantsFreeAccess: true, kind: 'invite', code };
    }
    return { ok: true, grantsFreeAccess: false, kind: 'invite', code };
  }

  const access = await db.select().from(accessCodesTable).where(eq(accessCodesTable.code, code)).limit(1);
  const accessError = validateAccessCodeForUse(access[0]);
  if (access[0] && !accessError) {
    return { ok: true, grantsFreeAccess: true, kind: 'access', code };
  }
  return { ok: false, error: accessError ?? 'Invalid or already used sign-up code' };
}

export async function recordAccessCodeRedemption(
  tx: Tx,
  code: string,
  userId: string,
  now: Date,
): Promise<void> {
  const updated = await tx
    .update(accessCodesTable)
    .set({
      redemptionCount: sql`${accessCodesTable.redemptionCount} + 1`,
      isActive: false,
    })
    .where(
      and(
        eq(accessCodesTable.code, code),
        eq(accessCodesTable.isActive, true),
        sql`${accessCodesTable.redemptionCount} < COALESCE(NULLIF(${accessCodesTable.maxRedemptions}, 0), 1)`,
      ),
    )
    .returning({ code: accessCodesTable.code });

  if (!updated[0]) throw new Error('CODE_ALREADY_USED');

  await tx.insert(accessCodeRedemptionsTable).values({
    code,
    userId,
    redeemedAt: now,
  });
}

export async function consumeRegistrationCode(
  tx: Tx,
  resolution: Extract<RegistrationCodeResolution, { ok: true }>,
  userId: string,
  now: Date,
): Promise<void> {
  if (resolution.kind === 'invite') {
    await tx
      .update(inviteCodesTable)
      .set({ usedAt: now, usedByUserId: userId, isActive: false })
      .where(eq(inviteCodesTable.code, resolution.code));
    return;
  }
  await recordAccessCodeRedemption(tx, resolution.code, userId, now);
}

export async function redeemAccessCodeForUser(
  userId: string,
  rawCode: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const code = normalizeAccessCode(rawCode);
  if (!code) return { ok: false, error: 'Access code is required' };

  if (await userHasPaidAnywhere(userId)) {
    return { ok: false, error: 'Your account already has full access.' };
  }

  const codeRows = await db.select().from(accessCodesTable).where(eq(accessCodesTable.code, code)).limit(1);
  const accessCode = codeRows[0];
  const validationError = validateAccessCodeForUse(accessCode);
  if (validationError) return { ok: false, error: validationError };

  const prior = await db
    .select({ id: accessCodeRedemptionsTable.id })
    .from(accessCodeRedemptionsTable)
    .where(and(eq(accessCodeRedemptionsTable.code, code), eq(accessCodeRedemptionsTable.userId, userId)))
    .limit(1);
  if (prior[0]) return { ok: false, error: 'You have already redeemed this access code' };

  const now = new Date();
  try {
    await db.transaction(async tx => {
      await recordAccessCodeRedemption(tx, code, userId, now);
    });
    await grantPaidAllPlatforms({ userId, source: 'admin_grant', externalId: `access:${code}` });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('unique') || msg.includes('duplicate')) {
      return { ok: false, error: 'You have already redeemed this code' };
    }
    if (msg.includes('CODE_ALREADY_USED')) {
      return { ok: false, error: 'This code has already been used' };
    }
    throw err;
  }
  return { ok: true };
}
