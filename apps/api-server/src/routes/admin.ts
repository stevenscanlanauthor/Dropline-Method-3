import { Router } from 'express';
import bcrypt from 'bcryptjs';
import {
  db,
  usersTable,
  booksTable,
  loginEventsTable,
  blockedIpsTable,
  adminAlertsTable,
} from '@dropline/db';
import { eq, desc, count, sql, or, and } from 'drizzle-orm';
import { requireAuth, requireAdmin, getAuth } from '../middleware/auth';
import { getActiveUserWindowMs } from '../lib/userActivity';

const router = Router();

async function mapUsersWithBookCounts(users: Array<{
  id: string;
  email: string;
  displayName: string | null;
  isAdmin: boolean;
  isDisabled: boolean;
  createdAt: Date;
  lastActiveAt: Date | null;
}>) {
  const counts = await db
    .select({ userId: booksTable.userId, bookCount: count() })
    .from(booksTable)
    .groupBy(booksTable.userId);
  const countByUser = new Map(counts.map(c => [c.userId, Number(c.bookCount)]));
  return users.map(u => ({
    id: u.id,
    email: u.email,
    displayName: u.displayName,
    isAdmin: u.isAdmin,
    isDisabled: u.isDisabled,
    createdAt: u.createdAt.toISOString(),
    lastActiveAt: u.lastActiveAt?.toISOString() ?? null,
    bookCount: countByUser.get(u.id) ?? 0,
  }));
}

router.get('/admin/users', requireAuth(), requireAdmin(), async (_req, res) => {
  try {
    const activeSince = new Date(Date.now() - getActiveUserWindowMs());
    const users = await db
      .select({
        id: usersTable.id,
        email: usersTable.email,
        displayName: usersTable.displayName,
        isAdmin: usersTable.isAdmin,
        isDisabled: usersTable.isDisabled,
        createdAt: usersTable.createdAt,
        lastActiveAt: usersTable.lastActiveAt,
      })
      .from(usersTable)
      .where(sql`${usersTable.lastActiveAt} >= ${activeSince}`)
      .orderBy(desc(usersTable.lastActiveAt));
    res.json(await mapUsersWithBookCounts(users));
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/admin/users/all', requireAuth(), requireAdmin(), async (_req, res) => {
  try {
    const users = await db
      .select({
        id: usersTable.id,
        email: usersTable.email,
        displayName: usersTable.displayName,
        isAdmin: usersTable.isAdmin,
        isDisabled: usersTable.isDisabled,
        createdAt: usersTable.createdAt,
        lastActiveAt: usersTable.lastActiveAt,
      })
      .from(usersTable)
      .orderBy(desc(usersTable.lastActiveAt), desc(usersTable.createdAt));
    res.json(await mapUsersWithBookCounts(users));
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/admin/users/:id', requireAuth(), requireAdmin(), async (req, res) => {
  try {
    const auth = getAuth(req);
    const { id } = req.params;
    const { isDisabled, isAdmin, displayName } = req.body as {
      isDisabled?: boolean;
      isAdmin?: boolean;
      displayName?: string | null;
    };

    if (auth?.userId === id && isAdmin === false) {
      res.status(400).json({ error: 'You cannot remove your own admin access.' });
      return;
    }
    if (auth?.userId === id && isDisabled === true) {
      res.status(400).json({ error: 'You cannot disable your own account.' });
      return;
    }

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
    const { password, newPassword } = req.body as { password?: string; newPassword?: string };
    const pw = (newPassword ?? password)?.trim();
    if (!pw || pw.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters' });
      return;
    }
    const passwordHash = await bcrypt.hash(pw, 12);
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
    const auth = getAuth(req);
    const { id } = req.params;
    if (auth?.userId === id) {
      res.status(400).json({ error: 'You cannot delete your own account.' });
      return;
    }
    await db.delete(usersTable).where(eq(usersTable.id, id));
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

router.get('/admin/users/:id/login-history', requireAuth(), requireAdmin(), async (req, res) => {
  try {
    const events = await db
      .select({
        id: loginEventsTable.id,
        emailAttempted: loginEventsTable.emailAttempted,
        ipAddress: loginEventsTable.ipAddress,
        succeeded: loginEventsTable.succeeded,
        createdAt: loginEventsTable.createdAt,
      })
      .from(loginEventsTable)
      .where(eq(loginEventsTable.userId, req.params.id))
      .orderBy(desc(loginEventsTable.createdAt))
      .limit(20);
    res.json(
      events.map(e => ({
        ...e,
        createdAt: e.createdAt.toISOString(),
      })),
    );
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/admin/login-events', requireAuth(), requireAdmin(), async (req, res) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const base = db
      .select({
        id: loginEventsTable.id,
        userId: loginEventsTable.userId,
        emailAttempted: loginEventsTable.emailAttempted,
        ipAddress: loginEventsTable.ipAddress,
        succeeded: loginEventsTable.succeeded,
        createdAt: loginEventsTable.createdAt,
      })
      .from(loginEventsTable);

    const events = await (q
      ? base.where(
          or(
            sql`lower(${loginEventsTable.emailAttempted}) like ${'%' + q.toLowerCase() + '%'}`,
            sql`lower(${loginEventsTable.ipAddress}) like ${'%' + q.toLowerCase() + '%'}`,
          ),
        )
      : base
    )
      .orderBy(desc(loginEventsTable.createdAt))
      .limit(100);

    res.json(events.map(e => ({ ...e, createdAt: e.createdAt.toISOString() })));
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/admin/login-events/unknown', requireAuth(), requireAdmin(), async (_req, res) => {
  try {
    const events = await db
      .select({
        id: loginEventsTable.id,
        emailAttempted: loginEventsTable.emailAttempted,
        ipAddress: loginEventsTable.ipAddress,
        succeeded: loginEventsTable.succeeded,
        createdAt: loginEventsTable.createdAt,
      })
      .from(loginEventsTable)
      .where(sql`${loginEventsTable.userId} IS NULL`)
      .orderBy(desc(loginEventsTable.createdAt))
      .limit(50);
    res.json(events.map(e => ({ ...e, createdAt: e.createdAt.toISOString() })));
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/admin/login-lockouts/clear', requireAuth(), requireAdmin(), async (req, res) => {
  try {
    const { email: rawEmail, ip: rawIp, userId } = req.body as {
      email?: string;
      ip?: string;
      userId?: string;
    };

    let email = typeof rawEmail === 'string' ? rawEmail.toLowerCase().trim() : undefined;
    const ip = typeof rawIp === 'string' ? rawIp.trim() : undefined;

    if (typeof userId === 'string' && userId.trim()) {
      const rows = await db
        .select({ email: usersTable.email })
        .from(usersTable)
        .where(eq(usersTable.id, userId.trim()))
        .limit(1);
      if (!rows[0]) {
        res.status(404).json({ error: 'User not found' });
        return;
      }
      email = rows[0].email.toLowerCase();
    }

    if (!email && !ip) {
      res.status(400).json({ error: 'Provide email, ip, or userId' });
      return;
    }

    const identityFilter = email && ip
      ? or(eq(loginEventsTable.emailAttempted, email), eq(loginEventsTable.ipAddress, ip))
      : email
        ? eq(loginEventsTable.emailAttempted, email)
        : eq(loginEventsTable.ipAddress, ip!);

    const deleted = await db
      .delete(loginEventsTable)
      .where(and(eq(loginEventsTable.succeeded, false), identityFilter))
      .returning({ id: loginEventsTable.id });

    res.json({ cleared: deleted.length, email: email ?? null, ip: ip ?? null });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/admin/blocked-ips', requireAuth(), requireAdmin(), async (_req, res) => {
  try {
    const rows = await db.select().from(blockedIpsTable).orderBy(desc(blockedIpsTable.blockedAt));
    res.json(
      rows.map(r => ({
        ...r,
        blockedAt: r.blockedAt.toISOString(),
      })),
    );
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/admin/blocked-ips', requireAuth(), requireAdmin(), async (req, res) => {
  try {
    const auth = getAuth(req);
    const { ip, note } = req.body as { ip?: string; note?: string };
    if (!ip?.trim()) {
      res.status(400).json({ error: 'ip is required' });
      return;
    }
    const rows = await db
      .insert(blockedIpsTable)
      .values({
        ip: ip.trim(),
        note: note?.trim() || null,
        blockedByUserId: auth?.userId ?? null,
      })
      .onConflictDoUpdate({
        target: blockedIpsTable.ip,
        set: {
          note: note?.trim() || null,
          blockedAt: new Date(),
          blockedByUserId: auth?.userId ?? null,
        },
      })
      .returning();
    res.status(201).json({
      ...rows[0],
      blockedAt: rows[0].blockedAt.toISOString(),
    });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/admin/blocked-ips/:ip', requireAuth(), requireAdmin(), async (req, res) => {
  try {
    const ip = decodeURIComponent(req.params.ip);
    await db.delete(blockedIpsTable).where(eq(blockedIpsTable.ip, ip));
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/admin/alerts', requireAuth(), requireAdmin(), async (_req, res) => {
  try {
    const alerts = await db
      .select()
      .from(adminAlertsTable)
      .orderBy(desc(adminAlertsTable.createdAt))
      .limit(20);
    res.json(
      alerts.map(a => ({
        ...a,
        createdAt: a.createdAt.toISOString(),
      })),
    );
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/admin/alerts/:id/read', requireAuth(), requireAdmin(), async (req, res) => {
  try {
    await db
      .update(adminAlertsTable)
      .set({ isRead: true })
      .where(eq(adminAlertsTable.id, req.params.id));
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/admin/alerts/read-all', requireAuth(), requireAdmin(), async (_req, res) => {
  try {
    await db.update(adminAlertsTable).set({ isRead: true }).where(eq(adminAlertsTable.isRead, false));
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
