import { DEFAULT_AUTOSAVE_INTERVAL, normaliseAutosaveInterval } from './autosave';
import type { Project, Chapter, ProjectSettings } from './types';

export const DEFAULT_SETTINGS: ProjectSettings = {
  focusMode: false,
  editorWidth: 720,
  sidebarWidth: 224,
  inspectorWidth: 256,
  manuscriptMode: true,
  corkboardMode: false,
  inspectorVisible: true,
  previewMode: false,
  chapterTarget: 2500,
  bookTarget: 80000,
  autosaveIntervalSec: DEFAULT_AUTOSAVE_INTERVAL,
};

function mergeSettings(settings?: Partial<ProjectSettings>): ProjectSettings {
  return {
    ...DEFAULT_SETTINGS,
    ...settings,
    autosaveIntervalSec: normaliseAutosaveInterval(settings?.autosaveIntervalSec),
  };
}

export function createChapter(title = 'Untitled Chapter', sortOrder = 0): Chapter {
  return { id: crypto.randomUUID(), title, sortOrder, drops: {} };
}

export function createDefaultProject(): Project {
  return {
    app: 'Dropline',
    schemaVersion: 2,
    title: 'Untitled Project',
    authorName: '',
    authorContact: '',
    promise: '',
    updatedAt: new Date().toISOString(),
    settings: { ...DEFAULT_SETTINGS },
    chapters: [
      createChapter('Chapter 1', 0),
      createChapter('Chapter 2', 1),
      createChapter('Chapter 3', 2),
    ],
  };
}

export function createSampleProject(): Project {
  const ch1 = createChapter('Opening pressure', 0);
  ch1.drops.drop2 = '<p>The letter arrives on the day the river freezes.</p>';
  ch1.drops.drop3 = '<p>Mara has avoided the bridge for years, but the summons forces her back toward the town she fled.</p>';
  ch1.drops.drop4 = '<p>• Rest beat before the crossing</p><p>• What does Mara fear losing if she returns?</p>';
  ch1.drops.drop5 = '<p>The ice groaned under her boots before she saw the envelope.</p>';
  ch1.drops.drop6 = '<p>The ice groaned under her boots before she saw the envelope. Mara tucked the letter inside her coat and kept walking, as if speed could outrun whatever waited on the other bank.</p>';

  const ch2 = createChapter('The bridge', 1);
  ch2.drops.drop2 = '<p>Every witness on the bridge remembers a different silence.</p>';

  return {
    app: 'Dropline',
    schemaVersion: 2,
    title: 'Sample Dropline Novel',
    authorName: 'Your Name',
    authorContact: '',
    promise: 'A tense return-home story told one drop at a time.',
    updatedAt: new Date().toISOString(),
    settings: { ...DEFAULT_SETTINGS },
    chapters: [ch1, ch2, createChapter('Aftermath', 2)],
  };
}

export function migrateProject(raw: unknown): Project {
  if (!raw || typeof raw !== 'object') throw new Error('Invalid project file');
  const data = raw as Record<string, unknown>;

  if (data.schemaVersion === 2 && Array.isArray(data.chapters)) {
    const project = data as unknown as Project;
    return {
      ...project,
      settings: mergeSettings(project.settings),
    };
  }

  if (data.schemaVersion === 1 && Array.isArray(data.items)) {
    const items = data.items as Array<{
      id: string;
      heading: string;
      beat: string;
      paragraph: string;
      notes: string;
      firstPage: string;
    }>;
    const chapters: Chapter[] = items.map((item, i) => ({
      id: item.id,
      title: item.heading || `Chapter ${i + 1}`,
      sortOrder: i,
      drops: {
        drop2: item.beat ? `<p>${escape(item.beat)}</p>` : undefined,
        drop3: item.paragraph ? `<p>${escape(item.paragraph)}</p>` : undefined,
        drop4: item.notes ? item.notes.split('\n').map(l => `<p>${escape(l)}</p>`).join('') : undefined,
        drop5: item.firstPage ? `<p>${escape(item.firstPage)}</p>` : undefined,
        drop6: item.firstPage ? `<p>${escape(item.firstPage)}</p>` : undefined,
      },
    }));
    return {
      app: 'Dropline',
      schemaVersion: 2,
      title: String(data.title ?? 'Untitled Project'),
      authorName: '',
      authorContact: '',
      promise: String(data.promise ?? ''),
      updatedAt: String(data.updatedAt ?? new Date().toISOString()),
      settings: { ...DEFAULT_SETTINGS },
      chapters,
    };
  }

  throw new Error('Unrecognised project format');
}

function escape(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function serialiseProject(project: Project): string {
  return JSON.stringify({ ...project, updatedAt: new Date().toISOString() }, null, 2);
}

export function reorderChapters(project: Project, ids: string[]): Project {
  const map = new Map(project.chapters.map(c => [c.id, c]));
  const chapters = ids.map((id, i) => {
    const ch = map.get(id);
    if (!ch) throw new Error('Missing chapter');
    return { ...ch, sortOrder: i };
  });
  return { ...project, chapters };
}

export function duplicateChapter(project: Project, id: string): Project {
  const src = project.chapters.find(c => c.id === id);
  if (!src) return project;
  const copy = createChapter(`${src.title} Copy`, project.chapters.length);
  copy.drops = { ...src.drops };
  return { ...project, chapters: [...project.chapters, copy] };
}
