import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { db, usersTable, entitlementsTable } from '@dropline/db';
import { and, eq, sql } from 'drizzle-orm';
import {
  APPLE_REVIEW_EMAIL,
  APPLE_REVIEW_EXPIRED_EMAIL,
  ensureAppleReviewAccount,
  ensureAppleReviewExpiredAccount,
  ensureAppleReviewInviteCode,
} from '../lib/reviewAccounts';
import { grantPaidAllPlatforms, TRIAL_DAYS } from '../lib/entitlement';

const router = Router();

function bootstrapAuthorized(req: { headers: Record<string, unknown> }): boolean {
  const key = process.env.ADMIN_BOOTSTRAP_KEY?.trim();
  if (!key) return false;
  const header = req.headers['x-bootstrap-key'];
  return typeof header === 'string' && header === key;
}

router.post('/setup/apple-review', async (req, res) => {
  if (!bootstrapAuthorized(req)) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
  try {
    const { password } = req.body as { password?: string };
    if (password?.trim()) {
      process.env.APPLE_REVIEW_PASSWORD = password.trim();
    }
    await ensureAppleReviewInviteCode();
    await ensureAppleReviewAccount();
    res.json({ ok: true, email: APPLE_REVIEW_EMAIL });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Setup failed' });
  }
});

router.post('/setup/apple-review-expired', async (req, res) => {
  if (!bootstrapAuthorized(req)) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
  try {
    const { password } = req.body as { password?: string };
    if (password?.trim()) {
      process.env.APPLE_REVIEW_EXPIRED_PASSWORD = password.trim();
    }
    await ensureAppleReviewExpiredAccount();
    res.json({ ok: true, email: APPLE_REVIEW_EXPIRED_EMAIL });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Setup failed' });
  }
});

/** Manual one-shot create when env passwords are set via body override (local scripts). */
router.post('/setup/apple-review-manual', async (req, res) => {
  if (!bootstrapAuthorized(req)) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
  const { email, password, expired } = req.body as {
    email?: string;
    password?: string;
    expired?: boolean;
  };
  if (!email?.trim() || !password || password.length < 8) {
    res.status(400).json({ error: 'email and password (8+) required' });
    return;
  }
  const normalized = email.toLowerCase().trim();
  const now = new Date();
  const passwordHash = await bcrypt.hash(password, 12);
  const existing = await db.select().from(usersTable).where(eq(usersTable.email, normalized)).limit(1);
  let userId: string;
  if (!existing[0]) {
    userId = uuidv4();
    await db.insert(usersTable).values({
      id: userId,
      email: normalized,
      passwordHash,
      displayName: expired ? 'Apple Review Expired' : 'Apple Review',
      emailVerifiedAt: now,
      createdAt: now,
      updatedAt: now,
    });
  } else {
    userId = existing[0].id;
    await db
      .update(usersTable)
      .set({
        passwordHash,
        emailVerifiedAt: now,
        tokenVersion: sql`${usersTable.tokenVersion} + 1`,
        updatedAt: now,
      })
      .where(eq(usersTable.id, userId));
  }

  if (expired) {
    const expiredTrialEndsAt = new Date(now.getTime() - 24 * 60 * 60 * 1000);
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
          })
          .where(eq(entitlementsTable.id, row.id));
      } else {
        await db.insert(entitlementsTable).values({
          userId,
          platform,
          source: 'trial',
          trialExpiresAt: expiredTrialEndsAt,
        });
      }
    }
  } else {
    await grantPaidAllPlatforms({ userId, source: 'admin_grant', externalId: 'manual-review' });
  }

  res.json({ ok: true, email: normalized, trialDays: TRIAL_DAYS, expired: !!expired });
});

export default router;
