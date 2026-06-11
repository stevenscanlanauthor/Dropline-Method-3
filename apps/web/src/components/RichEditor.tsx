import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import {
  applyFontFamilyStack,
  applyFontSizePx,
  readFontFamily,
  readFontSizePx,
} from '../lib/rich-editor-format';

export interface RichEditorHandle {
  focus: () => void;
  exec: (command: string, value?: string) => void;
  applyFontSize: (sizePx: number) => void;
  applyFontFamily: (fontFamily: string) => void;
  getSelectionFontSize: () => number;
  getSelectionFontFamily: () => string;
}

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  disabled?: boolean;
  onFormatAtCursor?: (format: { fontSize: number; fontFamily: string }) => void;
}

const RichEditor = forwardRef<RichEditorHandle, Props>(function RichEditor(
  { value, onChange, placeholder, disabled, onFormatAtCursor },
  ref,
) {
  const editorRef = useRef<HTMLDivElement>(null);

  function syncChange() {
    onChange(editorRef.current?.innerHTML ?? '');
  }

  useImperativeHandle(ref, () => ({
    focus: () => editorRef.current?.focus(),
    exec: (command, val) => {
      editorRef.current?.focus();
      document.execCommand(command, false, val);
      syncChange();
    },
    applyFontSize: (sizePx: number) => {
      const el = editorRef.current;
      if (!el) return;
      applyFontSizePx(el, sizePx);
      syncChange();
    },
    applyFontFamily: (fontFamily: string) => {
      const el = editorRef.current;
      if (!el) return;
      applyFontFamilyStack(el, fontFamily);
      syncChange();
    },
    getSelectionFontSize: () => (editorRef.current ? readFontSizePx(editorRef.current) : 16),
    getSelectionFontFamily: () => (editorRef.current ? readFontFamily(editorRef.current) : ''),
  }));

  useEffect(() => {
    const el = editorRef.current;
    if (!el || document.activeElement === el) return;
    el.innerHTML = value || '';
  }, [value]);

  useEffect(() => {
    const el = editorRef.current;
    const reportFormat = onFormatAtCursor;
    if (!el || !reportFormat) return;

    function report() {
      if (!el || !reportFormat || document.activeElement !== el) return;
      reportFormat({
        fontSize: readFontSizePx(el),
        fontFamily: readFontFamily(el),
      });
    }

    document.addEventListener('selectionchange', report);
    el.addEventListener('keyup', report);
    el.addEventListener('mouseup', report);
    return () => {
      document.removeEventListener('selectionchange', report);
      el.removeEventListener('keyup', report);
      el.removeEventListener('mouseup', report);
    };
  }, [onFormatAtCursor]);

  return (
    <div
      ref={editorRef}
      contentEditable={!disabled}
      suppressContentEditableWarning
      onInput={syncChange}
      data-placeholder={placeholder}
      className="w-full min-h-[420px] border border-[var(--border)] rounded-xl p-6 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--accent-soft)] empty:before:content-[attr(data-placeholder)] empty:before:text-[var(--muted)] leading-relaxed text-base"
      style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
    />
  );
});

export default RichEditor;
