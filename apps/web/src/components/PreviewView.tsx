import type { Project } from '../lib/types';

interface Props {
  project: Project;
  onReturn: () => void;
}

export default function PreviewView({ project, onReturn }: Props) {
  const title = project.title.trim() || 'UNTITLED PROJECT';
  const author = project.authorName.trim() || 'Author name';

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#e8ecf0]">
      <div className="px-4 py-2 border-b border-[var(--border)] bg-white flex justify-between items-center">
        <span className="text-sm font-medium">Preview manuscript</span>
        <button type="button" onClick={onReturn} className="text-xs text-[var(--accent)] hover:underline">
          Return to editor
        </button>
      </div>
      <div className="flex-1 overflow-auto flex justify-center py-10 px-6">
        <div className="bg-white shadow-lg w-full max-w-2xl min-h-[70vh] flex flex-col items-center justify-center px-12 text-center">
          <h1 className="text-2xl font-bold tracking-wide text-[var(--ink)] uppercase">{title}</h1>
          <p className="mt-4 text-[var(--muted)] serif-editor text-lg">{author}</p>
          {project.promise && (
            <p className="mt-8 text-sm text-[var(--muted)] max-w-md italic">{project.promise}</p>
          )}
        </div>
      </div>
    </div>
  );
}
