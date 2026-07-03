import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db, usersTable } from '@dropline/db';
import { eq } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth';
import { verifyAppleIdentityToken } from '../lib/appleAuth';
import { signToken } from '../lib/jwt';
import { ensureTrial } from '../lib/entitlement';

const router = Router();

async function findUserByEmail(email: string) {
  const normalized = email.toLowerCase();
  const [u] = await db.select().from(usersTable).where(eq(usersTable.email, normalized)).limit(1);
  return u;
}

router.post('/auth/apple', async (req, res) => {
  const identityToken =
    typeof req.body?.identityToken === 'string' ? req.body.identityToken : '';
  const firstName =
    typeof req.body?.firstName === 'string' ? req.body.firstName.trim() : null;
  const lastName =
    typeof req.body?.lastName === 'string' ? req.body.lastName.trim() : null;

  if (!identityToken) {
    res.status(400).json({ message: 'identityToken is required' });
    return;
  }

  let identity;
  try {
    identity = await verifyAppleIdentityToken(identityToken);
  } catch {
    res.status(401).json({ message: 'Invalid Apple identity token' });
    return;
  }

  let [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.appleSub, identity.sub))
    .limit(1);

  if (!user) {
    let provisionEmail = identity.email
      ? identity.email.toLowerCase()
      : `${identity.sub}@privaterelay.appleid`;
    if (identity.email) {
      const collide = await findUserByEmail(identity.email);
      if (collide) {
        provisionEmail = `${identity.sub}@privaterelay.appleid`;
      }
    }
    const now = new Date();
    const [created] = await db
      .insert(usersTable)
      .values({
        id: uuidv4(),
        email: provisionEmail,
        appleSub: identity.sub,
        firstName,
        lastName,
        displayName: [firstName, lastName].filter(Boolean).join(' ') || null,
        isAdmin: false,
        isDisabled: false,
        tokenVersion: 0,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    user = created;
  }

  if (!user) {
    res.status(500).json({ message: 'Failed to provision account' });
    return;
  }
  if (user.accessRevokedAt || user.isDisabled) {
    res.status(403).json({ message: 'Your access has been revoked.' });
    return;
  }

  await ensureTrial(user.id, 'ios');

  const token = signToken(
    { userId: user.id, email: user.email, tokenVersion: user.tokenVersion },
    true,
  );
  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    },
  });
});

router.post('/auth/logout', requireAuth(), (_req, res) => {
  res.json({ ok: true });
});

export default router;
