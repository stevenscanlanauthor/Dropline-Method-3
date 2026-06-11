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
      <div className="bg-white rounded-xl max-w-md w-full shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-[var(--border)]">
          <h2 className="font-semibold text-[var(--ink)]">Compile manuscript</h2>
          <p className="text-xs text-[var(--muted)] mt-1">Only Drop 6 (final draft) text is included.</p>
        </div>
        <div className="p-4 space-y-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" checked={scope === 'fullManuscript'} onChange={() => setScope('fullManuscript')} />
            Full manuscript
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              checked={scope === 'selectedChapter'}
              onChange={() => setScope('selectedChapter')}
              disabled={!selectedChapterId}
            />
            Selected chapter
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={includeTitlePage} onChange={e => setIncludeTitlePage(e.target.checked)} />
            Include title page
          </label>
        </div>
        <div className="p-4 border-t border-[var(--border)] flex justify-end gap-2">
          <button type="button" onClick={onClose} className="text-sm px-4 py-2 rounded-lg border border-[var(--border)]">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onCompile(scope, includeTitlePage)}
            className="text-sm px-4 py-2 rounded-lg bg-[var(--accent)] text-white"
          >
            Compile
          </button>
        </div>
      </div>
    </div>
  );
}
