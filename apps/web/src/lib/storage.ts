import type { Project } from './types';
import { serialiseProject } from './project';

const AUTOSAVE_KEY = 'dropline-autosave-v2';
const BACKUP_PREFIX = 'dropline-backup-';

export function loadAutosave(): Project | null {
  try {
    const raw = localStorage.getItem(AUTOSAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Project;
  } catch {
    return null;
  }
}

export function saveAutosave(project: Project): void {
  localStorage.setItem(AUTOSAVE_KEY, serialiseProject(project));
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  try {
    localStorage.setItem(`${BACKUP_PREFIX}${stamp}`, serialiseProject(project));
    pruneBackups();
  } catch {
    /* storage full — primary autosave still saved */
  }
}

function pruneBackups(): void {
  const keys = Object.keys(localStorage)
    .filter(k => k.startsWith(BACKUP_PREFIX))
    .sort()
    .reverse();
  keys.slice(8).forEach(k => localStorage.removeItem(k));
}

export function downloadFile(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
