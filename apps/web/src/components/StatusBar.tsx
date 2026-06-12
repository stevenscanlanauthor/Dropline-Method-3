import { bookDrop6Words, chapterDrop6Words, readingMinutes } from '../lib/stats';
import type { Chapter, ViewMode } from '../lib/types';

interface Props {
  chapter: Chapter | null;
  chapters: Chapter[];
  autosaveLabel: string;
  viewMode: ViewMode;
  focusMode: boolean;
}

const VIEW_LABELS: Record<Exclude<ViewMode, 'editor'>, string> = {
  corkboard: 'Corkboard',
  preview: 'Preview',
};

export default function StatusBar({ chapter, chapters, autosaveLabel, viewMode, focusMode }: Props) {
  const chapterWords = chapter ? chapterDrop6Words(chapter) : 0;
  const bookWords = bookDrop6Words(chapters);

  return (
    <footer className="shrink-0 border-t border-[var(--border)] bg-[var(--surface)] px-4 py-2 flex flex-wrap items-center gap-3 text-xs text-[var(--muted)]">
      {viewMode !== 'editor' && (
        <>
          <span className="view-badge">{VIEW_LABELS[viewMode]}</span>
          <span className="status-divider hidden sm:block" aria-hidden />
        </>
      )}
      {focusMode && (
        <>
          <span className="view-badge">Focus</span>
          <span className="status-divider hidden sm:block" aria-hidden />
        </>
      )}
      <span>
        Chapter <strong className="text-[var(--ink)]">{chapterWords}</strong> words
      </span>
      <span className="status-divider hidden sm:block" aria-hidden />
      <span>
        Book <strong className="text-[var(--ink)]">{bookWords}</strong> words
      </span>
      <span className="status-divider hidden md:block" aria-hidden />
      <span className="hidden md:inline">
        Read <strong className="text-[var(--ink)]">{readingMinutes(bookWords)} min</strong>
      </span>
      <span className="ml-auto truncate">
        Autosave · <strong className="text-[var(--ink)]">{autosaveLabel}</strong>
      </span>
    </footer>
  );
}
