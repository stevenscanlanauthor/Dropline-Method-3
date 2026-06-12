import { Plus, Trash2 } from 'lucide-react';
import type { Chapter } from '../lib/types';

interface Props {
  chapters: Chapter[];
  selectedId: string | null;
  width: number;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
}

export default function Sidebar({ chapters, selectedId, width, onSelect, onAdd, onDelete }: Props) {
  return (
    <aside
      className="border-r border-[var(--border)] bg-[var(--surface)] flex flex-col shrink-0 min-w-0"
      style={{ width, minWidth: width, maxWidth: width }}
    >
      <div className="panel-header">
        <span className="panel-header-title">Chapters</span>
        <button
          type="button"
          onClick={onAdd}
          className="p-1.5 rounded-md text-[var(--accent)] hover:bg-[var(--accent-soft)]"
          title="Add chapter"
        >
          <Plus size={16} />
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto p-2 space-y-0.5" aria-label="Chapters">
        {chapters.map((ch, i) => {
          const selected = selectedId === ch.id;
          return (
            <div key={ch.id} className={`sidebar-item group ${selected ? 'sidebar-item-selected' : ''}`}>
              <button
                type="button"
                onClick={() => onSelect(ch.id)}
                className="sidebar-item-btn"
              >
                {ch.title.trim() || `Chapter ${i + 1}`}
              </button>
              {chapters.length > 1 && (
                <button
                  type="button"
                  onClick={() => onDelete(ch.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 mr-1 text-[var(--muted)] hover:text-[var(--danger)] rounded"
                  title="Delete chapter"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          );
        })}
      </nav>
      <div className="p-2 border-t border-[var(--border)] flex gap-2 bg-[var(--surface-muted)]">
        <button
          type="button"
          onClick={onAdd}
          className="flex-1 text-xs bg-[var(--accent)] text-white rounded-lg py-2 font-medium hover:bg-[var(--teal-dark)]"
        >
          Add chapter
        </button>
        <button
          type="button"
          onClick={() => selectedId && onDelete(selectedId)}
          disabled={!selectedId || chapters.length <= 1}
          className="flex-1 text-xs border border-[var(--border)] text-[var(--ink)] rounded-lg py-2 hover:bg-[var(--surface)] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Delete
        </button>
      </div>
    </aside>
  );
}
