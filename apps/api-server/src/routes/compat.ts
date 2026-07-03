import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db, booksTable } from '@dropline/db';
import { and, desc, eq } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth';
import { requireEntitlement } from '../middleware/requireEntitlement';
import {
  createManuscriptBook,
  ensureBookCompat,
  findChapterUuid,
  getBookByManuscriptId,
  getChapterNumericId,
  parseProject,
  projectToDrops,
  saveBookProject,
  serializeChapter,
  serializeManuscript,
  dropKey,
  type ProjectChapter,
} from '../lib/iosCompat';

const router = Router();

router.use(requireAuth());
router.use(requireEntitlement());

router.get('/manuscripts', async (req, res) => {
  const rows = await db
    .select()
    .from(booksTable)
    .where(eq(booksTable.userId, req.userId!))
    .orderBy(desc(booksTable.updatedAt));
  const out = [];
  for (const row of rows) {
    const ensured = await ensureBookCompat(req.userId!, row.id);
    if (!ensured) continue;
    out.push(
      serializeManuscript({
        manuscriptId: ensured.compat.manuscriptId,
        title: row.title,
        updatedAt: row.updatedAt,
      }),
    );
  }
  res.json(out);
});

router.post('/manuscripts', async (req, res) => {
  const title = typeof req.body?.title === 'string' ? req.body.title : '';
  if (!title.trim()) {
    res.status(400).json({ message: 'title is required' });
    return;
  }
  const { manuscriptId, compat } = await createManuscriptBook(req.userId!, title);
  res.status(201).json(
    serializeManuscript({
      manuscriptId,
      title: title.trim(),
      updatedAt: new Date(),
    }),
  );
});

router.get('/manuscripts/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    res.status(400).json({ message: 'Invalid manuscript ID' });
    return;
  }
  const row = await getBookByManuscriptId(req.userId!, id);
  if (!row) {
    res.status(404).json({ message: 'Manuscript not found' });
    return;
  }
  res.json(
    serializeManuscript({
      manuscriptId: id,
      title: row.title,
      updatedAt: row.updatedAt,
    }),
  );
});

router.patch('/manuscripts/:id', async (req, res) => {
  const id = Number(req.params.id);
  const title = typeof req.body?.title === 'string' ? req.body.title : '';
  if (!Number.isInteger(id) || id < 1 || !title.trim()) {
    res.status(400).json({ message: 'title is required' });
    return;
  }
  const row = await getBookByManuscriptId(req.userId!, id);
  if (!row) {
    res.status(404).json({ message: 'Manuscript not found' });
    return;
  }
  const ensured = await ensureBookCompat(req.userId!, row.id);
  if (!ensured) {
    res.status(404).json({ message: 'Manuscript not found' });
    return;
  }
  const project = parseProject(ensured.row.project);
  project.title = title.trim();
  await saveBookProject(row.id, req.userId!, project, ensured.compat, title.trim());
  const [updated] = await db.select().from(booksTable).where(eq(booksTable.id, row.id)).limit(1);
  res.json(
    serializeManuscript({
      manuscriptId: id,
      title: title.trim(),
      updatedAt: updated?.updatedAt ?? new Date(),
    }),
  );
});

router.delete('/manuscripts/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    res.status(400).json({ message: 'Invalid manuscript ID' });
    return;
  }
  const row = await getBookByManuscriptId(req.userId!, id);
  if (!row) {
    res.status(404).json({ message: 'Manuscript not found' });
    return;
  }
  await db.delete(booksTable).where(and(eq(booksTable.id, row.id), eq(booksTable.userId, req.userId!)));
  res.status(204).send();
});

router.get('/chapters', async (req, res) => {
  const manuscriptId = Number(req.query.manuscriptId);
  if (!Number.isInteger(manuscriptId) || manuscriptId < 1) {
    res.status(400).json({ message: 'manuscriptId query param is required' });
    return;
  }
  const row = await getBookByManuscriptId(req.userId!, manuscriptId);
  if (!row) {
    res.status(404).json({ message: 'Manuscript not found' });
    return;
  }
  const ensured = await ensureBookCompat(req.userId!, row.id);
  if (!ensured) {
    res.status(404).json({ message: 'Manuscript not found' });
    return;
  }
  const project = parseProject(ensured.row.project);
  const chapters = project.chapters
    .map(ch => {
      const chapterId = getChapterNumericId(ensured.compat, ch.id);
      if (!chapterId) return null;
      return serializeChapter(ch, manuscriptId, chapterId, row.updatedAt);
    })
    .filter(Boolean);
  res.json(chapters);
});

router.post('/chapters', async (req, res) => {
  const manuscriptId = Number(req.body?.manuscriptId);
  const title = typeof req.body?.title === 'string' ? req.body.title : 'New Chapter';
  const order = typeof req.body?.order === 'number' ? req.body.order : undefined;
  if (!Number.isInteger(manuscriptId) || manuscriptId < 1) {
    res.status(400).json({ message: 'Invalid request body' });
    return;
  }
  const row = await getBookByManuscriptId(req.userId!, manuscriptId);
  if (!row) {
    res.status(404).json({ message: 'Manuscript not found' });
    return;
  }
  const ensured = await ensureBookCompat(req.userId!, row.id);
  if (!ensured) {
    res.status(404).json({ message: 'Manuscript not found' });
    return;
  }
  const project = parseProject(ensured.row.project);
  const chapterUuid = uuidv4();
  const chapterId = ensured.compat.nextChapterId++;
  ensured.compat.chapterIds[chapterUuid] = chapterId;
  const newChapter: ProjectChapter = {
    id: chapterUuid,
    title: title.trim(),
    sortOrder: order != null ? order - 1 : project.chapters.length,
    drops: {},
  };
  project.chapters.push(newChapter);
  await saveBookProject(row.id, req.userId!, project, ensured.compat);
  res.status(201).json(serializeChapter(newChapter, manuscriptId, chapterId, new Date()));
});

router.post('/chapters/reorder', async (req, res) => {
  const ids = req.body?.ids;
  if (!Array.isArray(ids) || ids.length === 0) {
    res.json([]);
    return;
  }
  const numericIds = ids.map((x: unknown) => Number(x));
  const manuscriptId = Number(req.body?.manuscriptId);
  if (!Number.isInteger(manuscriptId)) {
    res.status(400).json({ message: 'manuscriptId is required' });
    return;
  }
  const row = await getBookByManuscriptId(req.userId!, manuscriptId);
  if (!row) {
    res.status(404).json({ message: 'Manuscript not found' });
    return;
  }
  const ensured = await ensureBookCompat(req.userId!, row.id);
  if (!ensured) {
    res.status(404).json({ message: 'Manuscript not found' });
    return;
  }
  const project = parseProject(ensured.row.project);
  const byNumeric = new Map<number, ProjectChapter>();
  for (const ch of project.chapters) {
    const nid = getChapterNumericId(ensured.compat, ch.id);
    if (nid) byNumeric.set(nid, ch);
  }
  const reordered: ProjectChapter[] = [];
  numericIds.forEach((nid, index) => {
    const ch = byNumeric.get(nid);
    if (ch) {
      ch.sortOrder = index;
      reordered.push(ch);
    }
  });
  project.chapters = reordered;
  await saveBookProject(row.id, req.userId!, project, ensured.compat);
  res.json(
    reordered.map(ch => {
      const chapterId = getChapterNumericId(ensured.compat, ch.id)!;
      return serializeChapter(ch, manuscriptId, chapterId, row.updatedAt);
    }),
  );
});

router.get('/chapters/stats/summary', async (req, res) => {
  const manuscriptId = Number(req.query.manuscriptId);
  if (!Number.isInteger(manuscriptId) || manuscriptId < 1) {
    res.status(400).json({ message: 'manuscriptId query param is required' });
    return;
  }
  const row = await getBookByManuscriptId(req.userId!, manuscriptId);
  if (!row) {
    res.status(404).json({ message: 'Manuscript not found' });
    return;
  }
  const ensured = await ensureBookCompat(req.userId!, row.id);
  if (!ensured) {
    res.status(404).json({ message: 'Manuscript not found' });
    return;
  }
  const project = parseProject(ensured.row.project);
  let totalDrops = 0;
  let completedChapters = 0;
  const dropsPerLevel: { dropNumber: number; count: number }[] = [];
  const counts = new Map<number, number>();
  for (const ch of project.chapters) {
    const chapterId = getChapterNumericId(ensured.compat, ch.id);
    if (!chapterId) continue;
    const drops = projectToDrops(ch, chapterId, ensured.compat);
    totalDrops += drops.length;
    if (drops.length >= 6) completedChapters += 1;
    for (const d of drops) {
      counts.set(d.dropNumber, (counts.get(d.dropNumber) ?? 0) + 1);
    }
  }
  for (const [dropNumber, count] of counts) {
    dropsPerLevel.push({ dropNumber, count });
  }
  dropsPerLevel.sort((a, b) => a.dropNumber - b.dropNumber);
  const recent = project.chapters.slice(-5).map(ch => {
    const chapterId = getChapterNumericId(ensured.compat, ch.id)!;
    return serializeChapter(ch, manuscriptId, chapterId, row.updatedAt);
  });
  res.json({
    totalChapters: project.chapters.length,
    completedChapters,
    totalDrops,
    dropsPerLevel,
    recentChapters: recent,
  });
});

router.get('/chapters/:id', async (req, res) => {
  const chapterId = Number(req.params.id);
  if (!Number.isInteger(chapterId) || chapterId < 1) {
    res.status(400).json({ message: 'Invalid chapter ID' });
    return;
  }
  const rows = await db.select().from(booksTable).where(eq(booksTable.userId, req.userId!));
  for (const row of rows) {
    const ensured = await ensureBookCompat(req.userId!, row.id);
    if (!ensured) continue;
    const chapterUuid = findChapterUuid(ensured.compat, chapterId);
    if (!chapterUuid) continue;
    const project = parseProject(ensured.row.project);
    const ch = project.chapters.find(c => c.id === chapterUuid);
    if (!ch) continue;
    const drops = projectToDrops(ch, chapterId, ensured.compat);
    await saveBookProject(row.id, req.userId!, project, ensured.compat);
    res.json({
      ...serializeChapter(ch, ensured.compat.manuscriptId, chapterId, row.updatedAt),
      drops,
    });
    return;
  }
  res.status(404).json({ message: 'Chapter not found' });
});

router.patch('/chapters/:id', async (req, res) => {
  const chapterId = Number(req.params.id);
  if (!Number.isInteger(chapterId) || chapterId < 1) {
    res.status(400).json({ message: 'Invalid chapter ID' });
    return;
  }
  const rows = await db.select().from(booksTable).where(eq(booksTable.userId, req.userId!));
  for (const row of rows) {
    const ensured = await ensureBookCompat(req.userId!, row.id);
    if (!ensured) continue;
    const chapterUuid = findChapterUuid(ensured.compat, chapterId);
    if (!chapterUuid) continue;
    const project = parseProject(ensured.row.project);
    const ch = project.chapters.find(c => c.id === chapterUuid);
    if (!ch) continue;
    if (typeof req.body?.title === 'string') ch.title = req.body.title;
    if (typeof req.body?.order === 'number') ch.sortOrder = req.body.order - 1;
    await saveBookProject(row.id, req.userId!, project, ensured.compat);
    res.json(serializeChapter(ch, ensured.compat.manuscriptId, chapterId, new Date()));
    return;
  }
  res.status(404).json({ message: 'Chapter not found' });
});

router.delete('/chapters/:id', async (req, res) => {
  const chapterId = Number(req.params.id);
  if (!Number.isInteger(chapterId) || chapterId < 1) {
    res.status(400).json({ message: 'Invalid chapter ID' });
    return;
  }
  const rows = await db.select().from(booksTable).where(eq(booksTable.userId, req.userId!));
  for (const row of rows) {
    const ensured = await ensureBookCompat(req.userId!, row.id);
    if (!ensured) continue;
    const chapterUuid = findChapterUuid(ensured.compat, chapterId);
    if (!chapterUuid) continue;
    const project = parseProject(ensured.row.project);
    if (project.chapters.length <= 1) {
      res.status(400).json({ message: 'Cannot delete the only chapter' });
      return;
    }
    project.chapters = project.chapters.filter(c => c.id !== chapterUuid);
    delete ensured.compat.chapterIds[chapterUuid];
    await saveBookProject(row.id, req.userId!, project, ensured.compat);
    res.status(204).send();
    return;
  }
  res.status(404).json({ message: 'Chapter not found' });
});

router.get('/chapters/:id/drops', async (req, res) => {
  const chapterId = Number(req.params.id);
  if (!Number.isInteger(chapterId) || chapterId < 1) {
    res.status(400).json({ message: 'Invalid chapter ID' });
    return;
  }
  const rows = await db.select().from(booksTable).where(eq(booksTable.userId, req.userId!));
  for (const row of rows) {
    const ensured = await ensureBookCompat(req.userId!, row.id);
    if (!ensured) continue;
    const chapterUuid = findChapterUuid(ensured.compat, chapterId);
    if (!chapterUuid) continue;
    const project = parseProject(ensured.row.project);
    const ch = project.chapters.find(c => c.id === chapterUuid);
    if (!ch) continue;
    const drops = projectToDrops(ch, chapterId, ensured.compat);
    await saveBookProject(row.id, req.userId!, project, ensured.compat);
    res.json(drops);
    return;
  }
  res.status(404).json({ message: 'Chapter not found' });
});

router.put('/chapters/:id/drops', async (req, res) => {
  const chapterId = Number(req.params.id);
  const dropNumber = Number(req.body?.dropNumber);
  const content = typeof req.body?.content === 'string' ? req.body.content : '';
  const bulletPoints = Array.isArray(req.body?.bulletPoints) ? req.body.bulletPoints as string[] : [];
  if (!Number.isInteger(chapterId) || !Number.isInteger(dropNumber)) {
    res.status(400).json({ message: 'Invalid request body' });
    return;
  }
  const kind = `drop${dropNumber}` as 'drop1' | 'drop2' | 'drop3' | 'drop4' | 'drop5' | 'drop6';
  const rows = await db.select().from(booksTable).where(eq(booksTable.userId, req.userId!));
  for (const row of rows) {
    const ensured = await ensureBookCompat(req.userId!, row.id);
    if (!ensured) continue;
    const chapterUuid = findChapterUuid(ensured.compat, chapterId);
    if (!chapterUuid) continue;
    const project = parseProject(ensured.row.project);
    const ch = project.chapters.find(c => c.id === chapterUuid);
    if (!ch) continue;
    if (dropNumber === 4) {
      ch.drops.drop4 = bulletPoints.map(b => `• ${b}`).join('\n');
    } else {
      ch.drops[kind] = content;
    }
    const key = dropKey(chapterId, dropNumber);
    if (!ensured.compat.dropIds[key]) {
      ensured.compat.dropIds[key] = ensured.compat.nextDropId++;
    }
    await saveBookProject(row.id, req.userId!, project, ensured.compat);
    const drops = projectToDrops(ch, chapterId, ensured.compat);
    const drop = drops.find(d => d.dropNumber === dropNumber);
    res.json(drop ?? {
      id: ensured.compat.dropIds[key],
      chapterId,
      dropNumber,
      content,
      bulletPoints,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    return;
  }
  res.status(404).json({ message: 'Chapter not found' });
});

export default router;
