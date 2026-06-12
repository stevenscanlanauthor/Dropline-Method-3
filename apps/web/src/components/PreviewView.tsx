import { compiledText } from '@dropline/core';
import type { Project } from '../lib/types';

interface Props {
  project: Project;
  onReturn: () => void;
}

export default function PreviewView({ project, onReturn }: Props) {
  const title = project.title.trim() || 'UNTITLED PROJECT';
  const author = project.authorName.trim() || 'Author name';
  const manuscript = compiledText({
    title: project.title,
    authorName: project.authorName,
    authorContact: project.authorContact,
    chapters: project.chapters.map(c => ({ id: c.id, title: c.title, drops: c.drops })),
    includeTitlePage: false,
  });

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[var(--surface-muted)]">
      <div className="panel-header">
        <span className="panel-header-title">Preview manuscript</span>
        <button type="button" onClick={onReturn} className="panel-header-action">
          Return to editor
        </button>
      </div>
      <div className="flex-1 overflow-auto py-10 px-6">
        <div className="max-w-2xl mx-auto space-y-8">
          <div className="bg-[var(--surface)] shadow-[var(--shadow-md)] rounded-xl w-full min-h-[40vh] flex flex-col items-center justify-center px-12 py-16 text-center border border-[var(--border)]">
            <p className="text-xs uppercase tracking-wider text-[var(--muted)] mb-4">Title page preview</p>
            <h1 className="text-2xl font-bold tracking-wide text-[var(--ink)] uppercase">{title}</h1>
            <p className="mt-4 text-[var(--muted)] serif-editor text-lg">{author}</p>
            {project.promise && (
              <p className="mt-8 text-sm text-[var(--muted)] max-w-md italic">{project.promise}</p>
            )}
            <p className="mt-8 text-xs text-[var(--muted)] max-w-sm">
              Set book title and author in the Inspector. Include the title page when you compile.
            </p>
          </div>

          <div className="bg-[var(--surface)] shadow-[var(--shadow-md)] rounded-xl w-full px-10 py-10 border border-[var(--border)]">
            <p className="text-xs uppercase tracking-wider text-[var(--muted)] mb-4">Drop 6 manuscript preview</p>
            <pre className="text-sm whitespace-pre-wrap serif-editor text-[var(--ink)] m-0 leading-relaxed">
              {manuscript}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
