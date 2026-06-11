import { useEffect } from 'react';
import { getBridge } from '../lib/bridge';
import { useEditorFormat } from '../lib/editor-format-context';

interface Props {
  onDuplicateChapter: () => void;
  onViewEditor: () => void;
  onViewCorkboard: () => void;
  onViewPreview: () => void;
  onToggleInspector: () => void;
  onCompile: () => void;
}

export default function NativeMenuBridge({
  onDuplicateChapter,
  onViewEditor,
  onViewCorkboard,
  onViewPreview,
  onToggleInspector,
  onCompile,
}: Props) {
  const fmt = useEditorFormat();

  useEffect(() => {
    const bridge = getBridge();
    bridge?.onDuplicateChapter?.(onDuplicateChapter);
    bridge?.onViewEditor?.(onViewEditor);
    bridge?.onViewCorkboard?.(onViewCorkboard);
    bridge?.onViewPreview?.(onViewPreview);
    bridge?.onToggleInspector?.(onToggleInspector);
    bridge?.onCompile?.(onCompile);
    bridge?.onBold?.(() => fmt.applyBold());
    bridge?.onItalic?.(() => fmt.applyItalic());
    bridge?.onUnderline?.(() => fmt.applyUnderline());
    bridge?.onIndent?.(() => fmt.applyIndent());
    bridge?.onOutdent?.(() => fmt.applyOutdent());
  }, [
    fmt,
    onDuplicateChapter,
    onViewEditor,
    onViewCorkboard,
    onViewPreview,
    onToggleInspector,
    onCompile,
  ]);

  return null;
}
