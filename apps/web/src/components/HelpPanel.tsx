import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import {
  DEFAULT_HELP_TOPIC_ID,
  getHelpTopic,
  helpTopicsBySection,
  type HelpBlock,
  type HelpTopic,
} from '../lib/help-content';

interface Props {
  initialTopicId?: string;
  onClose: () => void;
}

function HelpBlockView({ block }: { block: HelpBlock }) {
  if (block.type === 'p') {
    return <p className="text-sm text-[var(--ink)] leading-relaxed">{block.text}</p>;
  }
  if (block.type === 'h3') {
    return <h3 className="text-sm font-semibold text-[var(--ink)] mt-4 first:mt-0">{block.text}</h3>;
  }
  if (block.type === 'ul') {
    return (
      <ul className="text-sm text-[var(--ink)] leading-relaxed list-disc pl-5 space-y-1.5">
        {block.items.map(item => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    );
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
      <table className="w-full text-sm">
        <tbody>
          {block.rows.map(row => (
            <tr key={`${row.keys}-${row.action}`} className="border-b border-[var(--border)] last:border-b-0">
              <td className="px-3 py-2 font-mono text-xs text-[var(--ink)] whitespace-nowrap bg-[var(--mist)] w-36">
                {row.keys}
              </td>
              <td className="px-3 py-2 text-[var(--ink)]">{row.action}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function HelpTopicContent({ topic }: { topic: HelpTopic }) {
  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">{topic.section}</p>
        <h2 className="text-xl font-semibold text-[var(--ink)] mt-1">{topic.title}</h2>
      </div>
      {topic.blocks.map((block, i) => (
        <HelpBlockView key={`${topic.id}-${i}`} block={block} />
      ))}
    </div>
  );
}

export default function HelpPanel({ initialTopicId, onClose }: Props) {
  const [activeId, setActiveId] = useState(initialTopicId ?? DEFAULT_HELP_TOPIC_ID);
  const activeTopic = getHelpTopic(activeId) ?? getHelpTopic(DEFAULT_HELP_TOPIC_ID)!;
  const sections = helpTopicsBySection();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60] p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="bg-white rounded-xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-xl overflow-hidden"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-panel-title"
      >
        <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between gap-4 shrink-0">
          <div>
            <h2 id="help-panel-title" className="font-semibold text-[var(--ink)]">
              Dropline Method 3 — Help
            </h2>
            <p className="text-xs text-[var(--muted)] mt-0.5">Guides for drops, workspace, and compile</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg border border-[var(--border)] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--mist)]"
            aria-label="Close help"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-1 min-h-0">
          <nav
            className="w-56 shrink-0 border-r border-[var(--border)] bg-[var(--mist)] overflow-y-auto p-3 space-y-4"
            aria-label="Help topics"
          >
            {sections.map(({ section, topics }) => (
              <div key={section}>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)] px-2 mb-1.5">
                  {section}
                </p>
                <ul className="space-y-0.5">
                  {topics.map(topic => (
                    <li key={topic.id}>
                      <button
                        type="button"
                        onClick={() => setActiveId(topic.id)}
                        className={`w-full text-left text-sm px-2 py-1.5 rounded-lg leading-snug ${
                          activeId === topic.id
                            ? 'bg-[var(--surface)] text-[var(--teal-dark)] font-semibold shadow-[var(--shadow-sm)]'
                            : 'text-[var(--ink)] hover:bg-[var(--surface)]/80'
                        }`}
                      >
                        {topic.title}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>

          <div className="flex-1 overflow-y-auto p-6 bg-white min-w-0">
            <HelpTopicContent topic={activeTopic} />
          </div>
        </div>
      </div>
    </div>
  );
}
