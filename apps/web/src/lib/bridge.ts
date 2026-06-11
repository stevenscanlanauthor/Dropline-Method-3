export interface DroplineBridge {
  isDesktop?: boolean;
  saveToDisk?: (data: string) => Promise<{ ok: boolean; filePath?: string }>;
  exportMarkdown?: (markdown: string) => Promise<{ ok: boolean; filePath?: string }>;
  onMenuNew?: (cb: () => void) => void;
  onRequestSave?: (cb: () => void) => void;
  onExportMarkdown?: (cb: () => void) => void;
  onFileOpened?: (cb: (payload: { filePath: string; data: string }) => void) => void;
  onOpenSample?: (cb: () => void) => void;
  onDuplicateChapter?: (cb: () => void) => void;
  onViewEditor?: (cb: () => void) => void;
  onViewCorkboard?: (cb: () => void) => void;
  onViewPreview?: (cb: () => void) => void;
  onToggleInspector?: (cb: () => void) => void;
  onCompile?: (cb: () => void) => void;
  onBold?: (cb: () => void) => void;
  onItalic?: (cb: () => void) => void;
  onUnderline?: (cb: () => void) => void;
  onIndent?: (cb: () => void) => void;
  onOutdent?: (cb: () => void) => void;
  setDirty?: (dirty: boolean) => void;
}

declare global {
  interface Window {
    droplineBridge?: DroplineBridge;
  }
}

export function getBridge(): DroplineBridge | undefined {
  return window.droplineBridge;
}
