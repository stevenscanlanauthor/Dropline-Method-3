import { useEffect, useRef, useState } from 'react';
import { ChevronDown, List } from 'lucide-react';
import { LIST_STYLE_LABELS, type ListStyle } from '../lib/list-format';

interface Props {
  disabled?: boolean;
  onSelect: (style: ListStyle) => void;
}

const STYLES: ListStyle[] = ['bullet', 'dash', 'circle', 'number'];

export default function BulletListMenu({ disabled, onSelect }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className={`format-btn format-btn-wide ${open ? 'format-btn-active' : ''}`}
        title="List styles"
        disabled={disabled}
        onMouseDown={e => e.preventDefault()}
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <List size={14} />
        <span>Lists</span>
        <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute top-full left-0 mt-1 z-50 min-w-[180px] rounded-lg border border-[var(--border)] bg-white py-1 shadow-lg"
        >
          {STYLES.map(style => (
            <button
              key={style}
              type="button"
              role="menuitem"
              className="w-full px-3 py-2 text-left text-sm text-[var(--ink)] hover:bg-[var(--mist)]"
              onMouseDown={e => e.preventDefault()}
              onClick={() => {
                onSelect(style);
                setOpen(false);
              }}
            >
              {LIST_STYLE_LABELS[style]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
