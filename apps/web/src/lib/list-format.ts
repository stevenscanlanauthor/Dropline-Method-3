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

/** Apply a list in a contenteditable region (drops 2, 3, 5, 6). */
export function applyListInRichEditor(root: HTMLElement, style: ListStyle): void {
  root.focus();
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;

  if (style === 'number') {
    document.execCommand('insertOrderedList', false);
    syncChange(root);
    return;
  }

  const ok = document.execCommand('insertUnorderedList', false);
  if (ok) {
    const el = getActiveElement(root);
    const ul = el?.closest('ul');
    if (ul) {
      ul.style.listStyleType = listStyleType(style);
      if (style === 'dash') {
        ul.querySelectorAll('li').forEach((li) => {
          if (!li.textContent?.startsWith('–')) {
            li.textContent = `– ${li.textContent ?? ''}`;
          }
        });
      }
    }
    syncChange(root);
    return;
  }

  // Fallback: prefix current line(s)
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
    const lines = text.split('\n').map((line) => (line ? `${prefix}${line}` : line)).join('\n');
    document.execCommand('insertText', false, lines);
  }
  syncChange(root);
}

function syncChange(root: HTMLElement) {
  root.dispatchEvent(new Event('input', { bubbles: true }));
}

/** Insert list marker at cursor in a plain textarea (drop 4). */
export function insertListPrefixInPlain(
  el: HTMLTextAreaElement,
  style: ListStyle,
): void {
  const start = el.selectionStart;
  const end = el.selectionEnd;
  const value = el.value;

  if (style === 'number') {
    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
    const lineNum =
      value
        .slice(0, lineStart)
        .split('\n')
        .filter((l) => /^\d+\.\s/.test(l)).length + 1;
    const prefix = `${lineNum}. `;
    el.value = value.slice(0, start) + prefix + value.slice(end);
    el.selectionStart = el.selectionEnd = start + prefix.length;
  } else {
    const prefix = PLAIN_PREFIX[style];
    el.value = value.slice(0, start) + prefix + value.slice(end);
    el.selectionStart = el.selectionEnd = start + prefix.length;
  }
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.focus();
}
