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
      className="border-r border-[var(--border)] bg-white flex flex-col shrink-0 min-w-0"
      style={{ width, minWidth: width, maxWidth: width }}
    >
      <div className="p-3 border-b border-[var(--border)] flex items-center justify-between">
        <span className="text-sm font-semibold text-[var(--ink)]">Chapters/Scenes</span>
        <button
          type="button"
          onClick={onAdd}
          className="p-1 rounded-md text-[var(--accent)] hover:bg-[var(--accent-soft)]"
          title="Add chapter"
        >
          <Plus size={16} />
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {chapters.map((ch, i) => (
          <div key={ch.id} className="group flex items-center gap-1">
            <button
              type="button"
              onClick={() => onSelect(ch.id)}
              className={`flex-1 text-left text-sm px-2 py-1.5 rounded-lg truncate ${
                selectedId === ch.id
                  ? 'bg-[var(--accent-soft)] text-[var(--accent)] font-medium'
                  : 'hover:bg-[var(--mist)]'
              }`}
            >
              {ch.title.trim() || `Chapter ${i + 1}`}
            </button>
            {chapters.length > 1 && (
              <button
                type="button"
                onClick={() => onDelete(ch.id)}
                className="opacity-0 group-hover:opacity-100 p-1 text-[var(--muted)] hover:text-red-600"
                title="Delete chapter"
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
        ))}
      </nav>
      <div className="p-2 border-t border-[var(--border)] flex gap-2">
        <button
          type="button"
          onClick={onAdd}
          className="flex-1 text-xs bg-[var(--accent)] text-white rounded-lg py-2 hover:opacity-90"
        >
          Add
        </button>
        <button
          type="button"
          onClick={() => selectedId && onDelete(selectedId)}
          disabled={!selectedId || chapters.length <= 1}
          className="flex-1 text-xs border border-[var(--border)] text-[var(--ink)] rounded-lg py-2 hover:bg-[var(--mist)] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Delete
        </button>
      </div>
    </aside>
  );
}
