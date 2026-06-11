import {
  Bold,
  Italic,
  Underline,
  Indent,
  Outdent,
  List,
  LayoutGrid,
  Eye,
  FileOutput,
  PanelRight,
  PenLine,
  Type,
  Minus,
  Plus,
} from 'lucide-react';
import type { ViewMode } from '../lib/types';
import { useEditorFormat, FONT_LABELS, type EditorFont } from '../lib/editor-format-context';
import DropdownMenu from './DropdownMenu';

interface Props {
  viewMode: ViewMode;
  inspectorOpen: boolean;
  onViewChange: (mode: ViewMode) => void;
  onToggleInspector: () => void;
  onCompile: () => void;
  showInEditor: boolean;
}

const VIEW_LABELS: Record<ViewMode, string> = {
  editor: 'Editor',
  corkboard: 'Corkboard',
  preview: 'Preview Manuscript',
};

export default function Toolbar({
  viewMode,
  inspectorOpen,
  onViewChange,
  onToggleInspector,
  onCompile,
  showInEditor,
}: Props) {
  const fmt = useEditorFormat();

  const viewLabel =
    viewMode === 'editor' ? 'Views' : VIEW_LABELS[viewMode];

  const viewItems = [
    {
      id: 'editor',
      label: 'Editor',
      icon: <PenLine size={15} />,
      active: viewMode === 'editor',
      onClick: () => onViewChange('editor'),
    },
    {
      id: 'corkboard',
      label: 'Corkboard',
      icon: <LayoutGrid size={15} />,
      active: viewMode === 'corkboard',
      onClick: () => onViewChange('corkboard'),
    },
    {
      id: 'preview',
      label: 'Preview Manuscript',
      icon: <Eye size={15} />,
      active: viewMode === 'preview',
      onClick: () => onViewChange('preview'),
    },
    {
      id: 'inspector',
      label: inspectorOpen ? 'Hide Inspector' : 'Show Inspector',
      icon: <PanelRight size={15} />,
      active: inspectorOpen,
      onClick: onToggleInspector,
    },
    {
      id: 'compile',
      label: 'Compile Manuscript',
      icon: <FileOutput size={15} />,
      onClick: onCompile,
    },
  ];

  const formatItems = [
    {
      id: 'bold',
      label: 'Bold',
      icon: <Bold size={15} />,
      disabled: !fmt.canFormat,
      onClick: fmt.applyBold,
    },
    {
      id: 'italic',
      label: 'Italic',
      icon: <Italic size={15} />,
      disabled: !fmt.canFormat,
      onClick: fmt.applyItalic,
    },
    {
      id: 'underline',
      label: 'Underline',
      icon: <Underline size={15} />,
      disabled: !fmt.canFormat,
      onClick: fmt.applyUnderline,
    },
    {
      id: 'indent',
      label: 'Indent',
      icon: <Indent size={15} />,
      disabled: !fmt.canFormat,
      onClick: fmt.applyIndent,
    },
    {
      id: 'outdent',
      label: 'Outdent',
      icon: <Outdent size={15} />,
      disabled: !fmt.canFormat,
      onClick: fmt.applyOutdent,
    },
    {
      id: 'bullets',
      label: 'Bullet list',
      icon: <List size={15} />,
      disabled: !fmt.canFormat,
      onClick: fmt.applyBulletList,
    },
    {
      id: 'size-down',
      label: 'Decrease font size',
      icon: <Minus size={15} />,
      disabled: !fmt.canFormat,
      onClick: fmt.decreaseFontSize,
    },
    {
      id: 'size-up',
      label: 'Increase font size',
      icon: <Plus size={15} />,
      disabled: !fmt.canFormat,
      onClick: fmt.increaseFontSize,
    },
    ...(['system', 'georgia', 'times', 'palatino', 'helvetica'] as EditorFont[]).map(font => ({
      id: `font-${font}`,
      label: `Font: ${FONT_LABELS[font]}`,
      icon: <Type size={15} />,
      active: fmt.font === font,
      disabled: !fmt.canFormat,
      onClick: () => fmt.setFont(font),
    })),
  ];

  return (
    <div className="shrink-0 border-b border-[var(--border)] bg-white px-3 py-2 flex flex-wrap items-center gap-2">
      <DropdownMenu label={viewLabel} items={viewItems} />
      {showInEditor && <DropdownMenu label="Format" items={formatItems} />}
      {showInEditor && fmt.canFormat && (
        <span className="text-xs text-[var(--muted)] ml-1">
          {FONT_LABELS[fmt.font]} · {fmt.fontSize}px
        </span>
      )}
    </div>
  );
}
