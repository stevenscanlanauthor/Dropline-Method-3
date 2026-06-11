import { DROP_KINDS, type DropKind } from './dropKind.js';
import { dropPlainText } from './dropRules.js';
import type { ChapterDrops } from './dropRules.js';

export interface CompileChapter extends ChapterDrops {
  id: string;
}

export interface CompileOptions {
  title: string;
  authorName: string;
  authorContact: string;
  chapters: CompileChapter[];
  includeTitlePage: boolean;
}

/** Only Drop 6 (final draft) is compiled into the manuscript. */
function bestAvailableChapterText(chapter: ChapterDrops): string {
  return dropPlainText(chapter, 'drop6');
}

export function compiledText(options: CompileOptions): string {
  const parts: string[] = [];
  const cleanedAuthor = options.authorName.trim();
  const cleanedContact = options.authorContact.trim();
  const cleanedTitle = options.title.trim() || 'Untitled Manuscript';

  if (options.includeTitlePage) {
    if (cleanedAuthor) parts.push(cleanedAuthor);
    if (cleanedContact) parts.push(cleanedContact);
    if (cleanedAuthor || cleanedContact) parts.push('');
    parts.push(cleanedTitle, '', '');
  }

  let includedAnyChapterText = false;

  options.chapters.forEach((chapter, index) => {
    const chapterTitle = chapter.title.trim() || `Chapter ${index + 1}`;
    const text = bestAvailableChapterText(chapter);
    if (!text) return;
    includedAnyChapterText = true;
    parts.push(chapterTitle, '', text, '');
  });

  if (!options.includeTitlePage && !includedAnyChapterText) {
    return 'No manuscript text available yet.';
  }

  if (options.includeTitlePage && !includedAnyChapterText) {
    return parts.join('\n');
  }

  return parts.join('\n');
}
