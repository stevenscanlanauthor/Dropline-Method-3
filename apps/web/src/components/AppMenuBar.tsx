import { useEffect, useState } from 'react';
import {
  Bold,
  Italic,
  Underline,
  LayoutGrid,
  Eye,
  FileOutput,
  PanelRight,
  PenLine,
  Minus,
  Plus,
  FilePlus,
  FolderOpen,
  Save,
  Download,
  BookOpen,
  Copy,
  ExternalLink,
  CircleHelp,
} from 'lucide-react';
import type { ViewMode } from '../lib/types';
import { useEditorFormat } from '../lib/editor-format-context';
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
  onOpenHelp: () => void;
  onToggleFocusMode: () => void;
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
  onOpenHelp,
  onToggleFocusMode,
}: Props) {
  const fmt = useEditorFormat();
  const [openMenu, setOpenMenu] = useState<string | null>(null);

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
    { id: 'undo', label: 'Undo', shortcut: '⌘Z', onClick: () => fmt.runEditCommand('undo') },
    { id: 'redo', label: 'Redo', shortcut: '⇧⌘Z', onClick: () => fmt.runEditCommand('redo') },
    sep('edit-sep-1'),
    { id: 'cut', label: 'Cut', shortcut: '⌘X', onClick: () => fmt.runEditCommand('cut') },
    { id: 'copy', label: 'Copy', shortcut: '⌘C', onClick: () => fmt.runEditCommand('copy') },
    { id: 'paste', label: 'Paste', shortcut: '⌘V', onClick: () => fmt.runEditCommand('paste') },
    { id: 'delete', label: 'Delete', onClick: () => fmt.runEditCommand('delete') },
    { id: 'select-all', label: 'Select All', shortcut: '⌘A', onClick: () => fmt.runEditCommand('selectAll') },
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
  ];

  const viewItems: DropdownItem[] = [
    {
      id: 'editor',
      label: 'Editor',
      icon: <PenLine size={15} />,
      active: viewMode === 'editor' && !focusMode,
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
    {
      id: 'inspector',
      label: inspectorShown ? 'Hide Inspector' : 'Show Inspector',
      icon: <PanelRight size={15} />,
      shortcut: '⇧⌘I',
      active: inspectorShown,
      onClick: onToggleInspector,
    },
    sep('view-sep-2'),
    focusMode
      ? {
          id: 'exit-focus',
          label: 'Exit Focus Mode',
          icon: <PenLine size={15} />,
          shortcut: 'Esc',
          onClick: onExitFocusMode,
        }
      : {
          id: 'enter-focus',
          label: 'Enter Focus Mode',
          icon: <PenLine size={15} />,
          onClick: onToggleFocusMode,
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
  ];

  const viewMenuActive =
    viewMode !== 'editor' || inspectorShown || focusMode;
  const formatMenuActive =
    fmt.boldActive || fmt.italicActive || fmt.underlineActive;

  const helpItems: DropdownItem[] = [
    {
      id: 'help-guide',
      label: 'Dropline Method Help',
      icon: <CircleHelp size={15} />,
      shortcut: '?',
      onClick: onOpenHelp,
    },
    sep('help-sep-1'),
    {
      id: 'help-site',
      label: 'Visit DroplineMethod.com',
      icon: <ExternalLink size={15} />,
      onClick: () => window.open('https://www.droplinemethod.com', '_blank', 'noopener'),
    },
  ];

  return (
    <nav
      className="desktop-no-drag desktop-menubar flex flex-wrap items-center gap-0.5 overflow-visible py-1"
      aria-label="Application menu"
    >
      <DropdownMenu label="File" items={fileItems} {...menuProps('file')} />
      <DropdownMenu label="Edit" items={editItems} {...menuProps('edit')} />
      <DropdownMenu
        label="View"
        items={viewItems}
        menuActive={viewMenuActive}
        {...menuProps('view')}
      />
      {viewMode === 'editor' && (
        <DropdownMenu
          label="Format"
          items={formatItems}
          menuActive={formatMenuActive}
          {...menuProps('format')}
        />
      )}
      <DropdownMenu label="Dropline" items={droplineItems} {...menuProps('dropline')} />
      <DropdownMenu label="Help" items={helpItems} {...menuProps('help')} />
    </nav>
  );
}
