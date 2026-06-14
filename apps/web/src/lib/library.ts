import type { Project } from './types';
import { migrateProject, serialiseProject } from './project';
import { loadAutosave } from './storage';
import { deleteCloudBook, fetchCloudBook, fetchCloudLibrary, saveCloudBook } from './cloud-library';

const LIBRARY_INDEX_KEY = 'dropline-library-v1';
const BOOK_PREFIX = 'dropline-book-';
const LEGACY_MIGRATED_KEY = 'dropline-library-legacy-migrated';

export interface BookMeta {
  id: string;
  title: string;
  authorName: string;
  updatedAt: string;
}

export type BookLibrarySort = 'recent' | 'a-z' | 'z-a';

const SORT_PREF_KEY = 'dropline-library-sort-v1';

let currentUserId: string | null = null;

interface LibraryIndex {
  books: BookMeta[];
}

export function setLibraryUserId(userId: string | null): void {
  currentUserId = userId;
}

function libraryIndexKey(): string {
  return currentUserId ? `${LIBRARY_INDEX_KEY}-${currentUserId}` : LIBRARY_INDEX_KEY;
}

function legacyMigratedKey(): string {
  return currentUserId ? `${LEGACY_MIGRATED_KEY}-${currentUserId}` : LEGACY_MIGRATED_KEY;
}

function bookStorageKey(id: string): string {
  const prefix = currentUserId ? `${BOOK_PREFIX}${currentUserId}-` : BOOK_PREFIX;
  return `${prefix}${id}`;
}

function loadIndex(): LibraryIndex {
  try {
    const raw = localStorage.getItem(libraryIndexKey());
    if (!raw) return { books: [] };
    const parsed = JSON.parse(raw) as LibraryIndex;
    return { books: Array.isArray(parsed.books) ? parsed.books : [] };
  } catch {
    return { books: [] };
  }
}

function saveIndex(index: LibraryIndex): void {
  localStorage.setItem(libraryIndexKey(), JSON.stringify(index));
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
  if (localStorage.getItem(legacyMigratedKey())) return;
  const index = loadIndex();
  if (index.books.length > 0) {
    localStorage.setItem(legacyMigratedKey(), '1');
    return;
  }
  const legacy = loadAutosave();
  if (legacy) {
    const id = crypto.randomUUID();
    const project = migrateProject(legacy);
    upsertBook(id, project);
  }
  localStorage.setItem(legacyMigratedKey(), '1');
}

export async function syncLibraryFromCloud(): Promise<void> {
  if (!currentUserId) return;
  const cloud = await fetchCloudLibrary();
  if (!cloud) return;
  const index = loadIndex();
  for (const meta of cloud) {
    const local = index.books.find(b => b.id === meta.id);
    const cloudNewer = !local || meta.updatedAt > local.updatedAt;
    if (cloudNewer) {
      const remote = await fetchCloudBook(meta.id);
      if (remote) {
        localStorage.setItem(bookStorageKey(meta.id), serialiseProject(remote));
        if (local) {
          const at = index.books.findIndex(b => b.id === meta.id);
          if (at >= 0) index.books[at] = meta;
        } else {
          index.books.unshift(meta);
        }
      }
    } else if (!local) {
      index.books.unshift(meta);
    }
  }
  saveIndex(index);
  for (const local of index.books) {
    const proj = loadBook(local.id);
    if (proj) void saveCloudBook(local.id, proj, local.updatedAt);
  }
}

export function loadLibrarySort(): BookLibrarySort {
  try {
    const raw = localStorage.getItem(SORT_PREF_KEY);
    if (raw === 'recent' || raw === 'a-z' || raw === 'z-a') return raw;
  } catch {
    /* ignore */
  }
  return 'recent';
}

export function saveLibrarySort(sort: BookLibrarySort): void {
  localStorage.setItem(SORT_PREF_KEY, sort);
}

export function sortBooks(books: BookMeta[], sort: BookLibrarySort): BookMeta[] {
  const copy = [...books];
  if (sort === 'a-z') {
    return copy.sort((a, b) => {
      const byTitle = a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
      return byTitle !== 0 ? byTitle : b.updatedAt.localeCompare(a.updatedAt);
    });
  }
  if (sort === 'z-a') {
    return copy.sort((a, b) => {
      const byTitle = b.title.localeCompare(a.title, undefined, { sensitivity: 'base' });
      return byTitle !== 0 ? byTitle : b.updatedAt.localeCompare(a.updatedAt);
    });
  }
  return copy.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function listBooks(): BookMeta[] {
  migrateLegacyAutosaveToLibrary();
  return loadIndex().books;
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
  void saveCloudBook(id, next, meta.updatedAt);
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
  void deleteCloudBook(id);
}
