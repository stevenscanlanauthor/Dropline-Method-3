import { dropPlainText, wordCount, type DropKind } from '@dropline/core';
import type { Chapter } from './types';

export function dropPlain(chapter: Chapter, drop: DropKind): string {
  return dropPlainText({ title: chapter.title, drops: chapter.drops }, drop);
}

export function textWords(text: string): number {
  return wordCount(text);
}

export function textChars(text: string): number {
  return text.length;
}

export function chapterDropStats(chapter: Chapter, drop: DropKind): { words: number; chars: number } {
  const text = dropPlain(chapter, drop);
  return { words: textWords(text), chars: textChars(text) };
}

export function chapterDrop6Words(chapter: Chapter): number {
  return textWords(dropPlain(chapter, 'drop6'));
}

export function bookDrop6Words(chapters: Chapter[]): number {
  return chapters.reduce((sum, ch) => sum + chapterDrop6Words(ch), 0);
}

export function bookDrop6Chars(chapters: Chapter[]): number {
  return chapters.reduce((sum, ch) => sum + textChars(dropPlain(ch, 'drop6')), 0);
}

export function readingMinutes(words: number): number {
  return Math.max(1, Math.round(words / 200));
}

export function dropProgress(chapter: Chapter, drop: DropKind | 'drop1'): boolean {
  if (drop === 'drop1') {
    const t = chapter.title.trim();
    return t.length > 0 && t !== 'Chapter 1' && t !== 'Untitled Chapter';
  }
  const text = dropPlain(chapter, drop);
  if (drop === 'drop4') return text.split('\n').some(l => l.trim().startsWith('•') || /^\d+\.\s/.test(l.trim()));
  return text.length > 0;
}
