import { dropPlainText } from '@dropline/core';
import type { Project } from './types';

export function buildMarkdown(project: Project): string {
  const lines: string[] = [
    `# ${project.title}`,
    '',
    project.authorName ? `**Author:** ${project.authorName}` : '',
    project.promise ? `**Promise:** ${project.promise}` : '',
    '',
    '---',
    '',
  ].filter(Boolean);

  project.chapters.forEach((ch, i) => {
    lines.push(`## ${ch.title.trim() || `Chapter ${i + 1}`}`, '');
    const drops = ['drop2', 'drop3', 'drop4', 'drop5', 'drop6'] as const;
    drops.forEach(d => {
      const text = dropPlainText({ title: ch.title, drops: ch.drops }, d);
      if (text) lines.push(`**${d}:** ${text}`, '');
    });
    lines.push('');
  });

  return lines.join('\n');
}
