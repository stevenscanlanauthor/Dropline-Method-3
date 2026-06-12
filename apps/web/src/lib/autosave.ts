/** Seconds between autosaves; 0 = every change; -1 = manual only (File → Save). */
export type AutosaveIntervalSec = -1 | 0 | 30 | 60 | 120 | 300;

export const AUTOSAVE_INTERVAL_OPTIONS: { value: AutosaveIntervalSec; label: string }[] = [
  { value: 0, label: 'Immediately (on every change)' },
  { value: 30, label: 'Every 30 seconds' },
  { value: 60, label: 'Every 1 minute' },
  { value: 120, label: 'Every 2 minutes' },
  { value: 300, label: 'Every 5 minutes' },
  { value: -1, label: 'Manual only (File → Save)' },
];

export const DEFAULT_AUTOSAVE_INTERVAL: AutosaveIntervalSec = 30;

export function normaliseAutosaveInterval(value: unknown): AutosaveIntervalSec {
  const allowed = new Set(AUTOSAVE_INTERVAL_OPTIONS.map(o => o.value));
  return typeof value === 'number' && allowed.has(value as AutosaveIntervalSec)
    ? (value as AutosaveIntervalSec)
    : DEFAULT_AUTOSAVE_INTERVAL;
}

export function autosaveIntervalLabel(sec: AutosaveIntervalSec): string {
  return AUTOSAVE_INTERVAL_OPTIONS.find(o => o.value === sec)?.label ?? 'Every 30 seconds';
}

export function isManualAutosave(sec: AutosaveIntervalSec): boolean {
  return sec < 0;
}

export function isImmediateAutosave(sec: AutosaveIntervalSec): boolean {
  return sec === 0;
}
