import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db, booksTable } from '@dropline/db';
import { eq, and, desc } from 'drizzle-orm';
import { requireAuth, getAuth } from '../middleware/auth';

const router = Router();

router.get('/books', requireAuth(), async (req, res) => {
  try {
    const auth = getAuth(req);
    if (!auth) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const rows = await db
      .select({
        id: booksTable.id,
        title: booksTable.title,
        authorName: booksTable.authorName,
        updatedAt: booksTable.updatedAt,
      })
      .from(booksTable)
      .where(eq(booksTable.userId, auth.userId))
      .orderBy(desc(booksTable.updatedAt));
    res.json(
      rows.map(r => ({
        id: r.id,
        title: r.title,
        authorName: r.authorName,
        updatedAt: r.updatedAt.toISOString(),
      })),
    );
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/books/:id', requireAuth(), async (req, res) => {
  try {
    const auth = getAuth(req);
    if (!auth) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const rows = await db
      .select()
      .from(booksTable)
      .where(and(eq(booksTable.userId, auth.userId), eq(booksTable.id, req.params.id)))
      .limit(1);
    if (!rows[0]) {
      res.status(404).json({ error: 'Book not found' });
      return;
    }
    res.json({
      id: rows[0].id,
      title: rows[0].title,
      authorName: rows[0].authorName,
      project: rows[0].project,
      updatedAt: rows[0].updatedAt.toISOString(),
    });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/books/:id', requireAuth(), async (req, res) => {
  try {
    const auth = getAuth(req);
    if (!auth) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const { project, title, authorName, clientUpdatedAt } = req.body as {
      project?: Record<string, unknown>;
      title?: string;
      authorName?: string;
      clientUpdatedAt?: string;
    };
    if (!project || typeof project !== 'object') {
      res.status(400).json({ error: 'project is required' });
      return;
    }
    const bookId = req.params.id;
    const now = new Date();
    const resolvedTitle = (title ?? (project.title as string) ?? 'Untitled Project').trim() || 'Untitled Project';
    const resolvedAuthor = (authorName ?? (project.authorName as string) ?? '').trim();

    const existing = await db
      .select()
      .from(booksTable)
      .where(and(eq(booksTable.userId, auth.userId), eq(booksTable.id, bookId)))
      .limit(1);

    if (existing[0]) {
      const clientTs = clientUpdatedAt ? new Date(clientUpdatedAt) : null;
      if (clientTs && !isNaN(clientTs.getTime()) && existing[0].updatedAt > clientTs) {
        res.status(409).json({
          conflict: true,
          project: existing[0].project,
          updatedAt: existing[0].updatedAt.toISOString(),
        });
        return;
      }
      await db
        .update(booksTable)
        .set({
          project,
          title: resolvedTitle,
          authorName: resolvedAuthor,
          updatedAt: now,
        })
        .where(and(eq(booksTable.userId, auth.userId), eq(booksTable.id, bookId)));
    } else {
      await db.insert(booksTable).values({
        id: bookId,
        userId: auth.userId,
        project,
        title: resolvedTitle,
        authorName: resolvedAuthor,
        createdAt: now,
        updatedAt: now,
      });
    }

    res.json({ success: true, updatedAt: now.toISOString() });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/books', requireAuth(), async (req, res) => {
  try {
    const auth = getAuth(req);
    if (!auth) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const { project, title, authorName } = req.body as {
      project?: Record<string, unknown>;
      title?: string;
      authorName?: string;
    };
    if (!project || typeof project !== 'object') {
      res.status(400).json({ error: 'project is required' });
      return;
    }
    const now = new Date();
    const id = uuidv4();
    const resolvedTitle = (title ?? (project.title as string) ?? 'Untitled Project').trim() || 'Untitled Project';
    const resolvedAuthor = (authorName ?? (project.authorName as string) ?? '').trim();
    await db.insert(booksTable).values({
      id,
      userId: auth.userId,
      project,
      title: resolvedTitle,
      authorName: resolvedAuthor,
      createdAt: now,
      updatedAt: now,
    });
    res.status(201).json({ id, updatedAt: now.toISOString() });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/books/:id', requireAuth(), async (req, res) => {
  try {
    const auth = getAuth(req);
    if (!auth) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    await db
      .delete(booksTable)
      .where(and(eq(booksTable.userId, auth.userId), eq(booksTable.id, req.params.id)));
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
