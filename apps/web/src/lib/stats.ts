import { dropPlainText, wordCount, type DropKind } from '@dropline/core';
import type { Chapter } from './types';

export function chapterDrop6Words(chapter: Chapter): number {
  return wordCount(dropPlainText({ title: chapter.title, drops: chapter.drops }, 'drop6'));
}

export function bookDrop6Words(chapters: Chapter[]): number {
  return chapters.reduce((sum, ch) => sum + chapterDrop6Words(ch), 0);
}

export function readingMinutes(words: number): number {
  return Math.max(1, Math.round(words / 200));
}

export function dropProgress(chapter: Chapter, drop: DropKind | 'drop1'): boolean {
  if (drop === 'drop1') {
    const t = chapter.title.trim();
    return t.length > 0 && t !== 'Chapter 1' && t !== 'Untitled Chapter';
  }
  const text = dropPlainText({ title: chapter.title, drops: chapter.drops }, drop);
  if (drop === 'drop4') return text.split('\n').some(l => l.trim().startsWith('•'));
  return text.length > 0;
}
