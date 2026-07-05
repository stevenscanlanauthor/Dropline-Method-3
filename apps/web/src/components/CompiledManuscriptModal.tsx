import { downloadDocx, downloadScrivenerImport } from '@dropline/core';
import type { Project } from '../lib/types';

interface Props {
  project: Project;
  text: string;
  chapters: Project['chapters'];
  includeTitlePage: boolean;
  onClose: () => void;
}

export default function CompiledManuscriptModal({ project, text, chapters, includeTitlePage, onClose }: Props) {
  function copyText() {
    navigator.clipboard.writeText(text).catch(() => {});
  }

  function exportTxt() {
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.title || 'manuscript'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function compileOptions() {
    return {
      title: project.title,
      authorName: project.authorName,
      authorContact: project.authorContact,
      chapters: chapters.map(c => ({ id: c.id, title: c.title, drops: c.drops })),
      includeTitlePage,
    };
  }

  function exportDocx() {
    downloadDocx(compileOptions(), project.title || 'manuscript');
  }

  async function exportPdf() {
    const { downloadPdf } = await import('@dropline/core/pdf');
    downloadPdf(compileOptions(), project.title || 'manuscript');
  }

  function exportScrivener() {
    downloadScrivenerImport(compileOptions(), project.title || 'manuscript');
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-[var(--surface)] rounded-xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-[var(--shadow-md)] border border-[var(--border)]" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-[var(--border)] bg-[var(--highlight)] flex justify-between items-start gap-4">
          <div>
            <h2 className="font-semibold text-[var(--ink)]">Compiled manuscript</h2>
            <p className="text-xs text-[var(--muted)] mt-0.5">{project.title} · {project.authorName || 'Author'}</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button type="button" onClick={copyText} className="panel-header-action text-sm">
              Copy
            </button>
            <button type="button" onClick={onClose} className="text-sm px-3 py-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--surface-muted)]">
              Close
            </button>
          </div>
        </div>
        <pre className="flex-1 overflow-auto p-6 text-sm whitespace-pre-wrap serif-editor bg-[var(--mist)] m-0">{text}</pre>
        <div className="p-3 border-t border-[var(--border)] flex flex-wrap gap-2 justify-end">
          <button type="button" onClick={exportTxt} className="text-xs border border-[var(--border)] px-3 py-1.5 rounded-lg">
            Plain text
          </button>
          <button type="button" onClick={exportPdf} className="text-xs border border-[var(--border)] px-3 py-1.5 rounded-lg">
            PDF
          </button>
          <button type="button" onClick={exportDocx} className="text-xs border border-[var(--border)] px-3 py-1.5 rounded-lg">
            DOCX
          </button>
          <button type="button" onClick={exportScrivener} className="text-xs bg-[var(--accent)] text-white px-3 py-1.5 rounded-lg">
            Binder import
          </button>
        </div>
      </div>
    </div>
  );
}
