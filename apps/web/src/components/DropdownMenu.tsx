import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

export interface DropdownItem {
  id: string;
  type?: 'item' | 'separator';
  label?: string;
  icon?: React.ReactNode;
  shortcut?: string;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

interface Props {
  label: string;
  items: DropdownItem[];
  align?: 'left' | 'right';
  className?: string;
  variant?: 'toolbar' | 'menubar';
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Highlight menubar label when a child item is active (e.g. View → Corkboard). */
  menuActive?: boolean;
}

export default function DropdownMenu({
  label,
  items,
  align = 'left',
  className = '',
  variant = 'toolbar',
  open: controlledOpen,
  onOpenChange,
  menuActive = false,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [internalOpen, setInternalOpen] = useState(false);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  function setOpen(next: boolean) {
    if (!isControlled) setInternalOpen(next);
    onOpenChange?.(next);
  }

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('click', onDocClick, true);
    return () => document.removeEventListener('click', onDocClick, true);
  }, [open]);

  const btnClass =
    variant === 'menubar'
      ? `menu-btn ${open ? 'menu-btn-open' : ''} ${menuActive ? 'menu-btn-has-active' : ''}`
      : 'toolbar-btn';

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        className={btnClass}
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span>{label}</span>
        {variant === 'toolbar' && (
          <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        )}
      </button>
      {open && (
        <div
          role="menu"
          className={`absolute top-full mt-1 z-[100] min-w-[240px] rounded-lg border border-[var(--border)] bg-[var(--surface)] py-1 shadow-[var(--shadow-md)] ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {items.map(item => {
            if (item.type === 'separator') {
              return <div key={item.id} role="separator" className="my-1 border-t border-[var(--border)]" />;
            }
            return (
              <button
                key={item.id}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                className={`menu-item ${item.active ? 'menu-item-active' : ''}`}
                onMouseDown={e => e.preventDefault()}
                onClick={() => {
                  item.onClick?.();
                  setOpen(false);
                }}
              >
                {item.icon && <span className="menu-item-icon">{item.icon}</span>}
                <span className="flex-1">{item.label}</span>
                {item.shortcut && (
                  <span className="text-[11px] text-[var(--muted)] ml-3 shrink-0 font-mono">{item.shortcut}</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
