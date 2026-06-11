import { describe, expect, it } from 'vitest';
import { DROPLINE_FORMAT, encodeDroplineFile, newProject, parseDroplineFile } from './droplineFile.js';

describe('droplineFile', () => {
  it('round-trips a minimal project', () => {
    const project = newProject('Test Novel');
    project.chapters[0].drops.drop2 = '<p>A single sentence.</p>';
    const encoded = encodeDroplineFile(project);
    const parsed = parseDroplineFile(encoded);
    expect(parsed.title).toBe('Test Novel');
    expect(parsed.chapters[0].drops.drop2).toContain('single sentence');
  });

  it('parses dropline-single-file-v1', () => {
    const json = {
      format: DROPLINE_FORMAT,
      title: 'Legacy',
      chapters: [{ id: 'abc', title: 'Ch 1', drops: {} }],
    };
    const parsed = parseDroplineFile(json);
    expect(parsed.chapters).toHaveLength(1);
    expect(parsed.chapters[0].title).toBe('Ch 1');
  });
});
