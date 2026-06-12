import type { DropKind } from '@dropline/core';
import type { AutosaveIntervalSec } from './autosave';

export interface Chapter {
  id: string;
  title: string;
  sortOrder: number;
  drops: Partial<Record<DropKind, string>>;
}

export interface ProjectSettings {
  focusMode: boolean;
  editorWidth: number;
  sidebarWidth: number;
  inspectorWidth: number;
  manuscriptMode: boolean;
  corkboardMode: boolean;
  inspectorVisible: boolean;
  previewMode: boolean;
  chapterTarget: number;
  bookTarget: number;
  autosaveIntervalSec: AutosaveIntervalSec;
}

export interface Project {
  app: string;
  schemaVersion: number;
  title: string;
  authorName: string;
  authorContact: string;
  promise: string;
  updatedAt: string;
  settings: ProjectSettings;
  chapters: Chapter[];
}

export type ViewMode = 'editor' | 'corkboard' | 'preview';
