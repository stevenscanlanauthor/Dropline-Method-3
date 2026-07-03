import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { ensureTrial, getEntitlement, summarize } from '../lib/entitlement';
import { IOS_PRODUCT_ID, MAC_PRODUCT_ID } from '../lib/appStore';

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

export default router;
