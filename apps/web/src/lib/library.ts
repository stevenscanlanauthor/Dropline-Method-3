import type { Project } from './types';
import { migrateProject, serialiseProject } from './project';
import { loadAutosave } from './storage';

const LIBRARY_INDEX_KEY = 'dropline-library-v1';
const BOOK_PREFIX = 'dropline-book-';
const LEGACY_MIGRATED_KEY = 'dropline-library-legacy-migrated';

export interface BookMeta {
  id: string;
  title: string;
  authorName: string;
  updatedAt: string;
}

interface LibraryIndex {
  books: BookMeta[];
}

function bookStorageKey(id: string): string {
  return `${BOOK_PREFIX}${id}`;
}

function loadIndex(): LibraryIndex {
  try {
    const raw = localStorage.getItem(LIBRARY_INDEX_KEY);
    if (!raw) return { books: [] };
    const parsed = JSON.parse(raw) as LibraryIndex;
    return { books: Array.isArray(parsed.books) ? parsed.books : [] };
  } catch {
    return { books: [] };
  }
}

function saveIndex(index: LibraryIndex): void {
  localStorage.setItem(LIBRARY_INDEX_KEY, JSON.stringify(index));
}

function metaFromProject(id: string, project: Project): BookMeta {
  return {
    id,
    title: project.title.trim() || 'Untitled Project',
    authorName: project.authorName.trim(),
    updatedAt: project.updatedAt || new Date().toISOString(),
  };
}

/** One-time import of the old single-book autosave into the library. */
export function migrateLegacyAutosaveToLibrary(): void {
  if (localStorage.getItem(LEGACY_MIGRATED_KEY)) return;
  const index = loadIndex();
  if (index.books.length > 0) {
    localStorage.setItem(LEGACY_MIGRATED_KEY, '1');
    return;
  }
  const legacy = loadAutosave();
  if (legacy) {
    const id = crypto.randomUUID();
    const project = migrateProject(legacy);
    upsertBook(id, project);
  }
  localStorage.setItem(LEGACY_MIGRATED_KEY, '1');
}

export function listBooks(): BookMeta[] {
  migrateLegacyAutosaveToLibrary();
  return loadIndex().books.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function loadBook(id: string): Project | null {
  try {
    const raw = localStorage.getItem(bookStorageKey(id));
    if (!raw) return null;
    return migrateProject(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function upsertBook(id: string, project: Project): BookMeta {
  const next: Project = {
    ...project,
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(bookStorageKey(id), serialiseProject(next));
  const meta = metaFromProject(id, next);
  const index = loadIndex();
  const at = index.books.findIndex(b => b.id === id);
  if (at >= 0) index.books[at] = meta;
  else index.books.unshift(meta);
  saveIndex(index);
  return meta;
}

export function createBook(project: Project): string {
  const id = crypto.randomUUID();
  upsertBook(id, project);
  return id;
}

export function deleteBook(id: string): void {
  localStorage.removeItem(bookStorageKey(id));
  const index = loadIndex();
  index.books = index.books.filter(b => b.id !== id);
  saveIndex(index);
}
