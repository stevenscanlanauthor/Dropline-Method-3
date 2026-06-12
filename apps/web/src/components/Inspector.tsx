import { AUTOSAVE_INTERVAL_OPTIONS, type AutosaveIntervalSec } from '../lib/autosave';
import type { Project } from '../lib/types';

interface Props {
  project: Project;
  width: number;
  onUpdate: (patch: Partial<Project>) => void;
}

export default function Inspector({ project, width, onUpdate }: Props) {
  return (
    <aside
      className="border-l border-[var(--border)] bg-white shrink-0 overflow-y-auto p-4 space-y-4 text-sm min-w-0"
      style={{ width, minWidth: width, maxWidth: width }}
    >
      <h3 className="font-semibold text-[var(--ink)]">Inspector</h3>
      <label className="block space-y-1">
        <span className="text-xs text-[var(--muted)]">Book title</span>
        <input
          value={project.title}
          onChange={e => onUpdate({ title: e.target.value })}
          className="w-full border border-[var(--border)] rounded-lg px-2 py-1.5 text-sm"
        />
      </label>
      <label className="block space-y-1">
        <span className="text-xs text-[var(--muted)]">Author name</span>
        <input
          value={project.authorName}
          onChange={e => onUpdate({ authorName: e.target.value })}
          className="w-full border border-[var(--border)] rounded-lg px-2 py-1.5 text-sm"
        />
      </label>
      <label className="block space-y-1">
        <span className="text-xs text-[var(--muted)]">Contact (optional)</span>
        <input
          value={project.authorContact}
          onChange={e => onUpdate({ authorContact: e.target.value })}
          className="w-full border border-[var(--border)] rounded-lg px-2 py-1.5 text-sm"
        />
      </label>
      <label className="block space-y-1">
        <span className="text-xs text-[var(--muted)]">Working promise</span>
        <textarea
          value={project.promise}
          onChange={e => onUpdate({ promise: e.target.value })}
          rows={3}
          className="w-full border border-[var(--border)] rounded-lg px-2 py-1.5 text-sm resize-y"
          placeholder="What experience should this book deliver?"
        />
      </label>
      <label className="block space-y-1">
        <span className="text-xs text-[var(--muted)]">Editor width (px)</span>
        <input
          type="number"
          min={480}
          max={960}
          value={project.settings.editorWidth}
          onChange={e => onUpdate({ settings: { ...project.settings, editorWidth: Number(e.target.value) || 720 } })}
          className="w-full border border-[var(--border)] rounded-lg px-2 py-1.5 text-sm"
        />
      </label>
      <label className="block space-y-1">
        <span className="text-xs text-[var(--muted)]">Autosave frequency</span>
        <select
          value={project.settings.autosaveIntervalSec}
          onChange={e =>
            onUpdate({
              settings: {
                ...project.settings,
                autosaveIntervalSec: Number(e.target.value) as AutosaveIntervalSec,
              },
            })
          }
          className="w-full border border-[var(--border)] rounded-lg px-2 py-1.5 text-sm bg-white"
        >
          {AUTOSAVE_INTERVAL_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <p className="text-[11px] text-[var(--muted)] leading-snug">
          Autosave keeps a backup in your browser. Use File → Save to write a .dropline3 file.
        </p>
      </label>
      <label className="flex items-center gap-2 text-xs">
        <input
          type="checkbox"
          checked={project.settings.focusMode}
          onChange={e => onUpdate({ settings: { ...project.settings, focusMode: e.target.checked } })}
        />
        Focus mode (hide sidebar & inspector)
      </label>
    </aside>
  );
}
