import { describe, expect, it } from 'vitest';
import { compiledText } from './manuscriptCompiler.js';

describe('ManuscriptCompiler', () => {
  it('prefers drop6 over earlier drops', () => {
    const text = compiledText({
      title: 'My Book',
      authorName: 'Jane',
      authorContact: '',
      includeTitlePage: false,
      chapters: [
        {
          id: '1',
          title: 'Opening',
          drops: {
            drop2: 'Short.',
            drop6: 'Full chapter prose here.',
          },
        },
      ],
    });
    expect(text).toContain('Full chapter prose here.');
    expect(text).not.toContain('Short.');
  });

  it('includes title page when requested', () => {
    const text = compiledText({
      title: 'My Book',
      authorName: 'Jane Author',
      authorContact: 'jane@example.com',
      includeTitlePage: true,
      chapters: [{ id: '1', title: 'Ch1', drops: { drop6: 'Final chapter text.' } }],
    });
    expect(text).toContain('Jane Author');
    expect(text).toContain('My Book');
  });
});
