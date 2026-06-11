import type { DropKind } from './dropKind.js';

export interface ChapterDrops {
  title: string;
  drops: Partial<Record<DropKind, string>>;
}

export function previousDrop(drop: DropKind): DropKind | null {
  switch (drop) {
    case 'drop2':
      return null;
    case 'drop3':
      return 'drop2';
    case 'drop4':
      return 'drop3';
    case 'drop5':
      return 'drop3';
    case 'drop6':
      return 'drop5';
  }
}

/** Strip HTML to plain text (works in Node and browser). */
export function plainTextFromHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function dropPlainText(chapter: ChapterDrops, drop: DropKind): string {
  const raw = chapter.drops[drop] ?? '';
  if (!raw.includes('<')) return raw.trim();
  return plainTextFromHtml(raw);
}

export function hasContent(drop: DropKind, chapter: ChapterDrops): boolean {
  const text = dropPlainText(chapter, drop);

  if (drop === 'drop4') {
    return containsAtLeastOneBullet(text);
  }

  return text.length > 0;
}

export function canEdit(drop: DropKind, chapter: ChapterDrops): boolean {
  if (drop === 'drop2') return dropOneComplete(chapter.title);
  const prev = previousDrop(drop);
  if (!prev) return true;
  return hasContent(prev, chapter);
}

export function containsAtLeastOneBullet(text: string): boolean {
  const lines = text.split(/\n/).filter((l) => l.trim().length > 0);
  return lines.some((line) => line.trim().startsWith('•'));
}

export function wordCount(text: string): number {
  const parts = text.replace(/\n/g, ' ').split(/\s+/).filter((w) => w.length > 0);
  return parts.length;
}

export function drop5OverLimitWarning(text: string): boolean {
  return wordCount(text) > 500;
}

export function enforceDrop2SingleLine(text: string): string {
  const collapsed = text.replace(/\r/g, ' ').replace(/\n/g, ' ').replace(/\t/g, ' ');
  return collapsed.split(/\s+/).filter(Boolean).join(' ');
}

export function enforceDrop3SingleParagraph(text: string): string {
  const collapsed = text.replace(/\r/g, '\n');
  const lines = collapsed.split(/\n/).filter((l) => l.trim().length > 0);
  return lines.join(' ').split(/\s+/).filter(Boolean).join(' ');
}

export function enforceDrop4BulletsPlain(text: string): string {
  const normalised = text.replace(/\r/g, '\n');
  const lines = normalised.split(/\n/);
  const out: string[] = [];

  for (const raw of lines) {
    const trimmed = raw.trim();
    if (!trimmed) {
      out.push('');
    } else if (trimmed.startsWith('•')) {
      out.push('• ' + trimmed.slice(1).trim());
    } else {
      out.push('• ' + trimmed);
    }
  }

  if (out.length === 0) return '• ';
  const joined = out.join('\n').trim();
  if (!joined) return '• ';
  return out.join('\n');
}

/** When Drop 6 is empty, seed it from Drop 5 so the author has a starting draft. */
export function withDrop6SeededFromDrop5(
  chapter: ChapterDrops,
): Partial<Record<DropKind, string>> {
  const drops = { ...chapter.drops };
  if (!hasContent('drop5', chapter) || hasContent('drop6', chapter)) return drops;
  const drop5 = chapter.drops.drop5;
  if (drop5?.trim()) drops.drop6 = drop5;
  return drops;
}

export function dropOneComplete(title: string): boolean {
  const t = title.trim();
  return t.length > 0 && t !== 'Chapter 1' && t !== 'Untitled Chapter';
}

export function plainToHtml(plain: string): string {
  if (!plain) return '';
  return plain
    .split('\n')
    .map((line) => `<p>${escapeHtml(line || '')}</p>`)
    .join('');
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function enforceDropContent(drop: DropKind, content: string): string {
  const plain = content.includes('<') ? plainTextFromHtml(content) : content;
  switch (drop) {
    case 'drop2':
      return enforceDrop2SingleLine(plain);
    case 'drop3':
      return enforceDrop3SingleParagraph(plain);
    case 'drop4':
      return enforceDrop4BulletsPlain(plain);
    default:
      return plain;
  }
}
