import { describe, expect, it } from 'vitest';
import { buildScrivenerImportBlob, chapterCountForScrivener } from './scrivenerExport.js';

describe('scrivenerExport', () => {
  it('builds a zip with chapter RTF files', async () => {
    const blob = buildScrivenerImportBlob({
      title: 'Test Book',
      authorName: 'Author',
      authorContact: '',
      includeTitlePage: true,
      chapters: [
        {
          id: '1',
          title: 'Chapter One',
          drops: { drop6: '<p>Hello world</p>' },
        },
      ],
    });
    expect(blob.type).toBe('application/zip');
    expect(blob.size).toBeGreaterThan(100);
    expect(chapterCountForScrivener({
      title: 'Test Book',
      authorName: 'Author',
      authorContact: '',
      includeTitlePage: false,
      chapters: [
        { id: '1', title: 'A', drops: { drop6: 'text' } },
        { id: '2', title: 'B', drops: {} },
      ],
    })).toBe(1);
  });
});
