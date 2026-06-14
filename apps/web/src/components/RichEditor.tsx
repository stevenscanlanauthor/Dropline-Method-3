import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import {
  applyFontFamilyStack,
  applyFontSizePx,
  readFontFamily,
  readFontSizePx,
} from '../lib/rich-editor-format';

export interface RichEditorHandle {
  focus: () => void;
  getElement: () => HTMLDivElement | null;
  exec: (command: string, value?: string) => void;
  applyFontSize: (sizePx: number) => void;
  applyFontFamily: (fontFamily: string) => void;
  getSelectionFontSize: () => number;
  getSelectionFontFamily: () => string;
  queryBold: () => boolean;
  queryItalic: () => boolean;
  queryUnderline: () => boolean;
}

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  disabled?: boolean;
  onFormatAtCursor?: (format: {
    fontSize: number;
    fontFamily: string;
    bold: boolean;
    italic: boolean;
    underline: boolean;
  }) => void;
}

const RichEditor = forwardRef<RichEditorHandle, Props>(function RichEditor(
  { value, onChange, placeholder, disabled, onFormatAtCursor },
  ref,
) {
  const editorRef = useRef<HTMLDivElement>(null);

  function syncChange() {
    onChange(editorRef.current?.innerHTML ?? '');
  }

  function queryState(command: string): boolean {
    try {
      return document.queryCommandState(command);
    } catch {
      return false;
    }
  }

  useImperativeHandle(ref, () => ({
    focus: () => editorRef.current?.focus(),
    getElement: () => editorRef.current,
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
    queryBold: () => queryState('bold'),
    queryItalic: () => queryState('italic'),
    queryUnderline: () => queryState('underline'),
  }));

  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    const next = value || '';
    if (el.innerHTML !== next) {
      el.innerHTML = next;
    }
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
        bold: queryState('bold'),
        italic: queryState('italic'),
        underline: queryState('underline'),
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
      onPaste={e => {
        e.preventDefault();
        const text = e.clipboardData.getData('text/plain');
        if (!text) return;
        document.execCommand('insertText', false, text);
        syncChange();
      }}
      data-placeholder={placeholder}
      className="rich-editor w-full min-h-[420px] field-input rounded-xl p-6 empty:before:content-[attr(data-placeholder)] empty:before:text-[var(--muted)] leading-relaxed text-base"
      style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
    />
  );
});

export default RichEditor;
