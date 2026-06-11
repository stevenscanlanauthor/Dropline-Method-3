import { ExternalLink } from 'lucide-react';
import { tryOpenInDesktopApp } from '../lib/open-in-app';

export default function OpenInAppButton() {
  return (
    <button
      type="button"
      onClick={tryOpenInDesktopApp}
      className="inline-flex items-center gap-1.5 shrink-0 px-3 py-1.5 rounded-lg border border-[var(--border)] bg-white text-xs font-medium text-[var(--ink)] hover:bg-[var(--mist)]"
      title="Open this site in the Dropline Mac app (requires the app from the Mac App Store)"
    >
      <ExternalLink size={14} aria-hidden />
      Open in App
    </button>
  );
}
