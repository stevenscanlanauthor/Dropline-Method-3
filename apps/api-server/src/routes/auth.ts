import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { db, usersTable } from '@dropline/db';
import { eq } from 'drizzle-orm';
import { signToken } from '../lib/jwt';
import { requireAuth, getAuth } from '../middleware/auth';

const router = Router();

router.post('/auth/register', async (req, res) => {
  try {
    const { email, password, displayName } = req.body as {
      email?: string;
      password?: string;
      displayName?: string;
    };
    if (!email?.trim() || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }
    if (password.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters' });
      return;
    }
    const normalized = email.toLowerCase().trim();
    const existing = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, normalized)).limit(1);
    if (existing[0]) {
      res.status(400).json({ error: 'An account with that email already exists' });
      return;
    }
    const now = new Date();
    const userId = uuidv4();
    const passwordHash = await bcrypt.hash(password, 12);
    await db.insert(usersTable).values({
      id: userId,
      email: normalized,
      passwordHash,
      displayName: displayName?.trim() || null,
      isAdmin: false,
      isDisabled: false,
      tokenVersion: 0,
      createdAt: now,
      updatedAt: now,
    });
    const token = signToken({ userId, email: normalized, tokenVersion: 0 }, true);
    res.status(201).json({
      token,
      user: { userId, email: normalized, displayName: displayName?.trim() || null, isAdmin: false },
    });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/auth/login', async (req, res) => {
  try {
    const { email, password, rememberMe } = req.body as {
      email?: string;
      password?: string;
      rememberMe?: boolean;
    };
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }
    const normalized = email.toLowerCase().trim();
    const rows = await db.select().from(usersTable).where(eq(usersTable.email, normalized)).limit(1);
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      res.status(401).json({ error: 'Incorrect email or password' });
      return;
    }
    if (user.isDisabled) {
      res.status(403).json({ error: 'Account is disabled.' });
      return;
    }
    const token = signToken(
      { userId: user.id, email: user.email, tokenVersion: user.tokenVersion },
      rememberMe !== false,
    );
    res.json({
      token,
      user: {
        userId: user.id,
        email: user.email,
        displayName: user.displayName,
        isAdmin: user.isAdmin,
      },
    });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/auth/me', requireAuth(), async (req, res) => {
  try {
    const auth = getAuth(req);
    if (!auth) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const rows = await db
      .select({
        id: usersTable.id,
        email: usersTable.email,
        displayName: usersTable.displayName,
        isAdmin: usersTable.isAdmin,
        isDisabled: usersTable.isDisabled,
      })
      .from(usersTable)
      .where(eq(usersTable.id, auth.userId))
      .limit(1);
    const user = rows[0];
    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }
    res.json({
      userId: user.id,
      email: user.email,
      displayName: user.displayName,
      isAdmin: user.isAdmin,
    });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
