import { dropPlainText } from './dropRules.js';
import { rtfBytes } from './rtfExport.js';
import { downloadBlob, zipStore, type ZipEntry } from './zipStore.js';
import type { CompileOptions } from './manuscriptCompiler.js';

function sanitiseFilename(name: string): string {
  return name.replace(/[^\w .-]+/g, '').trim() || 'Chapter';
}

function padChapterIndex(index: number): string {
  return String(index + 1).padStart(2, '0');
}

const README = `Import this manuscript
=====================================

Option A — one file
  1. In your writing app: File → Import → Files…
  2. Choose manuscript.rtf
  3. Choose where to place it in the binder.

Option B — one document per chapter
  1. In your writing app: File → Import → Files…
  2. Select every .rtf file in the chapters/ folder (Shift-click).
  3. The app creates one binder document per chapter.

Only Drop 6 (final draft) text is included. Title page fields come from your Inspector when enabled at compile.
`;

/** Zip of RTF files for import via File → Import → Files… */
export function buildScrivenerImportBlob(options: CompileOptions): Blob {
  const entries: ZipEntry[] = [];
  const title = options.title.trim() || 'Untitled Manuscript';
  const author = options.authorName.trim();
  const contact = options.authorContact.trim();

  entries.push({
    name: 'README - Import instructions.txt',
    data: new TextEncoder().encode(README),
  });

  const manuscriptParts: string[] = [];
  if (options.includeTitlePage) {
    if (author) manuscriptParts.push(author);
    if (contact) manuscriptParts.push(contact);
    if (author || contact) manuscriptParts.push('');
    manuscriptParts.push(title, '', '');
  }

  let chapterIndex = 0;
  for (const chapter of options.chapters) {
    const chapterTitle = chapter.title.trim() || `Chapter ${chapterIndex + 1}`;
    const text = dropPlainText(chapter, 'drop6');
    if (!text) continue;

    const body = `${chapterTitle}\n\n${text}`;
    const fileBase = `${padChapterIndex(chapterIndex)} - ${sanitiseFilename(chapterTitle)}`;
    entries.push({
      name: `chapters/${fileBase}.rtf`,
      data: rtfBytes(body),
    });
    manuscriptParts.push(chapterTitle, '', text, '');
    chapterIndex += 1;
  }

  if (manuscriptParts.length === 0) {
    manuscriptParts.push('No manuscript text available yet.');
  }

  entries.push({
    name: 'manuscript.rtf',
    data: rtfBytes(manuscriptParts.join('\n').trimEnd()),
  });

  const zip = zipStore(entries);
  return new Blob([zip as BlobPart], { type: 'application/zip' });
}

export function downloadScrivenerImport(options: CompileOptions, filename: string): void {
  const blob = buildScrivenerImportBlob(options);
  const base = filename.replace(/\.(zip|rtf)$/i, '') || 'manuscript';
  downloadBlob(blob, `${base}-binder-import.zip`);
}

export function chapterCountForScrivener(options: CompileOptions): number {
  return options.chapters.filter(ch => dropPlainText(ch, 'drop6')).length;
}
