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
      className="border-l border-[var(--border)] bg-[var(--surface)] shrink-0 overflow-y-auto p-4 space-y-5 text-sm min-w-0"
      style={{ width, minWidth: width, maxWidth: width }}
    >
      <h3 className="font-semibold text-[var(--ink)] text-sm">Inspector</h3>

      <section className="inspector-section space-y-3">
        <h4 className="inspector-section-title">Book & title page</h4>
        <label className="block space-y-1">
          <span className="text-xs text-[var(--muted)]">Book title</span>
          <input
            value={project.title}
            onChange={e => onUpdate({ title: e.target.value })}
            className="field-input"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs text-[var(--muted)]">Author name</span>
          <input
            value={project.authorName}
            onChange={e => onUpdate({ authorName: e.target.value })}
            className="field-input"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs text-[var(--muted)]">Contact (optional)</span>
          <input
            value={project.authorContact}
            onChange={e => onUpdate({ authorContact: e.target.value })}
            className="field-input"
            placeholder="Email or website"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs text-[var(--muted)]">Working promise</span>
          <textarea
            value={project.promise}
            onChange={e => onUpdate({ promise: e.target.value })}
            rows={3}
            className="field-input resize-y"
            placeholder="What experience should this book deliver?"
          />
          <p className="text-[11px] text-[var(--muted)]">Shown in Preview only — not exported on compile.</p>
        </label>
      </section>

      <section className="inspector-section space-y-3">
        <h4 className="inspector-section-title">Editor</h4>
        <label className="block space-y-1">
          <span className="text-xs text-[var(--muted)]">Editor width (px)</span>
          <input
            type="number"
            min={480}
            max={960}
            value={project.settings.editorWidth}
            onChange={e => onUpdate({ settings: { ...project.settings, editorWidth: Number(e.target.value) || 720 } })}
            className="field-input"
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
            className="field-input bg-white"
          >
            {AUTOSAVE_INTERVAL_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-[var(--muted)] leading-snug">
            Browser backup only. Use File → Save for a .dropline3 file.
          </p>
        </label>
      </section>

      <section className="inspector-section">
        <h4 className="inspector-section-title">Writing</h4>
        <label className="flex items-start gap-2.5 text-xs cursor-pointer">
          <input
            type="checkbox"
            className="mt-0.5 accent-[var(--accent)]"
            checked={project.settings.focusMode}
            onChange={e => onUpdate({ settings: { ...project.settings, focusMode: e.target.checked } })}
          />
          <span>
            <span className="font-medium text-[var(--ink)] block">Focus mode</span>
            <span className="text-[var(--muted)]">Hide sidebar and Inspector while you write.</span>
          </span>
        </label>
      </section>
    </aside>
  );
}
