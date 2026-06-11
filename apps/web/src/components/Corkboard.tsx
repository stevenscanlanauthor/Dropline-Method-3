import { plainTextFromHtml, wordCount, dropPlainText } from '@dropline/core';
import type { Chapter } from '../lib/types';
import { DropDots } from './EditorPanel';

interface Props {
  chapters: Chapter[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onReorder: (ids: string[]) => void;
  onReturn: () => void;
}

export default function Corkboard({ chapters, selectedId, onSelect, onReorder, onReturn }: Props) {
  function onDragStart(e: React.DragEvent, id: string) {
    e.dataTransfer.setData('text/plain', id);
  }

  function onDrop(e: React.DragEvent, targetId: string) {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData('text/plain');
    if (!draggedId || draggedId === targetId) return;
    const ids = chapters.map(c => c.id);
    const from = ids.indexOf(draggedId);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) return;
    const next = [...ids];
    next.splice(from, 1);
    next.splice(to, 0, draggedId);
    onReorder(next);
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[var(--stone)]/30">
      <div className="px-4 py-2 border-b border-[var(--border)] bg-white flex justify-between items-center">
        <span className="text-sm font-medium">Corkboard</span>
        <button type="button" onClick={onReturn} className="text-xs text-[var(--accent)] hover:underline">
          Return to editor
        </button>
      </div>
      <div className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
          {chapters.map((ch, i) => {
            const summary = plainTextFromHtml(ch.drops.drop2 ?? '').slice(0, 140);
            const words = wordCount(dropPlainText({ title: ch.title, drops: ch.drops }, 'drop6'));
            return (
              <div
                key={ch.id}
                draggable
                onDragStart={e => onDragStart(e, ch.id)}
                onDragOver={e => e.preventDefault()}
                onDrop={e => onDrop(e, ch.id)}
                onDoubleClick={() => onSelect(ch.id)}
                className={`bg-white border rounded-xl p-4 shadow-sm cursor-grab min-h-[160px] flex flex-col ${
                  selectedId === ch.id ? 'border-[var(--accent)] ring-2 ring-[var(--accent-soft)]' : 'border-[var(--border)]'
                }`}
              >
                <div className="text-[10px] uppercase tracking-wide text-[var(--muted)] mb-1 font-semibold">
                  {(ch.title.trim() || `Chapter ${i + 1}`).toUpperCase()}
                </div>
                <div className="text-xs text-[var(--muted)] italic line-clamp-4 flex-1 mb-3">
                  {summary || 'No Drop 2 sentence yet.'}
                </div>
                <div className="flex items-center justify-between mt-auto pt-2 border-t border-[var(--border)]">
                  <span className="text-[10px] text-[var(--muted)]">{words} words</span>
                  <DropDots chapter={ch} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <p className="text-xs text-[var(--muted)] px-4 py-2 border-t border-[var(--border)] bg-white text-center">
        Corkboard uses Drop 1 for the title and Drop 2 for the one-sentence summary. Drag cards to reorder. Double-click to open in the editor.
      </p>
    </div>
  );
}
