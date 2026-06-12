export interface SavedEditorSelection {
  kind: 'rich' | 'plain';
  range?: Range;
  start?: number;
  end?: number;
}

export function captureEditorSelection(
  kind: 'rich' | 'plain',
  root: HTMLElement | HTMLTextAreaElement | null,
): SavedEditorSelection | null {
  if (!root) return null;

  if (kind === 'plain' && root instanceof HTMLTextAreaElement) {
    return { kind: 'plain', start: root.selectionStart, end: root.selectionEnd };
  }

  if (kind === 'rich' && root instanceof HTMLElement) {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return null;
    const range = sel.getRangeAt(0);
    if (!root.contains(range.commonAncestorContainer)) return null;
    return { kind: 'rich', range: range.cloneRange() };
  }

  return null;
}

export function restoreEditorSelection(
  saved: SavedEditorSelection | null,
  root: HTMLElement | HTMLTextAreaElement | null,
): boolean {
  if (!saved || !root) return false;

  if (saved.kind === 'plain' && root instanceof HTMLTextAreaElement) {
    root.focus();
    const start = saved.start ?? 0;
    const end = saved.end ?? start;
    root.setSelectionRange(start, end);
    return true;
  }

  if (saved.kind === 'rich' && root instanceof HTMLElement && saved.range) {
    root.focus();
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(saved.range);
    return true;
  }

  return false;
}

export function selectedTextFromEditor(
  saved: SavedEditorSelection | null,
  root: HTMLElement | HTMLTextAreaElement | null,
  fallbackValue = '',
): string {
  if (!saved || !root) return '';

  if (saved.kind === 'plain' && root instanceof HTMLTextAreaElement) {
    const start = saved.start ?? 0;
    const end = saved.end ?? 0;
    if (start === end) return '';
    return root.value.slice(start, end);
  }

  if (saved.kind === 'rich' && saved.range) {
    return saved.range.toString();
  }

  const sel = window.getSelection();
  if (sel && sel.toString()) return sel.toString();
  return fallbackValue;
}

export async function writeClipboardText(text: string): Promise<boolean> {
  if (!text) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

export async function readClipboardText(): Promise<string> {
  try {
    return await navigator.clipboard.readText();
  } catch {
    return '';
  }
}

export function insertTextInPlain(el: HTMLTextAreaElement, text: string): void {
  const start = el.selectionStart;
  const end = el.selectionEnd;
  const value = el.value;
  el.value = value.slice(0, start) + text + value.slice(end);
  const cursor = start + text.length;
  el.setSelectionRange(cursor, cursor);
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

export function insertTextInRich(root: HTMLElement, text: string): void {
  root.focus();
  document.execCommand('insertText', false, text);
  root.dispatchEvent(new Event('input', { bubbles: true }));
}

export function deleteSelectionInRich(root: HTMLElement, saved: SavedEditorSelection | null): void {
  restoreEditorSelection(saved, root);
  document.execCommand('delete', false);
  root.dispatchEvent(new Event('input', { bubbles: true }));
}

export function deleteSelectionInPlain(el: HTMLTextAreaElement, saved: SavedEditorSelection | null): void {
  if (!saved || saved.kind !== 'plain') return;
  const start = saved.start ?? 0;
  const end = saved.end ?? 0;
  if (start === end) return;
  el.focus();
  el.value = el.value.slice(0, start) + el.value.slice(end);
  el.setSelectionRange(start, start);
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

export function insertTextInField(el: HTMLInputElement | HTMLTextAreaElement, text: string): void {
  const start = el.selectionStart ?? el.value.length;
  const end = el.selectionEnd ?? start;
  el.value = el.value.slice(0, start) + text + el.value.slice(end);
  const cursor = start + text.length;
  el.setSelectionRange(cursor, cursor);
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

export async function runFieldEditCommand(
  el: HTMLInputElement | HTMLTextAreaElement,
  cmd: 'copy' | 'cut' | 'paste' | 'delete' | 'selectAll' | 'undo' | 'redo',
): Promise<void> {
  el.focus();
  if (cmd === 'paste') {
    const text = await readClipboardText();
    if (text) insertTextInField(el, text);
    return;
  }
  if (cmd === 'copy') {
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    if (start !== end) await writeClipboardText(el.value.slice(start, end));
    return;
  }
  if (cmd === 'cut') {
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    if (start === end) return;
    await writeClipboardText(el.value.slice(start, end));
    el.value = el.value.slice(0, start) + el.value.slice(end);
    el.setSelectionRange(start, start);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    return;
  }
  document.execCommand(cmd);
}

export function selectAllInEditor(kind: 'rich' | 'plain', root: HTMLElement | HTMLTextAreaElement | null): void {
  if (!root) return;
  if (kind === 'plain' && root instanceof HTMLTextAreaElement) {
    root.focus();
    root.select();
    return;
  }
  if (kind === 'rich' && root instanceof HTMLElement) {
    root.focus();
    const range = document.createRange();
    range.selectNodeContents(root);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  }
}
