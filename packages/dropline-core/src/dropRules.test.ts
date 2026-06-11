import { describe, expect, it } from 'vitest';
import {
  canEdit,
  containsAtLeastOneBullet,
  enforceDrop2SingleLine,
  enforceDrop4BulletsPlain,
  hasContent,
  previousDrop,
  withDrop6SeededFromDrop5,
  wordCount,
} from './dropRules.js';

describe('DropRules', () => {
  it('previousDrop matches Swift progression', () => {
    expect(previousDrop('drop2')).toBeNull();
    expect(previousDrop('drop3')).toBe('drop2');
    expect(previousDrop('drop4')).toBe('drop3');
    expect(previousDrop('drop5')).toBe('drop3');
    expect(previousDrop('drop6')).toBe('drop5');
  });

  it('gates editing until previous drop has content', () => {
    const empty = { title: 'Ch', drops: {} };
    expect(canEdit('drop2', empty)).toBe(true);
    expect(canEdit('drop3', empty)).toBe(false);

    const withDrop2 = { title: 'Ch', drops: { drop2: 'One sentence here.' } };
    expect(canEdit('drop3', withDrop2)).toBe(true);
    expect(canEdit('drop6', withDrop2)).toBe(false);
  });

  it('drop4 requires bullet content', () => {
    expect(containsAtLeastOneBullet('no bullets')).toBe(false);
    expect(containsAtLeastOneBullet('• note')).toBe(true);
    expect(hasContent('drop4', { title: 'Ch', drops: { drop3: 'p', drop4: '• rest' } })).toBe(true);
  });

  it('enforces single line for drop2', () => {
    expect(enforceDrop2SingleLine('hello\nworld')).toBe('hello world');
  });

  it('enforces bullets for drop4', () => {
    expect(enforceDrop4BulletsPlain('note')).toBe('• note');
  });

  it('counts words for drop5 warning', () => {
    expect(wordCount('one two three')).toBe(3);
  });

  it('seeds drop6 from drop5 when drop6 is empty', () => {
    const chapter = {
      title: 'Ch',
      drops: { drop5: '<p>Draft paragraph.</p>' },
    };
    const seeded = withDrop6SeededFromDrop5(chapter);
    expect(seeded.drop6).toBe('<p>Draft paragraph.</p>');
  });

  it('does not overwrite existing drop6 content', () => {
    const chapter = {
      title: 'Ch',
      drops: {
        drop5: '<p>Draft.</p>',
        drop6: '<p>Final version.</p>',
      },
    };
    const seeded = withDrop6SeededFromDrop5(chapter);
    expect(seeded.drop6).toBe('<p>Final version.</p>');
  });
});
