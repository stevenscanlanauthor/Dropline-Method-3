import { useEffect, useState } from 'react';
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
  FilePlus,
  FolderOpen,
  Save,
  Download,
  BookOpen,
  Copy,
  ExternalLink,
} from 'lucide-react';
import type { ViewMode } from '../lib/types';
import { useEditorFormat, FONT_LABELS, type EditorFont } from '../lib/editor-format-context';
import { LIST_STYLE_LABELS, type ListStyle } from '../lib/list-format';
import DropdownMenu, { type DropdownItem } from './DropdownMenu';

const sep = (id: string): DropdownItem => ({ id, type: 'separator' });

interface Props {
  viewMode: ViewMode;
  inspectorShown: boolean;
  focusMode: boolean;
  showInEditor: boolean;
  canDuplicateChapter: boolean;
  onNew: () => void;
  onOpen: () => void;
  onSave: () => void;
  onExportMarkdown: () => void;
  onOpenSample: () => void;
  onViewChange: (mode: ViewMode) => void;
  onToggleInspector: () => void;
  onExitFocusMode: () => void;
  onCompile: () => void;
  onDuplicateChapter: () => void;
}

export default function AppMenuBar({
  viewMode,
  inspectorShown,
  focusMode,
  showInEditor,
  canDuplicateChapter,
  onNew,
  onOpen,
  onSave,
  onExportMarkdown,
  onOpenSample,
  onViewChange,
  onToggleInspector,
  onExitFocusMode,
  onCompile,
  onDuplicateChapter,
}: Props) {
  const fmt = useEditorFormat();
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  function execEdit(cmd: string) {
    fmt.focusEditor();
    document.execCommand(cmd, false);
  }

  useEffect(() => {
    if (!showInEditor || !fmt.canFormat) return;
    function onKeyDown(e: KeyboardEvent) {
      if (!(e.metaKey || e.ctrlKey) || e.shiftKey) return;
      const key = e.key.toLowerCase();
      if (key === 'b') {
        e.preventDefault();
        fmt.applyBold();
      } else if (key === 'i') {
        e.preventDefault();
        fmt.applyItalic();
      } else if (key === 'u') {
        e.preventDefault();
        fmt.applyUnderline();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showInEditor, fmt]);

  function menuProps(id: string) {
    return {
      variant: 'menubar' as const,
      open: openMenu === id,
      onOpenChange: (next: boolean) => setOpenMenu(next ? id : null),
    };
  }

  const fileItems: DropdownItem[] = [
    { id: 'new', label: 'New Project', icon: <FilePlus size={15} />, shortcut: '⌘N', onClick: onNew },
    { id: 'open', label: 'Open Project…', icon: <FolderOpen size={15} />, shortcut: '⌘O', onClick: onOpen },
    { id: 'sample', label: 'Open Sample Project', icon: <BookOpen size={15} />, onClick: onOpenSample },
    sep('file-sep-1'),
    { id: 'save', label: 'Save', icon: <Save size={15} />, shortcut: '⌘S', onClick: onSave },
    sep('file-sep-2'),
    { id: 'export', label: 'Export Markdown', icon: <Download size={15} />, onClick: onExportMarkdown },
  ];

  const editItems: DropdownItem[] = [
    { id: 'undo', label: 'Undo', shortcut: '⌘Z', onClick: () => execEdit('undo') },
    { id: 'redo', label: 'Redo', shortcut: '⇧⌘Z', onClick: () => execEdit('redo') },
    sep('edit-sep-1'),
    { id: 'cut', label: 'Cut', shortcut: '⌘X', onClick: () => execEdit('cut') },
    { id: 'copy', label: 'Copy', shortcut: '⌘C', onClick: () => execEdit('copy') },
    { id: 'paste', label: 'Paste', shortcut: '⌘V', onClick: () => execEdit('paste') },
    { id: 'delete', label: 'Delete', onClick: () => execEdit('delete') },
    { id: 'select-all', label: 'Select All', shortcut: '⌘A', onClick: () => execEdit('selectAll') },
  ];

  const formatItems: DropdownItem[] = [
    {
      id: 'bold',
      label: 'Bold',
      icon: <Bold size={15} />,
      shortcut: '⌘B',
      active: fmt.boldActive,
      disabled: !fmt.canFormat,
      onClick: fmt.applyBold,
    },
    {
      id: 'italic',
      label: 'Italic',
      icon: <Italic size={15} />,
      shortcut: '⌘I',
      active: fmt.italicActive,
      disabled: !fmt.canFormat,
      onClick: fmt.applyItalic,
    },
    {
      id: 'underline',
      label: 'Underline',
      icon: <Underline size={15} />,
      shortcut: '⌘U',
      active: fmt.underlineActive,
      disabled: !fmt.canFormat,
      onClick: fmt.applyUnderline,
    },
    sep('fmt-sep-1'),
    {
      id: 'indent',
      label: 'Indent',
      icon: <Indent size={15} />,
      shortcut: '⌘]',
      disabled: !fmt.canFormat,
      onClick: fmt.applyIndent,
    },
    {
      id: 'outdent',
      label: 'Outdent',
      icon: <Outdent size={15} />,
      shortcut: '⌘[',
      disabled: !fmt.canFormat,
      onClick: fmt.applyOutdent,
    },
    ...(['bullet', 'dash', 'circle', 'number'] as ListStyle[]).map(style => ({
      id: `list-${style}`,
      label: LIST_STYLE_LABELS[style],
      icon: <List size={15} />,
      disabled: !fmt.canFormat,
      onClick: () => fmt.applyList(style),
    })),
    sep('fmt-sep-2'),
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

  const viewItems: DropdownItem[] = [
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
      shortcut: '⇧⌘K',
      active: viewMode === 'corkboard',
      onClick: () => onViewChange('corkboard'),
    },
    {
      id: 'preview',
      label: 'Preview Manuscript',
      icon: <Eye size={15} />,
      shortcut: '⇧⌘P',
      active: viewMode === 'preview',
      onClick: () => onViewChange('preview'),
    },
    sep('view-sep-1'),
    ...(focusMode
      ? [{
          id: 'exit-focus',
          label: 'Exit Focus Mode',
          icon: <PenLine size={15} />,
          onClick: onExitFocusMode,
        }]
      : []),
    {
      id: 'inspector',
      label: inspectorShown ? 'Hide Inspector' : 'Show Inspector',
      icon: <PanelRight size={15} />,
      shortcut: '⇧⌘I',
      active: inspectorShown,
      onClick: onToggleInspector,
    },
    {
      id: 'compile',
      label: 'Compile Manuscript',
      icon: <FileOutput size={15} />,
      shortcut: '⇧⌘M',
      onClick: onCompile,
    },
  ];

  const droplineItems: DropdownItem[] = [
    {
      id: 'dup-chapter',
      label: 'Duplicate Chapter',
      icon: <Copy size={15} />,
      shortcut: '⇧⌘D',
      disabled: !canDuplicateChapter,
      onClick: onDuplicateChapter,
    },
    sep('drop-sep-1'),
    {
      id: 'drop-preview',
      label: 'Preview Manuscript',
      icon: <Eye size={15} />,
      shortcut: '⇧⌘P',
      active: viewMode === 'preview',
      onClick: () => onViewChange('preview'),
    },
    {
      id: 'drop-corkboard',
      label: 'Corkboard',
      icon: <LayoutGrid size={15} />,
      shortcut: '⇧⌘K',
      active: viewMode === 'corkboard',
      onClick: () => onViewChange('corkboard'),
    },
    sep('drop-sep-2'),
    {
      id: 'drop-compile',
      label: 'Compile Manuscript',
      icon: <FileOutput size={15} />,
      shortcut: '⇧⌘M',
      onClick: onCompile,
    },
    {
      id: 'drop-export',
      label: 'Export Markdown',
      icon: <Download size={15} />,
      onClick: onExportMarkdown,
    },
    sep('drop-sep-3'),
    ...(focusMode
      ? [{
          id: 'drop-exit-focus',
          label: 'Exit Focus Mode',
          icon: <PenLine size={15} />,
          onClick: onExitFocusMode,
        }]
      : []),
    {
      id: 'drop-inspector',
      label: inspectorShown ? 'Hide Inspector' : 'Show or Hide Inspector',
      icon: <PanelRight size={15} />,
      shortcut: '⇧⌘I',
      active: inspectorShown,
      onClick: onToggleInspector,
    },
  ];

  const helpItems: DropdownItem[] = [
    {
      id: 'help-site',
      label: 'Visit DroplineMethod.com',
      icon: <ExternalLink size={15} />,
      onClick: () => window.open('https://www.droplinemethod.com', '_blank', 'noopener'),
    },
  ];

  return (
    <div className="desktop-no-drag desktop-menubar shrink-0 border-b border-[var(--border)] bg-white px-4 py-1.5 flex flex-nowrap items-center gap-1 overflow-x-auto">
      <DropdownMenu label="File" items={fileItems} {...menuProps('file')} />
      <DropdownMenu label="Edit" items={editItems} {...menuProps('edit')} />
      {showInEditor && <DropdownMenu label="Format" items={formatItems} {...menuProps('format')} />}
      <DropdownMenu label="View" items={viewItems} {...menuProps('view')} />
      <DropdownMenu label="Dropline" items={droplineItems} {...menuProps('dropline')} />
      <DropdownMenu label="Help" items={helpItems} {...menuProps('help')} />
    </div>
  );
}
