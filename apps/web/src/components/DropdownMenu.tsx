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
}

export default function DropdownMenu({
  label,
  items,
  align = 'left',
  className = '',
  variant = 'toolbar',
  open: controlledOpen,
  onOpenChange,
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
    // Use click (not mousedown) so opening a menu on the same gesture does not instantly dismiss it.
    document.addEventListener('click', onDocClick, true);
    return () => document.removeEventListener('click', onDocClick, true);
  }, [open]);

  const btnClass =
    variant === 'menubar'
      ? `menu-btn ${open ? 'menu-btn-open' : ''}`
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
          className={`absolute top-full mt-1 z-[100] min-w-[220px] rounded-lg border border-[var(--border)] bg-white py-1 shadow-lg ${
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
                className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[var(--mist)] disabled:opacity-40 disabled:cursor-not-allowed ${
                  item.active ? 'bg-[var(--accent-soft)] text-[var(--accent)] font-medium' : 'text-[var(--ink)]'
                }`}
                onMouseDown={e => e.preventDefault()}
                onClick={() => {
                  item.onClick?.();
                  setOpen(false);
                }}
              >
                {item.icon && <span className="w-4 shrink-0 flex items-center justify-center">{item.icon}</span>}
                <span className="flex-1">{item.label}</span>
                {item.shortcut && (
                  <span className="text-xs text-[var(--muted)] ml-4 shrink-0">{item.shortcut}</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
