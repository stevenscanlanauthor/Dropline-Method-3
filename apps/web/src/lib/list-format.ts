export type ListStyle = 'bullet' | 'dash' | 'circle' | 'number';

export const LIST_STYLE_LABELS: Record<ListStyle, string> = {
  bullet: 'Bullet (•)',
  dash: 'Dash (–)',
  circle: 'Hollow (○)',
  number: 'Numbered (1.)',
};

const PLAIN_PREFIX: Record<Exclude<ListStyle, 'number'>, string> = {
  bullet: '• ',
  dash: '– ',
  circle: '○ ',
};

function getActiveElement(root: HTMLElement): HTMLElement | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  let node: Node | null = sel.anchorNode;
  if (!node || !root.contains(node)) return null;
  if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
  return node instanceof HTMLElement ? node : null;
}

function listStyleType(style: ListStyle): string {
  switch (style) {
    case 'circle':
      return 'circle';
    case 'dash':
      return 'none';
    default:
      return 'disc';
  }
}

function nextNumberPrefix(value: string, cursor: number): string {
  const lineStart = value.lastIndexOf('\n', cursor - 1) + 1;
  const before = value.slice(0, lineStart);
  let maxNum = 0;
  for (const line of before.split('\n')) {
    const match = line.match(/^\s*(\d+)\.\s/);
    if (match) maxNum = Math.max(maxNum, Number(match[1]));
  }
  return `${maxNum + 1}. `;
}

/** Prefix to continue a list when pressing Enter on a plain-text line (Drop 4). */
export function listContinuationPrefix(line: string): string {
  const trimmed = line.trimStart();
  const numMatch = trimmed.match(/^(\d+)\.\s/);
  if (numMatch) return `${Number(numMatch[1]) + 1}. `;
  if (trimmed.startsWith('•')) return '• ';
  if (trimmed.startsWith('–')) return '– ';
  if (trimmed.startsWith('○')) return '○ ';
  return '• ';
}

function ensureOrderedListVisible(root: HTMLElement): void {
  const el = getActiveElement(root);
  const ol = el?.closest('ol') ?? root.querySelector('ol');
  if (ol instanceof HTMLElement) {
    ol.style.listStyleType = 'decimal';
    ol.style.paddingLeft = '1.75rem';
    ol.querySelectorAll('li').forEach(li => {
      if (li instanceof HTMLElement) li.style.display = 'list-item';
    });
  }
}

/** Apply a list in a contenteditable region (drops 2, 3, 5, 6). */
export function applyListInRichEditor(root: HTMLElement, style: ListStyle): void {
  root.focus();
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;

  if (style === 'number') {
    const ok = document.execCommand('insertOrderedList', false);
    if (ok) {
      ensureOrderedListVisible(root);
      syncChange(root);
      return;
    }
    const range = sel.getRangeAt(0);
    if (!root.contains(range.commonAncestorContainer)) return;
    const block = getActiveElement(root);
    const text = block?.textContent ?? '';
    const prefix = /^\d+\.\s/.test(text.trimStart()) ? '' : '1. ';
    if (prefix) document.execCommand('insertText', false, prefix);
    else document.execCommand('insertOrderedList', false);
    ensureOrderedListVisible(root);
    syncChange(root);
    return;
  }

  const ok = document.execCommand('insertUnorderedList', false);
  if (ok) {
    const el = getActiveElement(root);
    const ul = el?.closest('ul');
    if (ul instanceof HTMLElement) {
      ul.style.listStyleType = listStyleType(style);
      ul.style.paddingLeft = '1.75rem';
      if (style === 'dash') {
        ul.querySelectorAll('li').forEach(li => {
          if (!li.textContent?.trimStart().startsWith('–')) {
            li.textContent = `– ${(li.textContent ?? '').trimStart()}`;
          }
        });
      }
    }
    syncChange(root);
    return;
  }

  const range = sel.getRangeAt(0);
  if (!root.contains(range.commonAncestorContainer)) return;

  const prefix = PLAIN_PREFIX[style];
  if (range.collapsed) {
    const block = getActiveElement(root) ?? root;
    const text = block.textContent ?? '';
    if (!text.startsWith(prefix.trim())) {
      document.execCommand('insertText', false, prefix);
    }
  } else {
    const text = range.toString();
    const lines = text.split('\n').map(line => (line ? `${prefix}${line}` : line)).join('\n');
    document.execCommand('insertText', false, lines);
  }
  syncChange(root);
}

function syncChange(root: HTMLElement) {
  root.dispatchEvent(new Event('input', { bubbles: true }));
}

/** Insert list marker at cursor in a plain textarea (drop 4). Returns the updated value. */
export function insertListPrefixInPlain(
  el: HTMLTextAreaElement,
  style: ListStyle,
): string {
  const start = el.selectionStart;
  const end = el.selectionEnd;
  const value = el.value;

  let prefix: string;
  if (style === 'number') {
    prefix = nextNumberPrefix(value, start);
  } else {
    prefix = PLAIN_PREFIX[style];
  }

  const next = value.slice(0, start) + prefix + value.slice(end);
  el.value = next;
  const cursor = start + prefix.length;
  el.selectionStart = el.selectionEnd = cursor;
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.focus();
  return next;
}
