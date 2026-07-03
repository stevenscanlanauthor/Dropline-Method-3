import {
  db,
  entitlementsTable,
  type Platform,
  type Entitlement,
} from '@dropline/db';
import { and, eq } from 'drizzle-orm';

export const TRIAL_DAYS = Number(process.env.BILLING_TRIAL_DAYS ?? '14');

export type EntitlementStatus = {
  platform: Platform;
  status: 'trial' | 'paid' | 'expired' | 'none' | 'revoked';
  trialDaysRemaining: number | null;
  trialExpiresAt: string | null;
  paidAt: string | null;
  revokedAt?: string | null;
};

const ALL_PLATFORMS: Platform[] = ['web', 'ios', 'macos'];

export async function getEntitlement(
  userId: string,
  platform: Platform,
): Promise<Entitlement | undefined> {
  const [row] = await db
    .select()
    .from(entitlementsTable)
    .where(and(eq(entitlementsTable.userId, userId), eq(entitlementsTable.platform, platform)));
  return row;
}

export async function userHasPaidAnywhere(userId: string): Promise<boolean> {
  for (const platform of ALL_PLATFORMS) {
    const ent = await getEntitlement(userId, platform);
    if (ent?.paidAt && !ent.revokedAt) return true;
  }
  return false;
}

export async function ensureTrial(userId: string, platform: Platform): Promise<Entitlement> {
  const existing = await getEntitlement(userId, platform);
  if (existing) return existing;

  const anyTrial = await db
    .select()
    .from(entitlementsTable)
    .where(eq(entitlementsTable.userId, userId))
    .limit(1);
  const sharedExpiry =
    anyTrial[0]?.trialExpiresAt ??
    new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000);

  for (const p of ALL_PLATFORMS) {
    const row = await getEntitlement(userId, p);
    if (!row) {
      await db
        .insert(entitlementsTable)
        .values({
          userId,
          platform: p,
          source: 'trial',
          trialExpiresAt: sharedExpiry,
        })
        .onConflictDoNothing();
    }
  }

  return (await getEntitlement(userId, platform))!;
}

export async function grantPaidAllPlatforms(opts: {
  userId: string;
  source: 'stripe' | 'iap' | 'admin_grant';
  externalId?: string;
}): Promise<void> {
  const now = new Date();
  for (const platform of ALL_PLATFORMS) {
    const existing = await getEntitlement(opts.userId, platform);
    if (existing) {
      await db
        .update(entitlementsTable)
        .set({
          source: opts.source,
          paidAt: now,
          externalId: opts.externalId ?? existing.externalId ?? null,
          revokedAt: null,
          revokedReason: null,
        })
        .where(eq(entitlementsTable.id, existing.id));
    } else {
      await db.insert(entitlementsTable).values({
        userId: opts.userId,
        platform,
        source: opts.source,
        paidAt: now,
        externalId: opts.externalId ?? null,
      });
    }
  }
}

export async function revokeAllPlatforms(opts: {
  userId: string;
  reason: string;
}): Promise<void> {
  const now = new Date();
  for (const platform of ALL_PLATFORMS) {
    const existing = await getEntitlement(opts.userId, platform);
    if (!existing) continue;
    await db
      .update(entitlementsTable)
      .set({ revokedAt: now, revokedReason: opts.reason })
      .where(eq(entitlementsTable.id, existing.id));
  }
}

export function summarize(ent: Entitlement | undefined, platform: Platform): EntitlementStatus {
  if (!ent) {
    return {
      platform,
      status: 'none',
      trialDaysRemaining: null,
      trialExpiresAt: null,
      paidAt: null,
    };
  }
  if (ent.revokedAt) {
    return {
      platform,
      status: 'revoked',
      trialDaysRemaining: null,
      trialExpiresAt: ent.trialExpiresAt?.toISOString() ?? null,
      paidAt: ent.paidAt?.toISOString() ?? null,
      revokedAt: ent.revokedAt.toISOString(),
    };
  }
  if (ent.paidAt) {
    return {
      platform,
      status: 'paid',
      trialDaysRemaining: null,
      trialExpiresAt: ent.trialExpiresAt?.toISOString() ?? null,
      paidAt: ent.paidAt.toISOString(),
    };
  }
  if (ent.trialExpiresAt) {
    const msLeft = ent.trialExpiresAt.getTime() - Date.now();
    if (msLeft > 0) {
      return {
        platform,
        status: 'trial',
        trialDaysRemaining: Math.ceil(msLeft / (24 * 60 * 60 * 1000)),
        trialExpiresAt: ent.trialExpiresAt.toISOString(),
        paidAt: null,
      };
    }
    return {
      platform,
      status: 'expired',
      trialDaysRemaining: 0,
      trialExpiresAt: ent.trialExpiresAt.toISOString(),
      paidAt: null,
    };
  }
  return {
    platform,
    status: 'none',
    trialDaysRemaining: null,
    trialExpiresAt: null,
    paidAt: null,
  };
}

export function canWrite(ent: Entitlement | undefined): boolean {
  const s = summarize(ent, 'web');
  return s.status === 'trial' || s.status === 'paid';
}
