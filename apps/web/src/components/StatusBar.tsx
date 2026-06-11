import { bookDrop6Words, chapterDrop6Words, readingMinutes } from '../lib/stats';
import type { Chapter } from '../lib/types';

interface Props {
  chapter: Chapter | null;
  chapters: Chapter[];
  autosaveLabel: string;
}

export default function StatusBar({ chapter, chapters, autosaveLabel }: Props) {
  const chapterWords = chapter ? chapterDrop6Words(chapter) : 0;
  const bookWords = bookDrop6Words(chapters);

  return (
    <footer className="shrink-0 border-t border-[var(--border)] bg-white px-4 py-2 flex flex-wrap items-center gap-4 text-xs text-[var(--muted)]">
      <span>
        Chapter Words <strong className="text-[var(--ink)]">{chapterWords}</strong>
      </span>
      <span>
        Book Words <strong className="text-[var(--ink)]">{bookWords}</strong>
      </span>
      <span>
        Chapter Read <strong className="text-[var(--ink)]">{readingMinutes(chapterWords)} min</strong>
      </span>
      <span>
        Book Read <strong className="text-[var(--ink)]">{readingMinutes(bookWords)} min</strong>
      </span>
      <span className="ml-auto">
        Autosave <strong className="text-[var(--ink)]">{autosaveLabel}</strong>
      </span>
    </footer>
  );
}
