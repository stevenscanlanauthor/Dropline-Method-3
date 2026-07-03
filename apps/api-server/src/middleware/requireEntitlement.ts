import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { db, usersTable } from '@dropline/db';
import { eq } from 'drizzle-orm';
import { ensureTrial, getEntitlement, summarize, canWrite } from '../lib/entitlement';
import { platformFromRequest } from '../lib/platform';

export function requireEntitlement(): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
    const [user] = await db
      .select({ accessRevokedAt: usersTable.accessRevokedAt })
      .from(usersTable)
      .where(eq(usersTable.id, req.userId))
      .limit(1);
    if (user?.accessRevokedAt) {
      res.status(403).json({ message: 'Your access has been revoked.' });
      return;
    }
    const platform = platformFromRequest(req);
    const ent = await ensureTrial(req.userId, platform);
    if (!canWrite(ent)) {
      res.status(402).json({
        message: 'Trial expired. Upgrade to continue writing.',
        entitlement: summarize(ent, platform),
      });
      return;
    }
    next();
  };
}
