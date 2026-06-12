import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { RichEditorHandle } from '../components/RichEditor';
import { applyListInRichEditor, insertListPrefixInPlain, type ListStyle } from './list-format';
import {
  captureEditorSelection,
  deleteSelectionInPlain,
  deleteSelectionInRich,
  insertTextInPlain,
  insertTextInRich,
  readClipboardText,
  restoreEditorSelection,
  runFieldEditCommand,
  selectAllInEditor,
  selectedTextFromEditor,
  writeClipboardText,
  type SavedEditorSelection,
} from './editor-clipboard';

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
  runEditCommand: (cmd: 'copy' | 'cut' | 'paste' | 'delete' | 'selectAll' | 'undo' | 'redo') => void;
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
  runEditCommand: () => {},
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
  const savedSelectionRef = useRef<SavedEditorSelection | null>(null);
  const lastFieldRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const [editorKind, setEditorKind] = useState<'none' | 'rich' | 'plain'>('none');

  useEffect(() => {
    function onFocusIn(e: FocusEvent) {
      const target = e.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
        lastFieldRef.current = target;
      }
    }
    document.addEventListener('focusin', onFocusIn);
    return () => document.removeEventListener('focusin', onFocusIn);
  }, []);
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
    if (ref) {
      syncPlainTypography(ref);
      const save = () => {
        const captured = captureEditorSelection('plain', ref);
        if (captured) savedSelectionRef.current = captured;
      };
      ref.addEventListener('blur', save);
      ref.addEventListener('keyup', save);
      ref.addEventListener('mouseup', save);
    }
  }, [syncPlainTypography]);

  useEffect(() => {
    function onSelectionChange() {
      if (editorKind === 'rich') {
        const el = richRef.current?.getElement();
        const captured = captureEditorSelection('rich', el ?? null);
        if (captured) savedSelectionRef.current = captured;
      }
    }
    document.addEventListener('selectionchange', onSelectionChange);
    return () => document.removeEventListener('selectionchange', onSelectionChange);
  }, [editorKind]);

  const getEditorRoot = useCallback((): HTMLElement | HTMLTextAreaElement | null => {
    if (editorKind === 'rich') return richRef.current?.getElement() ?? null;
    if (editorKind === 'plain') return plainRef.current;
    return null;
  }, [editorKind]);

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

  const runEditCommand = useCallback((cmd: 'copy' | 'cut' | 'paste' | 'delete' | 'selectAll' | 'undo' | 'redo') => {
    const plainEl = plainRef.current;
    const active = document.activeElement;
    const activeIsOtherField =
      (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) &&
      active !== plainEl;

    if (activeIsOtherField) {
      void runFieldEditCommand(active, cmd);
      return;
    }

    if (editorKind === 'none') {
      const field = lastFieldRef.current;
      if (field) void runFieldEditCommand(field, cmd);
      return;
    }

    const root = getEditorRoot();
    if (!root) return;

    if (cmd === 'selectAll') {
      selectAllInEditor(editorKind, root);
      savedSelectionRef.current = captureEditorSelection(editorKind, root);
      return;
    }

    if (cmd === 'undo' || cmd === 'redo') {
      if (editorKind === 'rich') {
        richRef.current?.exec(cmd);
      } else if (root instanceof HTMLTextAreaElement) {
        root.focus();
        document.execCommand(cmd);
        root.dispatchEvent(new Event('input', { bubbles: true }));
      }
      return;
    }

    if (cmd === 'copy') {
      void (async () => {
        restoreEditorSelection(savedSelectionRef.current, root);
        const text = selectedTextFromEditor(savedSelectionRef.current, root);
        await writeClipboardText(text);
      })();
      return;
    }

    if (cmd === 'cut') {
      void (async () => {
        restoreEditorSelection(savedSelectionRef.current, root);
        const text = selectedTextFromEditor(savedSelectionRef.current, root);
        if (!text) return;
        await writeClipboardText(text);
        if (editorKind === 'rich' && root instanceof HTMLElement) {
          deleteSelectionInRich(root, savedSelectionRef.current);
        } else if (root instanceof HTMLTextAreaElement) {
          deleteSelectionInPlain(root, savedSelectionRef.current);
        }
        savedSelectionRef.current = captureEditorSelection(editorKind, root);
      })();
      return;
    }

    if (cmd === 'paste') {
      void (async () => {
        const text = await readClipboardText();
        if (!text) return;
        restoreEditorSelection(savedSelectionRef.current, root);
        if (editorKind === 'rich' && root instanceof HTMLElement) {
          insertTextInRich(root, text);
        } else if (root instanceof HTMLTextAreaElement) {
          insertTextInPlain(root, text);
        }
        savedSelectionRef.current = captureEditorSelection(editorKind, root);
      })();
      return;
    }

    if (cmd === 'delete') {
      restoreEditorSelection(savedSelectionRef.current, root);
      if (editorKind === 'rich' && root instanceof HTMLElement) {
        deleteSelectionInRich(root, savedSelectionRef.current);
      } else if (root instanceof HTMLTextAreaElement) {
        deleteSelectionInPlain(root, savedSelectionRef.current);
      }
      savedSelectionRef.current = captureEditorSelection(editorKind, root);
    }
  }, [editorKind, getEditorRoot]);

  const applyList = useCallback((style: ListStyle) => {
    if (editorKind === 'rich') {
      const el = richRef.current?.getElement();
      if (el) applyListInRichEditor(el, style);
    } else if (plainRef.current) {
      const el = plainRef.current;
      insertListPrefixInPlain(el, style);
      el.dispatchEvent(new Event('change', { bubbles: true }));
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
    runEditCommand,
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
    runEditCommand,
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
