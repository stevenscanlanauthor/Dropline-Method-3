import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { RichEditorHandle } from '../components/RichEditor';
import { applyListInRichEditor, insertListPrefixInPlain, type ListStyle } from './list-format';

export type EditorFont = 'system' | 'georgia' | 'times' | 'palatino' | 'helvetica';

export const FONT_LABELS: Record<EditorFont, string> = {
  system: 'System',
  georgia: 'Georgia',
  times: 'Times New Roman',
  palatino: 'Palatino',
  helvetica: 'Helvetica',
};

export const FONT_STACKS: Record<EditorFont, string> = {
  system: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  georgia: 'Georgia, "Times New Roman", serif',
  times: '"Times New Roman", Times, serif',
  palatino: 'Palatino, "Palatino Linotype", serif',
  helvetica: 'Helvetica, Arial, sans-serif',
};

const SIZE_MIN = 12;
const SIZE_MAX = 28;

export function fontFromFamily(family: string): EditorFont {
  const lower = family.toLowerCase();
  if (lower.includes('georgia')) return 'georgia';
  if (lower.includes('palatino')) return 'palatino';
  if (lower.includes('helvetica') || lower.includes('arial')) return 'helvetica';
  if (lower.includes('times')) return 'times';
  if (lower.includes('system') || lower.includes('segoe')) return 'system';
  return 'georgia';
}

export interface EditorFormatApi {
  canFormat: boolean;
  font: EditorFont;
  fontSize: number;
  boldActive: boolean;
  italicActive: boolean;
  underlineActive: boolean;
  setFont: (font: EditorFont) => void;
  setFontSize: (size: number) => void;
  focusEditor: () => void;
  applyBold: () => void;
  applyItalic: () => void;
  applyUnderline: () => void;
  applyIndent: () => void;
  applyOutdent: () => void;
  applyList: (style: import('./list-format').ListStyle) => void;
  increaseFontSize: () => void;
  decreaseFontSize: () => void;
}

interface RegisterApi {
  setEditorKind: (kind: 'none' | 'rich' | 'plain') => void;
  registerRich: (ref: RichEditorHandle | null) => void;
  registerPlain: (ref: HTMLTextAreaElement | null) => void;
  syncFromSelection: (fontSize: number, fontFamily: string, inline?: { bold: boolean; italic: boolean; underline: boolean }) => void;
}

const defaultApi: EditorFormatApi = {
  canFormat: false,
  font: 'georgia',
  fontSize: 16,
  boldActive: false,
  italicActive: false,
  underlineActive: false,
  setFont: () => {},
  setFontSize: () => {},
  focusEditor: () => {},
  applyBold: () => {},
  applyItalic: () => {},
  applyUnderline: () => {},
  applyIndent: () => {},
  applyOutdent: () => {},
  applyList: () => {},
  increaseFontSize: () => {},
  decreaseFontSize: () => {},
};

export const EditorFormatContext = createContext<EditorFormatApi>(defaultApi);
export const EditorFormatRegisterContext = createContext<RegisterApi>({
  setEditorKind: () => {},
  registerRich: () => {},
  registerPlain: () => {},
  syncFromSelection: () => {},
});

export function useEditorFormat() {
  return useContext(EditorFormatContext);
}

export function useEditorFormatRegister() {
  return useContext(EditorFormatRegisterContext);
}

function insertAtCursor(el: HTMLTextAreaElement, text: string) {
  const start = el.selectionStart;
  const end = el.selectionEnd;
  const value = el.value;
  el.value = value.slice(0, start) + text + value.slice(end);
  el.selectionStart = el.selectionEnd = start + text.length;
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

function clampSize(size: number) {
  return Math.min(SIZE_MAX, Math.max(SIZE_MIN, size));
}

export function EditorFormatProvider({ children }: { children: ReactNode }) {
  const richRef = useRef<RichEditorHandle | null>(null);
  const plainRef = useRef<HTMLTextAreaElement | null>(null);
  const [editorKind, setEditorKind] = useState<'none' | 'rich' | 'plain'>('none');
  const [font, setFont] = useState<EditorFont>('georgia');
  const [fontSize, setFontSizeState] = useState(16);
  const [boldActive, setBoldActive] = useState(false);
  const [italicActive, setItalicActive] = useState(false);
  const [underlineActive, setUnderlineActive] = useState(false);

  useEffect(() => {
    if (editorKind === 'none') {
      setBoldActive(false);
      setItalicActive(false);
      setUnderlineActive(false);
    }
  }, [editorKind]);

  const registerRich = useCallback((ref: RichEditorHandle | null) => {
    richRef.current = ref;
  }, []);

  const syncPlainTypography = useCallback((el: HTMLTextAreaElement) => {
    const computed = window.getComputedStyle(el);
    const px = parseFloat(computed.fontSize);
    setFontSizeState(clampSize(Number.isFinite(px) ? Math.round(px) : 16));
    setFont(fontFromFamily(computed.fontFamily));
  }, []);

  const registerPlain = useCallback((ref: HTMLTextAreaElement | null) => {
    plainRef.current = ref;
    if (ref) syncPlainTypography(ref);
  }, [syncPlainTypography]);

  const syncFromSelection = useCallback((
    nextSize: number,
    fontFamily: string,
    inline?: { bold: boolean; italic: boolean; underline: boolean },
  ) => {
    setFontSizeState(clampSize(nextSize));
    setFont(fontFromFamily(fontFamily));
    if (inline) {
      setBoldActive(inline.bold);
      setItalicActive(inline.italic);
      setUnderlineActive(inline.underline);
    }
  }, []);

  const focusEditor = useCallback(() => {
    if (editorKind === 'rich') richRef.current?.focus();
    else if (editorKind === 'plain') plainRef.current?.focus();
  }, [editorKind]);

  const applyFontSizeToSelection = useCallback((size: number) => {
    const next = clampSize(size);
    if (editorKind === 'rich') {
      richRef.current?.applyFontSize(next);
    } else if (plainRef.current) {
      plainRef.current.style.fontSize = `${next}px`;
    }
    setFontSizeState(next);
  }, [editorKind]);

  const applyFontToSelection = useCallback((nextFont: EditorFont) => {
    if (editorKind === 'rich') {
      richRef.current?.applyFontFamily(FONT_STACKS[nextFont]);
    } else if (plainRef.current) {
      plainRef.current.style.fontFamily = FONT_STACKS[nextFont];
    }
    setFont(nextFont);
  }, [editorKind]);

  const applyList = useCallback((style: ListStyle) => {
    if (editorKind === 'rich') {
      const el = richRef.current?.getElement();
      if (el) applyListInRichEditor(el, style);
    } else if (plainRef.current) {
      insertListPrefixInPlain(plainRef.current, style);
    }
  }, [editorKind]);

  const api = useMemo((): EditorFormatApi => ({
    canFormat: editorKind !== 'none',
    font,
    fontSize,
    boldActive,
    italicActive,
    underlineActive,
    setFont: applyFontToSelection,
    setFontSize: applyFontSizeToSelection,
    focusEditor,
    applyBold: () => {
      if (editorKind === 'rich') {
        richRef.current?.exec('bold');
        setBoldActive(richRef.current?.queryBold() ?? false);
      }
    },
    applyItalic: () => {
      if (editorKind === 'rich') {
        richRef.current?.exec('italic');
        setItalicActive(richRef.current?.queryItalic() ?? false);
      }
    },
    applyUnderline: () => {
      if (editorKind === 'rich') {
        richRef.current?.exec('underline');
        setUnderlineActive(richRef.current?.queryUnderline() ?? false);
      }
    },
    applyIndent: () => {
      if (editorKind === 'rich') richRef.current?.exec('indent');
      else if (plainRef.current) insertAtCursor(plainRef.current, '    ');
    },
    applyOutdent: () => {
      if (editorKind === 'rich') richRef.current?.exec('outdent');
    },
    applyList,
    increaseFontSize: () => {
      const current =
        editorKind === 'rich'
          ? (richRef.current?.getSelectionFontSize() ?? fontSize)
          : fontSize;
      applyFontSizeToSelection(current + 2);
    },
    decreaseFontSize: () => {
      const current =
        editorKind === 'rich'
          ? (richRef.current?.getSelectionFontSize() ?? fontSize)
          : fontSize;
      applyFontSizeToSelection(current - 2);
    },
  }), [
    editorKind,
    font,
    fontSize,
    boldActive,
    italicActive,
    underlineActive,
    applyFontSizeToSelection,
    applyFontToSelection,
    focusEditor,
    applyList,
  ]);

  const register = useMemo(
    () => ({ setEditorKind, registerRich, registerPlain, syncFromSelection }),
    [registerRich, registerPlain, syncFromSelection],
  );

  return (
    <EditorFormatRegisterContext.Provider value={register}>
      <EditorFormatContext.Provider value={api}>{children}</EditorFormatContext.Provider>
    </EditorFormatRegisterContext.Provider>
  );
}
