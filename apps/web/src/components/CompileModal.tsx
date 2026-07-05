import { useState } from 'react';
import type { Project } from '../lib/types';

interface Props {
  project: Project;
  selectedChapterId: string | null;
  onClose: () => void;
  onCompile: (scope: 'fullManuscript' | 'selectedChapter', includeTitlePage: boolean) => void;
}

export default function CompileModal({ project, selectedChapterId, onClose, onCompile }: Props) {
  const [scope, setScope] = useState<'fullManuscript' | 'selectedChapter'>('fullManuscript');
  const [includeTitlePage, setIncludeTitlePage] = useState(true);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-[var(--surface)] rounded-xl max-w-md w-full shadow-[var(--shadow-md)] border border-[var(--border)]" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-[var(--border)] bg-[var(--highlight)]">
          <h2 className="font-semibold text-[var(--ink)]">Compile manuscript</h2>
          <p className="text-xs text-[var(--muted)] mt-1">Drop 6 only · exports PDF, DOCX, plain text, and binder import.</p>
        </div>
        <div className="p-4 space-y-3 text-sm text-[var(--ink)]">
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input type="radio" className="accent-[var(--accent)]" checked={scope === 'fullManuscript'} onChange={() => setScope('fullManuscript')} />
            Full manuscript
          </label>
          <label className={`flex items-center gap-2.5 ${selectedChapterId ? 'cursor-pointer' : 'opacity-50'}`}>
            <input
              type="radio"
              className="accent-[var(--accent)]"
              checked={scope === 'selectedChapter'}
              onChange={() => setScope('selectedChapter')}
              disabled={!selectedChapterId}
            />
            Selected chapter
          </label>
          <label className="flex items-center gap-2.5 cursor-pointer pt-1 border-t border-[var(--border)]">
            <input type="checkbox" className="accent-[var(--accent)]" checked={includeTitlePage} onChange={e => setIncludeTitlePage(e.target.checked)} />
            Include title page (from Inspector)
          </label>
        </div>
        <div className="p-4 border-t border-[var(--border)] flex justify-end gap-2">
          <button type="button" onClick={onClose} className="text-sm px-4 py-2 rounded-lg border border-[var(--border)] hover:bg-[var(--surface-muted)]">
            Cancel
          </button>
          <button type="button" onClick={() => onCompile(scope, includeTitlePage)} className="panel-header-action text-sm px-4 py-2">
            Compile
          </button>
        </div>
      </div>
    </div>
  );
}
