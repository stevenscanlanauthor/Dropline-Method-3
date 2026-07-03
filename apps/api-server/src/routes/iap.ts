import { Router } from 'express';
import { db, purchasesTable } from '@dropline/db';
import { eq } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth';
import { grantPaidAllPlatforms, getEntitlement, summarize } from '../lib/entitlement';
import {
  verifyTransactionJws,
  isAllowedProductId,
  appAccountTokenMatches,
} from '../lib/appStore';
import { platformFromRequest } from '../lib/platform';
import type { Platform } from '@dropline/db';

const router = Router();

async function verifyAndGrant(opts: {
  userId: string;
  jws: string;
  platform: Platform;
}): Promise<{ ok: boolean; reason?: string }> {
  let payload;
  try {
    payload = await verifyTransactionJws(opts.jws);
  } catch {
    return { ok: false, reason: 'verification_failed' };
  }
  if (!payload.productId || !isAllowedProductId(payload.productId)) {
    return { ok: false, reason: 'wrong_product' };
  }
  if (payload.revocationDate) {
    return { ok: false, reason: 'revoked' };
  }
  const tokenFromApple =
    (payload as { appAccountToken?: string | null }).appAccountToken ?? null;
  if (!appAccountTokenMatches(tokenFromApple, opts.userId)) {
    return { ok: false, reason: 'wrong_account' };
  }
  const externalId = payload.originalTransactionId ?? null;
  if (!externalId) {
    return { ok: false, reason: 'missing_transaction_id' };
  }
  const [existing] = await db
    .select({ id: purchasesTable.id, userId: purchasesTable.userId })
    .from(purchasesTable)
    .where(eq(purchasesTable.externalId, externalId))
    .limit(1);
  if (existing && existing.userId !== opts.userId) {
    return { ok: false, reason: 'already_claimed' };
  }
  if (!existing) {
    await db.insert(purchasesTable).values({
      userId: opts.userId,
      platform: opts.platform,
      source: 'iap',
      amountCents:
        typeof payload.price === 'number' ? Math.round(payload.price * 100) : 0,
      currency: payload.currency ?? 'USD',
      externalId,
      occurredAt: payload.purchaseDate ? new Date(payload.purchaseDate) : new Date(),
    });
  }
  await grantPaidAllPlatforms({
    userId: opts.userId,
    source: 'iap',
    externalId,
  });
  return { ok: true };
}

router.post('/iap/verify', requireAuth(), async (req, res) => {
  const jws = typeof req.body?.jws === 'string' ? req.body.jws : '';
  if (!jws) {
    res.status(400).json({ message: 'jws is required' });
    return;
  }
  const platform = platformFromRequest(req);
  const result = await verifyAndGrant({
    userId: req.userId!,
    jws,
    platform,
  });
  const ent = await getEntitlement(req.userId!, platform);
  res.json({
    paid: result.ok,
    reason: result.reason,
    entitlement: summarize(ent, platform),
  });
});

router.post('/iap/restore', requireAuth(), async (req, res) => {
  const jwsList = req.body?.jws;
  if (!Array.isArray(jwsList) || jwsList.length === 0) {
    res.status(400).json({ message: 'jws array is required' });
    return;
  }
  const platform = platformFromRequest(req);
  let any = false;
  for (const j of jwsList) {
    if (typeof j !== 'string') continue;
    const r = await verifyAndGrant({ userId: req.userId!, jws: j, platform });
    if (r.ok) any = true;
  }
  const ent = await getEntitlement(req.userId!, platform);
  res.json({ paid: any, entitlement: summarize(ent, platform) });
});

export default router;
