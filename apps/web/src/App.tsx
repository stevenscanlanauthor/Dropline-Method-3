import { useCallback, useEffect, useRef, useState } from 'react';
import { compiledText, withDrop6SeededFromDrop5, type DropKind } from '@dropline/core';
import type { Project, ViewMode } from './lib/types';
import {
  createChapter,
  createDefaultProject,
  createSampleProject,
  DEFAULT_SETTINGS,
  duplicateChapter,
  migrateProject,
  reorderChapters,
  serialiseProject,
} from './lib/project';
import ResizeHandle from './components/ResizeHandle';
import { isImmediateAutosave, isManualAutosave, normaliseAutosaveInterval } from './lib/autosave';
import { downloadFile, loadAutosave, saveAutosave } from './lib/storage';
import { buildMarkdown } from './lib/markdown';
import { getBridge } from './lib/bridge';
import Sidebar from './components/Sidebar';
import AppMenuBar from './components/AppMenuBar';
import EditorPanel from './components/EditorPanel';
import Corkboard from './components/Corkboard';
import Inspector from './components/Inspector';
import PreviewView from './components/PreviewView';
import CompileModal from './components/CompileModal';
import CompiledManuscriptModal from './components/CompiledManuscriptModal';
import HelpPanel from './components/HelpPanel';
import StatusBar from './components/StatusBar';
import { EditorFormatProvider } from './lib/editor-format-context';
import NativeMenuBridge from './components/NativeMenuBridge';
import OpenInAppButton from './components/OpenInAppButton';
import OpenInAppLanding from './components/OpenInAppLanding';
import { shouldOfferOpenInApp } from './lib/open-in-app';

const SIDEBAR_MIN = 160;
const SIDEBAR_MAX = 480;
const INSPECTOR_MIN = 200;
const INSPECTOR_MAX = 520;

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export default function App() {
  const [project, setProject] = useState<Project>(() => {
    const saved = loadAutosave();
    if (!saved) return createDefaultProject();
    return migrateProject(saved);
  });
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(
    () => project.chapters[0]?.id ?? null,
  );
  const [selectedDrop, setSelectedDrop] = useState<DropKind>('drop2');
  const [viewMode, setViewMode] = useState<ViewMode>('editor');
  const [inspectorOpen, setInspectorOpen] = useState(project.settings.inspectorVisible !== false);
  const [showCompile, setShowCompile] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [compiled, setCompiled] = useState<{ text: string; chapters: Project['chapters']; includeTitlePage: boolean } | null>(null);
  const [autosaveLabel, setAutosaveLabel] = useState('Not yet autosaved');
  const [dirty, setDirty] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const openInputRef = useRef<HTMLInputElement>(null);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingAutosaveRef = useRef<Project | null>(null);
  const isDesktop = !!getBridge()?.isDesktop;
  const showOpenInApp = shouldOfferOpenInApp(isDesktop);

  useEffect(() => {
    if (isDesktop) document.documentElement.classList.add('dropline-desktop');
    return () => document.documentElement.classList.remove('dropline-desktop');
  }, [isDesktop]);
  const savedSnapshot = useRef(serialiseProject(project));
  const [sidebarWidth, setSidebarWidth] = useState(
    () => project.settings.sidebarWidth ?? DEFAULT_SETTINGS.sidebarWidth,
  );
  const [inspectorWidth, setInspectorWidth] = useState(
    () => project.settings.inspectorWidth ?? DEFAULT_SETTINGS.inspectorWidth,
  );

  const clearAutosaveTimer = useCallback(() => {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
  }, []);

  const flushAutosave = useCallback((proj: Project, label?: string) => {
    pendingAutosaveRef.current = null;
    clearAutosaveTimer();
    saveAutosave(proj);
    setAutosaveLabel(label ?? `Autosaved ${new Date().toLocaleTimeString()}`);
  }, [clearAutosaveTimer]);

  const scheduleAutosave = useCallback((proj: Project) => {
    const interval = normaliseAutosaveInterval(proj.settings.autosaveIntervalSec);

    if (isManualAutosave(interval)) {
      pendingAutosaveRef.current = null;
      clearAutosaveTimer();
      setAutosaveLabel('Manual save only');
      return;
    }

    if (isImmediateAutosave(interval)) {
      flushAutosave(proj);
      return;
    }

    pendingAutosaveRef.current = proj;
    clearAutosaveTimer();
    setAutosaveLabel(`Autosave every ${interval < 60 ? `${interval}s` : `${interval / 60} min`}…`);
    autosaveTimerRef.current = setTimeout(() => {
      if (pendingAutosaveRef.current) {
        flushAutosave(pendingAutosaveRef.current);
      }
    }, interval * 1000);
  }, [clearAutosaveTimer, flushAutosave]);

  const updateProject = useCallback((next: Project, markDirty = true) => {
    setProject(next);
    scheduleAutosave(next);
    if (markDirty) {
      setDirty(true);
      getBridge()?.setDirty?.(true);
    }
  }, [scheduleAutosave]);

  const selectedChapter = project.chapters.find(c => c.id === selectedChapterId) ?? null;

  useEffect(() => {
    setSidebarWidth(project.settings.sidebarWidth ?? DEFAULT_SETTINGS.sidebarWidth);
    setInspectorWidth(project.settings.inspectorWidth ?? DEFAULT_SETTINGS.inspectorWidth);
  }, [project.settings.sidebarWidth, project.settings.inspectorWidth]);

  const savePanelWidths = useCallback(() => {
    updateProject(
      {
        ...project,
        settings: { ...project.settings, sidebarWidth, inspectorWidth },
      },
      false,
    );
  }, [project, sidebarWidth, inspectorWidth, updateProject]);

  function confirmDiscard(): boolean {
    if (!dirty) return true;
    return window.confirm('You have unsaved changes. Discard them?');
  }

  function loadProject(next: Project, label: string, name: string | null = null) {
    setProject(next);
    setSelectedChapterId(next.chapters[0]?.id ?? null);
    setViewMode('editor');
    setInspectorOpen(next.settings.inspectorVisible !== false);
    savedSnapshot.current = serialiseProject(next);
    setDirty(false);
    setFileName(name);
    flushAutosave(next, label);
    getBridge()?.setDirty?.(false);
  }

  function handleNew() {
    if (!confirmDiscard()) return;
    loadProject(createDefaultProject(), 'New project', null);
  }

  function handleOpenFile(data: string, path?: string) {
    if (!confirmDiscard()) return;
    try {
      loadProject(migrateProject(JSON.parse(data)), path ? `Opened ${path.split(/[\\/]/).pop()}` : 'Opened project', path ?? null);
    } catch {
      window.alert('Could not read that file — invalid project format.');
    }
  }

  async function handleSave() {
    if (pendingAutosaveRef.current) {
      flushAutosave(pendingAutosaveRef.current);
    }
    const json = serialiseProject(project);
    saveAutosave(project);
    const bridge = getBridge();
    if (bridge?.saveToDisk) {
      const res = await bridge.saveToDisk(json);
      if (res.ok) {
        const name = res.filePath?.split(/[\\/]/).pop() ?? 'project';
        setFileName(res.filePath ?? null);
        savedSnapshot.current = json;
        setDirty(false);
        setAutosaveLabel(`Saved · ${name}`);
        bridge.setDirty?.(false);
      }
      return;
    }
    downloadFile(
      `${(project.title || 'dropline-project').replace(/[^\w.-]+/g, '-')}.dropline3`,
      json,
      'application/json',
    );
    savedSnapshot.current = json;
    setDirty(false);
    setAutosaveLabel('Saved to download');
    bridge?.setDirty?.(false);
  }

  async function handleExportMarkdown() {
    const md = buildMarkdown(project);
    const bridge = getBridge();
    if (bridge?.exportMarkdown) {
      const res = await bridge.exportMarkdown(md);
      if (res.ok) setAutosaveLabel('Markdown exported');
      return;
    }
    downloadFile(`${(project.title || 'dropline-export').replace(/[^\w.-]+/g, '-')}.md`, md, 'text/markdown');
    setAutosaveLabel('Markdown exported');
  }

  useEffect(() => {
    const bridge = getBridge();
    bridge?.onMenuNew?.(() => handleNew());
    bridge?.onRequestSave?.(() => { void handleSave(); });
    bridge?.onExportMarkdown?.(() => { void handleExportMarkdown(); });
    bridge?.onFileOpened?.(({ data, filePath }) => handleOpenFile(data, filePath));
    bridge?.onOpenSample?.(() => {
      if (!confirmDiscard()) return;
      loadProject(createSampleProject(), 'Sample project loaded', null);
    });
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      const key = e.key.toLowerCase();
      if (key === 'n') {
        e.preventDefault();
        handleNew();
      } else if (key === 'o') {
        e.preventDefault();
        openInputRef.current?.click();
      } else if (key === 's') {
        e.preventDefault();
        void handleSave();
      } else if (e.shiftKey && key === 'd') {
        e.preventDefault();
        handleDuplicateChapter();
      } else if (e.shiftKey && key === 'p') {
        e.preventDefault();
        setViewMode(m => (m === 'preview' ? 'editor' : 'preview'));
      } else if (e.shiftKey && key === 'k') {
        e.preventDefault();
        setViewMode('corkboard');
      } else if (e.shiftKey && key === 'm') {
        e.preventDefault();
        setShowCompile(true);
      } else if (e.shiftKey && key === 'i') {
        e.preventDefault();
        handleToggleInspector();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [project, selectedChapterId, dirty]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== '?' || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = document.activeElement;
      if (
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        el?.getAttribute('contenteditable') === 'true'
      ) {
        return;
      }
      e.preventDefault();
      setShowHelp(true);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (pendingAutosaveRef.current) {
        flushAutosave(pendingAutosaveRef.current);
      }
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty, flushAutosave]);

  useEffect(() => () => clearAutosaveTimer(), [clearAutosaveTimer]);

  function patchProject(patch: Partial<Project>) {
    updateProject({ ...project, ...patch, settings: patch.settings ?? project.settings });
  }

  function patchChapter(chapterId: string, patch: Partial<Project['chapters'][0]>) {
    updateProject({
      ...project,
      chapters: project.chapters.map(c => (c.id === chapterId ? { ...c, ...patch } : c)),
    });
  }

  function patchDrop(chapterId: string, kind: DropKind, contentHtml: string) {
    updateProject({
      ...project,
      chapters: project.chapters.map(c => {
        if (c.id !== chapterId) return c;
        const drops = withDrop6SeededFromDrop5({
          title: c.title,
          drops: { ...c.drops, [kind]: contentHtml },
        });
        return { ...c, drops };
      }),
    });
  }

  function handleDropChange(drop: DropKind) {
    if (drop === 'drop6' && selectedChapterId) {
      const ch = project.chapters.find(c => c.id === selectedChapterId);
      if (ch) {
        const drops = withDrop6SeededFromDrop5({ title: ch.title, drops: ch.drops });
        if (drops.drop6 && drops.drop6 !== ch.drops.drop6) {
          updateProject({
            ...project,
            chapters: project.chapters.map(c =>
              c.id === selectedChapterId ? { ...c, drops } : c,
            ),
          });
        }
      }
    }
    setSelectedDrop(drop);
  }

  function handleDuplicateChapter() {
    if (!selectedChapterId) return;
    const next = duplicateChapter(project, selectedChapterId);
    const copy = next.chapters[next.chapters.length - 1];
    updateProject(next);
    setSelectedChapterId(copy.id);
    setViewMode('editor');
  }

  function addChapter() {
    const ch = createChapter(`Chapter ${project.chapters.length + 1}`, project.chapters.length);
    updateProject({ ...project, chapters: [...project.chapters, ch] });
    setSelectedChapterId(ch.id);
    setViewMode('editor');
  }

  function deleteChapter(id: string) {
    if (project.chapters.length <= 1) return;
    if (!window.confirm('Delete this chapter?')) return;
    const chapters = project.chapters.filter(c => c.id !== id);
    updateProject({ ...project, chapters });
    if (selectedChapterId === id) setSelectedChapterId(chapters[0]?.id ?? null);
  }

  function handleCompile(scope: 'fullManuscript' | 'selectedChapter', includeTitlePage: boolean) {
    const chapters =
      scope === 'selectedChapter' && selectedChapterId
        ? project.chapters.filter(c => c.id === selectedChapterId)
        : project.chapters;
    const text = compiledText({
      title: project.title,
      authorName: project.authorName,
      authorContact: project.authorContact,
      chapters: chapters.map(c => ({ id: c.id, title: c.title, drops: c.drops })),
      includeTitlePage,
    });
    setShowCompile(false);
    setCompiled({ text, chapters, includeTitlePage });
  }

  const focusMode = project.settings.focusMode;
  const inspectorShown = inspectorOpen && !focusMode && viewMode === 'editor';

  function handleToggleInspector() {
    if (viewMode !== 'editor') {
      setViewMode('editor');
    }
    if (focusMode) {
      setInspectorOpen(true);
      updateProject(
        { ...project, settings: { ...project.settings, focusMode: false, inspectorVisible: true } },
        false,
      );
      return;
    }
    const next = !inspectorOpen;
    setInspectorOpen(next);
    updateProject(
      { ...project, settings: { ...project.settings, inspectorVisible: next } },
      false,
    );
  }

  const handleExitFocusMode = useCallback(() => {
    setProject(prev => {
      const next = { ...prev, settings: { ...prev.settings, focusMode: false } };
      scheduleAutosave(next);
      return next;
    });
  }, [scheduleAutosave]);

  const handleToggleFocusMode = useCallback(() => {
    setProject(prev => {
      const next = {
        ...prev,
        settings: { ...prev.settings, focusMode: !prev.settings.focusMode },
      };
      scheduleAutosave(next);
      return next;
    });
  }, [scheduleAutosave]);

  useEffect(() => {
    if (!project.settings.focusMode) return;
    if (showCompile || compiled) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      handleExitFocusMode();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [project.settings.focusMode, showCompile, compiled, handleExitFocusMode]);

  const openInAppRoute =
    typeof window !== 'undefined' &&
    window.location.pathname.replace(/\/+$/, '') === '/open-in-app';

  if (openInAppRoute) {
    return <OpenInAppLanding />;
  }

  return (
    <EditorFormatProvider>
    <NativeMenuBridge
      onDuplicateChapter={handleDuplicateChapter}
      onViewEditor={() => setViewMode('editor')}
      onViewCorkboard={() => setViewMode('corkboard')}
      onViewPreview={() => setViewMode('preview')}
      onToggleInspector={handleToggleInspector}
      onCompile={() => setShowCompile(true)}
    />
    <div className="h-screen flex flex-col">
      <header className={`app-chrome shrink-0 flex items-stretch min-h-[3rem] ${isDesktop ? 'desktop-titlebar' : ''}`}>
        <div className={`app-chrome-brand ${isDesktop ? 'desktop-drag' : ''}`}>
          <img src={`${import.meta.env.BASE_URL}logo-dropline-icon.png`} alt="" className="h-7 w-7 object-contain shrink-0" aria-hidden />
          <div className="min-w-0 hidden sm:block">
            <span className="text-sm font-semibold tracking-tight text-[var(--ink)] block leading-tight">Dropline</span>
            <span className="text-[10px] text-[var(--muted)] italic truncate block max-w-[12rem]">One drop at a time</span>
          </div>
        </div>
        <div className="app-chrome-menus">
          <AppMenuBar
            viewMode={viewMode}
            inspectorShown={inspectorShown}
            focusMode={focusMode}
            showInEditor={viewMode === 'editor' && !!selectedChapter}
            canDuplicateChapter={!!selectedChapterId}
            onNew={handleNew}
            onOpen={() => openInputRef.current?.click()}
            onSave={() => void handleSave()}
            onExportMarkdown={() => void handleExportMarkdown()}
            onOpenSample={() => {
              if (!confirmDiscard()) return;
              loadProject(createSampleProject(), 'Sample project', null);
            }}
            onViewChange={setViewMode}
            onToggleInspector={handleToggleInspector}
            onExitFocusMode={handleExitFocusMode}
            onToggleFocusMode={handleToggleFocusMode}
            onCompile={() => setShowCompile(true)}
            onDuplicateChapter={handleDuplicateChapter}
            onOpenHelp={() => setShowHelp(true)}
          />
        </div>
        <div className="app-chrome-actions desktop-no-drag">
          {showOpenInApp && <OpenInAppButton />}
          {dirty && (
            <span className="text-xs text-[var(--muted)] shrink-0 whitespace-nowrap">Unsaved</span>
          )}
          <input
            ref={openInputRef}
            type="file"
            accept=".dropline3,.json,application/json"
            hidden
            onChange={e => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = () => handleOpenFile(String(reader.result), file.name);
              reader.readAsText(file);
              e.target.value = '';
            }}
          />
        </div>
      </header>

      {focusMode && (
        <div className="shrink-0 bg-[var(--accent-soft)] border-b border-[var(--accent-muted)] px-4 py-2 flex items-center justify-between gap-3 text-sm">
          <span className="text-[var(--ink)]">
            Focus mode — sidebar and inspector are hidden. Press <kbd>Esc</kbd> to exit.
          </span>
          <button type="button" onClick={handleExitFocusMode} className="panel-header-action text-xs">
            Exit Focus Mode
          </button>
        </div>
      )}

      <div className="flex-1 flex min-h-0 overflow-hidden">
        {!focusMode && viewMode === 'editor' && (
          <>
            <Sidebar
              chapters={project.chapters}
              selectedId={selectedChapterId}
              width={sidebarWidth}
              onSelect={id => { setSelectedChapterId(id); setViewMode('editor'); }}
              onAdd={addChapter}
              onDelete={deleteChapter}
            />
            <ResizeHandle
              onResize={delta => setSidebarWidth(w => clamp(w + delta, SIDEBAR_MIN, SIDEBAR_MAX))}
              onResizeEnd={savePanelWidths}
            />
          </>
        )}

        {viewMode === 'corkboard' ? (
          <Corkboard
            chapters={project.chapters}
            selectedId={selectedChapterId}
            onSelect={id => { setSelectedChapterId(id); setViewMode('editor'); }}
            onReorder={ids => updateProject(reorderChapters(project, ids))}
            onReturn={() => setViewMode('editor')}
          />
        ) : viewMode === 'preview' ? (
          <PreviewView project={project} onReturn={() => setViewMode('editor')} />
        ) : selectedChapter ? (
          <EditorPanel
            chapter={selectedChapter}
            selectedDrop={selectedDrop}
            onDropChange={handleDropChange}
            onTitleChange={title => patchChapter(selectedChapter.id, { title })}
            onContentChange={(drop, content) => patchDrop(selectedChapter.id, drop, content)}
            editorWidth={project.settings.editorWidth}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-[var(--muted)]">Select a chapter</div>
        )}

        {inspectorShown && (
          <>
            <ResizeHandle
              onResize={delta => setInspectorWidth(w => clamp(w - delta, INSPECTOR_MIN, INSPECTOR_MAX))}
              onResizeEnd={savePanelWidths}
            />
            <Inspector project={project} width={inspectorWidth} onUpdate={patchProject} />
          </>
        )}
      </div>

      <StatusBar
        chapter={selectedChapter}
        chapters={project.chapters}
        selectedDrop={selectedDrop}
        autosaveLabel={autosaveLabel}
        viewMode={viewMode}
        focusMode={focusMode}
      />

      {showCompile && (
        <CompileModal
          project={project}
          selectedChapterId={selectedChapterId}
          onClose={() => setShowCompile(false)}
          onCompile={handleCompile}
        />
      )}

      {compiled && (
        <CompiledManuscriptModal
          project={project}
          text={compiled.text}
          chapters={compiled.chapters}
          includeTitlePage={compiled.includeTitlePage}
          onClose={() => setCompiled(null)}
        />
      )}

      {showHelp && <HelpPanel onClose={() => setShowHelp(false)} />}

      {dirty && fileName && (
        <span className="sr-only">Unsaved changes</span>
      )}
    </div>
    </EditorFormatProvider>
  );
}
