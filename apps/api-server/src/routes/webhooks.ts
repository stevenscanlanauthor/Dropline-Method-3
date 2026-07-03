import { Router, raw } from 'express';
import { NotificationTypeV2 } from '@apple/app-store-server-library';
import { db, purchasesTable } from '@dropline/db';
import { eq } from 'drizzle-orm';
import { verifyNotificationJws, verifyTransactionJws } from '../lib/appStore';
import { grantPaidAllPlatforms, revokeAllPlatforms } from '../lib/entitlement';

const router = Router();

router.post(
  '/webhooks/apple',
  raw({ type: 'application/json' }),
  async (req, res) => {
    let body: { signedPayload?: unknown };
    try {
      body = JSON.parse((req.body as Buffer).toString('utf8')) as { signedPayload?: unknown };
    } catch {
      res.status(400).send('Invalid JSON');
      return;
    }
    if (typeof body.signedPayload !== 'string') {
      res.status(400).send('signedPayload is required');
      return;
    }

    let notification;
    try {
      notification = await verifyNotificationJws(body.signedPayload);
    } catch {
      res.status(400).send('Invalid signature');
      return;
    }

    const type = notification.notificationType;
    const signedTx = notification.data?.signedTransactionInfo;
    let tx: Awaited<ReturnType<typeof verifyTransactionJws>> | null = null;
    if (signedTx) {
      try {
        tx = await verifyTransactionJws(signedTx);
      } catch {
        /* ignore */
      }
    }
    const externalId = tx?.originalTransactionId ?? tx?.transactionId ?? null;

    let userId: string | null = null;
    if (externalId) {
      const [row] = await db
        .select({ userId: purchasesTable.userId })
        .from(purchasesTable)
        .where(eq(purchasesTable.externalId, externalId))
        .limit(1);
      userId = row?.userId ?? null;
    }

    if (!userId || !externalId) {
      res.json({ received: true, mapped: false });
      return;
    }

    switch (type) {
      case NotificationTypeV2.SUBSCRIBED:
      case NotificationTypeV2.DID_RENEW:
      case NotificationTypeV2.ONE_TIME_CHARGE:
      case NotificationTypeV2.OFFER_REDEEMED:
        await grantPaidAllPlatforms({ userId, source: 'iap', externalId });
        break;
      case NotificationTypeV2.REFUND:
      case NotificationTypeV2.REVOKE:
      case NotificationTypeV2.EXPIRED:
        await revokeAllPlatforms({ userId, reason: `apple_${type}` });
        break;
      default:
        break;
    }

    res.json({ received: true, mapped: true });
  },
);

export default router;
