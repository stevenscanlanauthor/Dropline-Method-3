import { v4 as uuidv4 } from 'uuid';
import { db, booksTable } from '@dropline/db';
import { and, eq, sql } from 'drizzle-orm';

export interface IosCompatMeta {
  manuscriptId: number;
  nextChapterId: number;
  nextDropId: number;
  chapterIds: Record<string, number>;
  dropIds: Record<string, number>;
}

export interface ProjectChapter {
  id: string;
  title: string;
  sortOrder: number;
  drops: Partial<Record<string, string>>;
}

export interface ProjectData {
  title?: string;
  authorName?: string;
  chapters: ProjectChapter[];
  updatedAt?: string;
}

function defaultProject(title: string): ProjectData {
  const chId = uuidv4();
  return {
    title,
    authorName: '',
    chapters: [{ id: chId, title: 'Chapter 1', sortOrder: 0, drops: {} }],
    updatedAt: new Date().toISOString(),
  };
}

function parseCompat(raw: unknown): IosCompatMeta | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.manuscriptId !== 'number') return null;
  return {
    manuscriptId: o.manuscriptId,
    nextChapterId: typeof o.nextChapterId === 'number' ? o.nextChapterId : 1,
    nextDropId: typeof o.nextDropId === 'number' ? o.nextDropId : 1,
    chapterIds: (o.chapterIds as Record<string, number>) ?? {},
    dropIds: (o.dropIds as Record<string, number>) ?? {},
  };
}

function parseProject(raw: unknown): ProjectData {
  if (!raw || typeof raw !== 'object') return defaultProject('Untitled Project');
  const o = raw as Record<string, unknown>;
  const chapters = Array.isArray(o.chapters) ? o.chapters as ProjectChapter[] : [];
  return {
    title: typeof o.title === 'string' ? o.title : 'Untitled Project',
    authorName: typeof o.authorName === 'string' ? o.authorName : '',
    chapters: chapters.length > 0 ? chapters : defaultProject('Untitled Project').chapters,
    updatedAt: typeof o.updatedAt === 'string' ? o.updatedAt : new Date().toISOString(),
  };
}

async function nextManuscriptId(): Promise<number> {
  const [row] = await db
    .select({
      maxId: sql<number>`COALESCE(MAX((${booksTable.iosCompat}->>'manuscriptId')::int), 0)`,
    })
    .from(booksTable);
  return (row?.maxId ?? 0) + 1;
}

export async function getBookByManuscriptId(userId: string, manuscriptId: number) {
  const rows = await db
    .select()
    .from(booksTable)
    .where(eq(booksTable.userId, userId));
  for (const row of rows) {
    const compat = parseCompat(row.iosCompat);
    if (compat?.manuscriptId === manuscriptId) return row;
  }
  return null;
}

export async function ensureBookCompat(userId: string, bookId: string) {
  const [row] = await db
    .select()
    .from(booksTable)
    .where(and(eq(booksTable.userId, userId), eq(booksTable.id, bookId)))
    .limit(1);
  if (!row) return null;
  let compat = parseCompat(row.iosCompat);
  if (!compat) {
    compat = {
      manuscriptId: await nextManuscriptId(),
      nextChapterId: 1,
      nextDropId: 1,
      chapterIds: {},
      dropIds: {},
    };
    const project = parseProject(row.project);
    for (const ch of project.chapters) {
      const numId = compat.nextChapterId++;
      compat.chapterIds[ch.id] = numId;
    }
    await db
      .update(booksTable)
      .set({ iosCompat: compat })
      .where(eq(booksTable.id, bookId));
  }
  return { row, compat };
}

export async function createManuscriptBook(userId: string, title: string) {
  const now = new Date();
  const bookId = uuidv4();
  const project = defaultProject(title.trim());
  const manuscriptId = await nextManuscriptId();
  const chapterUuid = project.chapters[0]!.id;
  const compat: IosCompatMeta = {
    manuscriptId,
    nextChapterId: 2,
    nextDropId: 1,
    chapterIds: { [chapterUuid]: 1 },
    dropIds: {},
  };
  await db.insert(booksTable).values({
    id: bookId,
    userId,
    title: title.trim(),
    authorName: '',
    project: { ...project, app: 'dropline3', schemaVersion: 1 },
    iosCompat: compat,
    createdAt: now,
    updatedAt: now,
  });
  return { bookId, manuscriptId, compat, project };
}

export function serializeManuscript(opts: {
  manuscriptId: number;
  title: string;
  updatedAt: Date;
}) {
  return {
    id: opts.manuscriptId,
    title: opts.title,
    updatedAt: opts.updatedAt.toISOString(),
  };
}

export function getChapterNumericId(compat: IosCompatMeta, chapterUuid: string): number | null {
  return compat.chapterIds[chapterUuid] ?? null;
}

export function findChapterUuid(compat: IosCompatMeta, chapterId: number): string | null {
  for (const [uuid, id] of Object.entries(compat.chapterIds)) {
    if (id === chapterId) return uuid;
  }
  return null;
}

export function dropKey(chapterId: number, dropNumber: number): string {
  return `${chapterId}-${dropNumber}`;
}

export function projectToDrops(chapter: ProjectChapter, chapterId: number, compat: IosCompatMeta) {
  const drops: Array<{
    id: number;
    chapterId: number;
    dropNumber: number;
    content: string;
    bulletPoints: string[];
    createdAt: string;
    updatedAt: string;
  }> = [];
  const now = new Date().toISOString();
  for (let n = 1; n <= 6; n++) {
    const kind = `drop${n}` as keyof typeof chapter.drops;
    const raw = chapter.drops[kind];
    if (n === 4) {
      const bullets = raw
        ? raw.split('\n').map(l => l.replace(/^[\s•*-]+/, '').trim()).filter(Boolean)
        : [];
      if (bullets.length === 0) continue;
      const key = dropKey(chapterId, n);
      let dropId = compat.dropIds[key];
      if (!dropId) {
        dropId = compat.nextDropId++;
        compat.dropIds[key] = dropId;
      }
      drops.push({
        id: dropId,
        chapterId,
        dropNumber: n,
        content: '',
        bulletPoints: bullets,
        createdAt: now,
        updatedAt: now,
      });
      continue;
    }
    if (!raw || !String(raw).trim()) continue;
    const key = dropKey(chapterId, n);
    let dropId = compat.dropIds[key];
    if (!dropId) {
      dropId = compat.nextDropId++;
      compat.dropIds[key] = dropId;
    }
    drops.push({
      id: dropId,
      chapterId,
      dropNumber: n,
      content: String(raw),
      bulletPoints: [],
      createdAt: now,
      updatedAt: now,
    });
  }
  return drops;
}

export function serializeChapter(
  chapter: ProjectChapter,
  manuscriptId: number,
  chapterId: number,
  updatedAt: Date,
) {
  return {
    id: chapterId,
    manuscriptId,
    title: chapter.title,
    order: chapter.sortOrder + 1,
    createdAt: updatedAt.toISOString(),
    updatedAt: updatedAt.toISOString(),
  };
}

export async function saveBookProject(
  bookId: string,
  userId: string,
  project: ProjectData,
  compat: IosCompatMeta,
  title?: string,
) {
  const now = new Date();
  await db
    .update(booksTable)
    .set({
      project: { ...project, updatedAt: now.toISOString() },
      iosCompat: compat,
      title: title ?? project.title ?? 'Untitled Project',
      updatedAt: now,
    })
    .where(and(eq(booksTable.id, bookId), eq(booksTable.userId, userId)));
}

export { parseProject, parseCompat };
