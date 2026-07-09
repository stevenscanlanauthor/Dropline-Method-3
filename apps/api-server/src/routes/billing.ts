import { Router } from 'express';
import { requireAuth, getAuth } from '../middleware/auth';
import { ensureTrial, summarize } from '../lib/entitlement';
import { IOS_PRODUCT_ID, MAC_PRODUCT_ID } from '../lib/appStore';
import { redeemAccessCodeForUser } from '../lib/signupCodes';

const router = Router();

router.get('/billing/public', (_req, res) => {
  res.json({
    trialDays: Number(process.env.BILLING_TRIAL_DAYS ?? '14'),
    macProductId: MAC_PRODUCT_ID,
    iosProductId: IOS_PRODUCT_ID,
    macPriceDisplay: process.env.BILLING_MAC_PRICE_DISPLAY ?? '39',
    iosPriceDisplay: process.env.BILLING_IOS_PRICE_DISPLAY ?? '29',
  });
});

router.get('/billing/status', requireAuth(), async (req, res) => {
  if (!req.userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const ent = await ensureTrial(req.userId, 'web');
  res.json({
    entitlement: summarize(ent, 'web'),
    canWrite: summarize(ent, 'web').status === 'trial' || summarize(ent, 'web').status === 'paid',
  });
});

router.post('/billing/redeem-code', requireAuth(), async (req, res) => {
  const auth = getAuth(req);
  if (!auth) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const { code } = req.body as { code?: string };
  const result = await redeemAccessCodeForUser(auth.userId, code ?? '');
  if (!result.ok) {
    res.status(400).json({ error: result.error });
    return;
  }
  const ent = await ensureTrial(auth.userId, 'web');
  res.json({
    ok: true,
    entitlement: summarize(ent, 'web'),
    canWrite: true,
  });
});

export default router;
