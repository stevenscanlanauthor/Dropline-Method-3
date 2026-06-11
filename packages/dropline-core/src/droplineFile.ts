import { DROP_KINDS, type DropKind } from './dropKind.js';
import { plainToHtml } from './dropRules.js';

export const DROPLINE_FORMAT = 'dropline-single-file-v1';

function base64Decode(encoded: string): Uint8Array {
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(encoded, 'base64'));
  }
  return Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));
}

function base64Encode(bytes: Uint8Array): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }
  return btoa(String.fromCharCode(...bytes));
}

function newId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export interface DroplineChapter {
  id: string;
  title: string;
  drops: Partial<Record<DropKind, string>>;
}

export interface DroplineProject {
  title: string;
  chapters: DroplineChapter[];
}

/** Best-effort RTF → plain text for .dropline import. */
export function rtfToPlain(rtf: Uint8Array | string): string {
  const text = typeof rtf === 'string' ? rtf : new TextDecoder('utf-8', { fatal: false }).decode(rtf);
  if (!text.includes('\\')) return text;
  // Strip RTF control words; keep visible text
  return text
    .replace(/\\par[d]?/g, '\n')
    .replace(/\\line/g, '\n')
    .replace(/\\tab/g, '\t')
    .replace(/\\'[0-9a-f]{2}/gi, ' ')
    .replace(/\\[a-z]+-?\d*\s?/gi, '')
    .replace(/[{}]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function parseDroplineFile(json: string | object): DroplineProject {
  const object = typeof json === 'string' ? JSON.parse(json) : json;
  if (object?.format !== DROPLINE_FORMAT) {
    throw new Error('Unsupported .dropline format');
  }

  const title = object.title ?? 'Untitled Project';
  const rawChapters: unknown[] = object.chapters ?? [];
  const chapters: DroplineChapter[] = [];

  for (const raw of rawChapters) {
    if (!raw || typeof raw !== 'object') continue;
    const r = raw as Record<string, unknown>;
    const id = typeof r.id === 'string' ? r.id : newId();
    const chapterTitle = typeof r.title === 'string' ? r.title : 'Untitled Chapter';
    const rawDrops = (r.drops ?? {}) as Record<string, string>;
    const drops: Partial<Record<DropKind, string>> = {};

    for (const kind of DROP_KINDS) {
      const encoded = rawDrops[kind];
      if (!encoded) continue;
      try {
        const bytes = base64Decode(encoded);
        const plain = rtfToPlain(bytes);
        drops[kind] = plainToHtml(plain);
      } catch {
        // skip invalid drop
      }
    }

    chapters.push({ id, title: chapterTitle, drops });
  }

  if (chapters.length === 0) {
    chapters.push({ id: newId(), title: 'Chapter 1', drops: {} });
  }

  return { title, chapters };
}

/** Encode cloud project back to dropline-single-file-v1 (plain text as minimal RTF). */
export function encodeDroplineFile(project: DroplineProject): string {
  const rawChapters = project.chapters.map((chapter) => {
    const rawDrops: Record<string, string> = {};
    for (const kind of DROP_KINDS) {
      const html = chapter.drops[kind];
      if (!html) continue;
      const plain = html.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '').trim();
      if (!plain) continue;
      const rtf = `{\\rtf1\\ansi ${plain.replace(/\n/g, '\\par ')}}`;
      rawDrops[kind] = base64Encode(new TextEncoder().encode(rtf));
    }
    return { id: chapter.id, title: chapter.title, drops: rawDrops };
  });

  return JSON.stringify(
    { format: DROPLINE_FORMAT, title: project.title, chapters: rawChapters },
    null,
    2,
  );
}

export function newProject(title = 'Untitled Project'): DroplineProject {
  return {
    title,
    chapters: [{ id: newId(), title: 'Chapter 1', drops: {} }],
  };
}
