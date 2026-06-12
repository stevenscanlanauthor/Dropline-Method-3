import {
  bookDrop6Chars,
  bookDrop6Words,
  chapterDropStats,
  readingMinutes,
} from '../lib/stats';
import { DROP_KIND_META, type DropKind } from '@dropline/core';
import type { Chapter, ViewMode } from '../lib/types';

interface Props {
  chapter: Chapter | null;
  chapters: Chapter[];
  selectedDrop: DropKind;
  autosaveLabel: string;
  viewMode: ViewMode;
  focusMode: boolean;
}

const VIEW_LABELS: Record<Exclude<ViewMode, 'editor'>, string> = {
  corkboard: 'Corkboard',
  preview: 'Preview',
};

export default function StatusBar({
  chapter,
  chapters,
  selectedDrop,
  autosaveLabel,
  viewMode,
  focusMode,
}: Props) {
  const chapterStats = chapter ? chapterDropStats(chapter, selectedDrop) : { words: 0, chars: 0 };
  const bookWords = bookDrop6Words(chapters);
  const bookChars = bookDrop6Chars(chapters);
  const dropLabel = DROP_KIND_META[selectedDrop].title;

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
      <span title={`${dropLabel} in this chapter`}>
        Chapter · <strong className="text-[var(--ink)]">{chapterStats.words}</strong> words ·{' '}
        <strong className="text-[var(--ink)]">{chapterStats.chars}</strong> chars
      </span>
      <span className="status-divider hidden sm:block" aria-hidden />
      <span title="Drop 6 manuscript total">
        Book · <strong className="text-[var(--ink)]">{bookWords}</strong> words ·{' '}
        <strong className="text-[var(--ink)]">{bookChars}</strong> chars
      </span>
      <span className="status-divider hidden md:block" aria-hidden />
      <span className="hidden md:inline" title="Estimated read time from Drop 6 word count">
        Read <strong className="text-[var(--ink)]">{readingMinutes(bookWords)} min</strong>
      </span>
      <span className="ml-auto truncate">
        Autosave · <strong className="text-[var(--ink)]">{autosaveLabel}</strong>
      </span>
    </footer>
  );
}
