import { useEffect, useRef, useState } from 'react';
import {
  DROP_KINDS,
  DROP_KIND_META,
  type DropKind,
  canEdit,
  drop5OverLimitWarning,
  dropPlainText,
  enforceDropContent,
  hasContent,
  dropOneComplete,
  wordCount,
} from '@dropline/core';
import type { Chapter } from '../lib/types';
import { dropProgress } from '../lib/stats';
import { useEditorFormatRegister } from '../lib/editor-format-context';
import RichEditor, { type RichEditorHandle } from './RichEditor';
import FormatToolbar from './FormatToolbar';

const DROP_HELP: Record<DropKind | 'drop1', string> = {
  drop1: 'The chapter/scene title becomes the chapter name. Drop 2 cannot start until the heading is in place.',
  drop2: 'One sentence that states purpose and movement for this chapter.',
  drop3: 'One paragraph plan — want, pressure, change, and consequence.',
  drop4: 'Rest period notes. Bullets only. Each new line starts a new note.',
  drop5: 'Full chapter draft — up to 500 words (warning only).',
  drop6: 'Final draft for compiling. Starts from your Drop 5 text — edit and expand here. Only Drop 6 is included in the compiled manuscript.',
};

interface Props {
  chapter: Chapter;
  selectedDrop: DropKind;
  onDropChange: (drop: DropKind) => void;
  onTitleChange: (title: string) => void;
  onContentChange: (drop: DropKind, content: string) => void;
  editorWidth: number;
}

export default function EditorPanel({
  chapter,
  selectedDrop,
  onDropChange,
  onTitleChange,
  onContentChange,
  editorWidth,
}: Props) {
  const editable = canEdit(selectedDrop, { title: chapter.title, drops: chapter.drops });
  const drop5Text = dropPlainText({ title: chapter.title, drops: chapter.drops }, 'drop5');
  const [localContent, setLocalContent] = useState('');
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const richRef = useRef<RichEditorHandle>(null);
  const plainRef = useRef<HTMLTextAreaElement>(null);
  const { setEditorKind, registerRich, registerPlain, syncFromSelection } = useEditorFormatRegister();

  const useRich =
    selectedDrop === 'drop2' || selectedDrop === 'drop3' || selectedDrop === 'drop5' || selectedDrop === 'drop6';

  useEffect(() => {
    if (!editable) {
      setEditorKind('none');
      return;
    }
    setEditorKind(useRich ? 'rich' : 'plain');
  }, [editable, useRich, selectedDrop, setEditorKind]);

  useEffect(() => {
    const raw = chapter.drops[selectedDrop] ?? '';
    setLocalContent(raw.includes('<') ? dropPlainText({ title: chapter.title, drops: chapter.drops }, selectedDrop) : raw);
  }, [chapter.id, selectedDrop, chapter.drops, chapter.title]);

  function persist(value: string) {
    const enforced = enforceDropContent(selectedDrop, value);
    setLocalContent(enforced);
    const html =
      selectedDrop === 'drop4'
        ? enforced.split('\n').map(l => `<p>${l}</p>`).join('')
        : enforced.split('\n').map(l => `<p>${l || '<br>'}</p>`).join('');
    onContentChange(selectedDrop, html);
  }

  function handleChange(value: string) {
    let next = value;
    if (selectedDrop === 'drop2') next = value.replace(/\n/g, ' ');
    setLocalContent(next);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => persist(next), 600);
  }

  function handleRichChange(html: string) {
    onContentChange(selectedDrop, html);
  }

  function handleDrop4KeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (selectedDrop !== 'drop4' || e.key !== 'Enter') return;
    e.preventDefault();
    const el = e.currentTarget;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const next = localContent.slice(0, start) + '\n• ' + localContent.slice(end);
    handleChange(next);
    setTimeout(() => { el.selectionStart = el.selectionEnd = start + 3; }, 0);
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[var(--mist)]">
      <div className="chapter-title-row border-b border-[var(--border)] bg-white w-full">
        <label className="chapter-title-field desktop-no-drag flex items-center gap-2 px-4 py-2.5 min-w-0">
          <span className="text-xs text-[var(--muted)] whitespace-nowrap shrink-0">Chapter/Scene title</span>
          <input
            type="text"
            value={chapter.title}
            onChange={e => onTitleChange(e.target.value)}
            className="flex-1 min-w-0 font-semibold text-sm border border-[var(--border)] rounded-lg px-3 py-1.5"
            placeholder="Chapter/Scene title"
          />
        </label>
        <div className="chapter-drop-bar desktop-no-drag">
          <span className={`drop-pill ${dropOneComplete(chapter.title) ? 'done' : 'locked'}`} style={{ cursor: 'default' }}>
            Drop 1 {dropOneComplete(chapter.title) ? '✓' : '○'}
          </span>
          {DROP_KINDS.map(d => {
            const done = hasContent(d, { title: chapter.title, drops: chapter.drops });
            const active = selectedDrop === d;
            return (
              <button key={d} type="button" className={`drop-pill ${active ? 'active' : done ? 'done' : 'locked'}`} onClick={() => onDropChange(d)}>
                {DROP_KIND_META[d].title} {done ? '✓' : '○'}
              </button>
            );
          })}
          {selectedDrop === 'drop5' && (
            <span className={`text-xs shrink-0 whitespace-nowrap pl-1 ${drop5OverLimitWarning(drop5Text) ? 'text-red-600' : 'text-[var(--muted)]'}`}>
              {drop5OverLimitWarning(drop5Text) ? `Warning: ${wordCount(drop5Text)} words (guide 500)` : `${wordCount(drop5Text)} words`}
            </span>
          )}
        </div>
      </div>

      <p className="px-4 py-2 text-xs text-[var(--muted)] bg-white border-b border-[var(--border)]">
        <span className="font-medium text-[var(--ink)]">{DROP_KIND_META[selectedDrop].title}: </span>
        {DROP_HELP[selectedDrop]}
      </p>

      {editable && <FormatToolbar />}

      <div className="flex-1 overflow-auto w-full min-w-0 py-6 px-4">
        {!editable ? (
          <div className="text-center text-[var(--muted)] mt-12 max-w-md mx-auto">
            <p className="font-medium text-[var(--ink)]">Complete the previous drop before editing {DROP_KIND_META[selectedDrop].title}.</p>
            <p className="text-sm mt-2">Headings become chapter names. Each drop unlocks the next.</p>
          </div>
        ) : (
          <div className="mx-auto w-full min-w-0" style={{ maxWidth: editorWidth }}>
            {useRich ? (
              <RichEditor
                ref={node => {
                  richRef.current = node;
                  registerRich(node);
                }}
                value={chapter.drops[selectedDrop] ?? ''}
                onChange={handleRichChange}
                onFormatAtCursor={({ fontSize, fontFamily }) => syncFromSelection(fontSize, fontFamily)}
                placeholder="Start writing…"
              />
            ) : (
              <textarea
                ref={node => {
                  plainRef.current = node;
                  registerPlain(node);
                }}
                value={localContent}
                onChange={e => handleChange(e.target.value)}
                onBlur={() => persist(localContent)}
                onKeyDown={handleDrop4KeyDown}
                className="w-full min-h-[420px] resize-y border border-[var(--border)] rounded-xl p-6 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--accent-soft)] text-base leading-relaxed"
                style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
                placeholder={selectedDrop === 'drop4' ? '• First note…' : 'Start writing…'}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function DropDots({ chapter }: { chapter: Chapter }) {
  const dots = (['drop1', ...DROP_KINDS] as const).map((d, i) => (
    <span
      key={d}
      className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-semibold ${
        dropProgress(chapter, d) ? 'bg-[var(--accent)] text-white' : 'bg-[var(--border)] text-[var(--muted)]'
      }`}
    >
      {i + 1}
    </span>
  ));
  return <div className="flex gap-1">{dots}</div>;
}
