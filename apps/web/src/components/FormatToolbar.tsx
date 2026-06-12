import { Bold, Italic, Underline, Indent, Outdent } from 'lucide-react';
import { useEditorFormat, FONT_LABELS, type EditorFont } from '../lib/editor-format-context';
import BulletListMenu from './BulletListMenu';

const FONT_OPTIONS: EditorFont[] = ['system', 'georgia', 'times', 'palatino', 'helvetica'];
const SIZE_OPTIONS = [12, 14, 16, 18, 20, 22, 24, 28];

export default function FormatToolbar() {
  const fmt = useEditorFormat();

  if (!fmt.canFormat) return null;

  return (
    <div className="format-bar shrink-0 border-b border-[var(--border)] bg-white px-4 py-2 flex flex-wrap items-center gap-2 w-full">
      <div className="format-group">
        <button
          type="button"
          className={`format-btn ${fmt.boldActive ? 'format-btn-active' : ''}`}
          title="Bold (⌘B)"
          onMouseDown={e => e.preventDefault()}
          onClick={fmt.applyBold}
          aria-pressed={fmt.boldActive}
        >
          <Bold size={14} strokeWidth={2.5} />
        </button>
        <button
          type="button"
          className={`format-btn ${fmt.italicActive ? 'format-btn-active' : ''}`}
          title="Italic (⌘I)"
          onMouseDown={e => e.preventDefault()}
          onClick={fmt.applyItalic}
          aria-pressed={fmt.italicActive}
        >
          <Italic size={14} strokeWidth={2.5} />
        </button>
        <button
          type="button"
          className={`format-btn ${fmt.underlineActive ? 'format-btn-active' : ''}`}
          title="Underline (⌘U)"
          onMouseDown={e => e.preventDefault()}
          onClick={fmt.applyUnderline}
          aria-pressed={fmt.underlineActive}
        >
          <Underline size={14} strokeWidth={2.5} />
        </button>
      </div>

      <span className="format-divider" aria-hidden />

      <div className="format-group format-group-selects">
        <label className="format-select-label">
          <span className="sr-only">Font</span>
          <select
            className="format-select"
            value={fmt.font}
            onChange={e => fmt.setFont(e.target.value as EditorFont)}
          >
            {FONT_OPTIONS.map(f => (
              <option key={f} value={f}>{FONT_LABELS[f]}</option>
            ))}
          </select>
        </label>
        <label className="format-select-label">
          <span className="sr-only">Font size</span>
          <select
            className="format-select format-select-size"
            value={fmt.fontSize}
            onChange={e => fmt.setFontSize(Number(e.target.value))}
          >
            {SIZE_OPTIONS.map(s => (
              <option key={s} value={s}>{s} pt</option>
            ))}
          </select>
        </label>
      </div>

      <span className="format-divider" aria-hidden />

      <div className="format-group">
        <button
          type="button"
          className="format-btn format-btn-wide"
          title="Indent"
          onMouseDown={e => e.preventDefault()}
          onClick={fmt.applyIndent}
        >
          <Indent size={14} />
          <span>Indent</span>
        </button>
        <button
          type="button"
          className="format-btn format-btn-wide"
          title="Outdent"
          onMouseDown={e => e.preventDefault()}
          onClick={fmt.applyOutdent}
        >
          <Outdent size={14} />
          <span>Outdent</span>
        </button>
        <BulletListMenu onSelect={fmt.applyList} />
      </div>
    </div>
  );
}
