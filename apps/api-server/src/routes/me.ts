import { Router } from 'express';
import { db, usersTable } from '@dropline/db';
import { eq } from 'drizzle-orm';
import { requireAuth, getAuth } from '../middleware/auth';
import { ensureTrial, getEntitlement, summarize } from '../lib/entitlement';
import { parsePlatform, platformFromRequest } from '../lib/platform';

const router = Router();

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? 'steven@stevenscanlan.com')
  .toLowerCase()
  .split(',')
  .map(e => e.trim())
  .filter(Boolean);

function isAdminEmail(email: string | null | undefined): boolean {
  return !!email && ADMIN_EMAILS.includes(email.toLowerCase());
}

router.get('/me', requireAuth(), async (req, res) => {
  const auth = getAuth(req);
  if (!auth) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, auth.userId))
    .limit(1);
  if (!user) {
    res.status(401).json({ message: 'User not found' });
    return;
  }
  res.json({
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    isAdmin: user.isAdmin || isAdminEmail(user.email),
  });
});

router.get('/entitlement', requireAuth(), async (req, res) => {
  if (!req.userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }
  const platform = parsePlatform(req.query.platform) ?? platformFromRequest(req);
  const [user] = await db
    .select({ accessRevokedAt: usersTable.accessRevokedAt })
    .from(usersTable)
    .where(eq(usersTable.id, req.userId))
    .limit(1);
  if (user?.accessRevokedAt) {
    res.json({
      platform,
      status: 'revoked',
      trialDaysRemaining: null,
      trialExpiresAt: null,
      paidAt: null,
      revokedAt: user.accessRevokedAt.toISOString(),
    });
    return;
  }
  const ent = await ensureTrial(req.userId, platform);
  res.json(summarize(ent, platform));
});

router.get('/entitlement/all', requireAuth(), async (req, res) => {
  if (!req.userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }
  const ios = await getEntitlement(req.userId, 'ios');
  const web = await getEntitlement(req.userId, 'web');
  const macos = await getEntitlement(req.userId, 'macos');
  res.json({
    ios: summarize(ios, 'ios'),
    web: summarize(web, 'web'),
    macos: summarize(macos, 'macos'),
  });
});

export default router;
