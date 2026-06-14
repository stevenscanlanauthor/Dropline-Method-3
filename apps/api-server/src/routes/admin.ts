import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db, usersTable, booksTable } from '@dropline/db';
import { eq, desc, count, sql } from 'drizzle-orm';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = Router();

router.get('/admin/users', requireAuth(), requireAdmin(), async (_req, res) => {
  try {
    const users = await db
      .select({
        id: usersTable.id,
        email: usersTable.email,
        displayName: usersTable.displayName,
        isAdmin: usersTable.isAdmin,
        isDisabled: usersTable.isDisabled,
        createdAt: usersTable.createdAt,
      })
      .from(usersTable)
      .orderBy(desc(usersTable.createdAt));

    const counts = await db
      .select({ userId: booksTable.userId, bookCount: count() })
      .from(booksTable)
      .groupBy(booksTable.userId);
    const countByUser = new Map(counts.map(c => [c.userId, Number(c.bookCount)]));

    res.json(
      users.map(u => ({
        id: u.id,
        email: u.email,
        displayName: u.displayName,
        isAdmin: u.isAdmin,
        isDisabled: u.isDisabled,
        createdAt: u.createdAt.toISOString(),
        bookCount: countByUser.get(u.id) ?? 0,
      })),
    );
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/admin/users/:id', requireAuth(), requireAdmin(), async (req, res) => {
  try {
    const { id } = req.params;
    const { isDisabled, isAdmin, displayName } = req.body as {
      isDisabled?: boolean;
      isAdmin?: boolean;
      displayName?: string | null;
    };
    const updates: Partial<typeof usersTable.$inferInsert> = { updatedAt: new Date() };
    if (isDisabled !== undefined) updates.isDisabled = isDisabled;
    if (isAdmin !== undefined) updates.isAdmin = isAdmin;
    if (displayName !== undefined) updates.displayName = displayName?.trim() || null;
    const rows = await db
      .update(usersTable)
      .set(updates)
      .where(eq(usersTable.id, id))
      .returning({
        id: usersTable.id,
        email: usersTable.email,
        displayName: usersTable.displayName,
        isAdmin: usersTable.isAdmin,
        isDisabled: usersTable.isDisabled,
      });
    if (!rows[0]) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json(rows[0]);
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/admin/users/:id/reset-password', requireAuth(), requireAdmin(), async (req, res) => {
  try {
    const { password } = req.body as { password?: string };
    if (!password || password.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters' });
      return;
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const rows = await db
      .update(usersTable)
      .set({
        passwordHash,
        tokenVersion: sql`${usersTable.tokenVersion} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(usersTable.id, req.params.id))
      .returning({ id: usersTable.id });
    if (!rows[0]) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/admin/users/:id', requireAuth(), requireAdmin(), async (req, res) => {
  try {
    await db.delete(usersTable).where(eq(usersTable.id, req.params.id));
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/admin/users/:id/books', requireAuth(), requireAdmin(), async (req, res) => {
  try {
    await db.delete(booksTable).where(eq(booksTable.userId, req.params.id));
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
