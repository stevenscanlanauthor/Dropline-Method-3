const DEFAULT_SIZE = 16;

function getAnchorElement(root: HTMLElement): HTMLElement | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  let node: Node | null = sel.anchorNode;
  if (!node || !root.contains(node)) return null;
  if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
  return node instanceof HTMLElement ? node : null;
}

export function readFontSizePx(root: HTMLElement): number {
  const el = getAnchorElement(root);
  if (!el) return DEFAULT_SIZE;
  const px = parseFloat(window.getComputedStyle(el).fontSize);
  return Number.isFinite(px) ? Math.round(px) : DEFAULT_SIZE;
}

export function readFontFamily(root: HTMLElement): string {
  const el = getAnchorElement(root);
  if (!el) return '';
  return window.getComputedStyle(el).fontFamily;
}

function wrapRange(range: Range, span: HTMLSpanElement) {
  try {
    range.surroundContents(span);
  } catch {
    const fragment = range.extractContents();
    span.appendChild(fragment);
    range.insertNode(span);
  }
}

export function applyInlineStyle(
  root: HTMLElement,
  styles: { fontSize?: string; fontFamily?: string },
) {
  root.focus();
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;

  const range = sel.getRangeAt(0);
  if (!root.contains(range.commonAncestorContainer)) return;

  const span = document.createElement('span');
  if (styles.fontSize) span.style.fontSize = styles.fontSize;
  if (styles.fontFamily) span.style.fontFamily = styles.fontFamily;

  if (range.collapsed) {
    const marker = document.createTextNode('\u200b');
    span.appendChild(marker);
    range.insertNode(span);
    const next = document.createRange();
    next.setStart(marker, 1);
    next.collapse(true);
    sel.removeAllRanges();
    sel.addRange(next);
    return;
  }

  wrapRange(range, span);
  const next = document.createRange();
  next.selectNodeContents(span);
  sel.removeAllRanges();
  sel.addRange(next);
}

export function applyFontSizePx(root: HTMLElement, sizePx: number) {
  applyInlineStyle(root, { fontSize: `${sizePx}px` });
}

export function applyFontFamilyStack(root: HTMLElement, fontFamily: string) {
  applyInlineStyle(root, { fontFamily });
}
