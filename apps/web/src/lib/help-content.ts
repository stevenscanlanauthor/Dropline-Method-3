export type HelpBlock =
  | { type: 'p'; text: string }
  | { type: 'h3'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'shortcuts'; rows: { keys: string; action: string }[] };

export interface HelpTopic {
  id: string;
  section: string;
  title: string;
  blocks: HelpBlock[];
}

export const HELP_SECTION_ORDER = [
  'Getting started',
  'The six drops',
  'Workspace',
  'Formatting',
  'Projects & files',
  'Compile & export',
  'Keyboard shortcuts',
] as const;

export const HELP_TOPICS: HelpTopic[] = [
  {
    id: 'welcome',
    section: 'Getting started',
    title: 'Welcome to Dropline Method 3',
    blocks: [
      {
        type: 'p',
        text: 'Dropline Method 3 guides you through writing one chapter at a time using six structured “drops.” Each drop builds on the last so you move from a clear chapter heading to a finished draft without skipping steps.',
      },
      {
        type: 'h3',
        text: 'How a session works',
      },
      {
        type: 'ul',
        items: [
          'Select a chapter in the left sidebar.',
          'Work through Drop 1 (heading) then Drops 2–6 in order.',
          'Use the corkboard to see progress across chapters.',
          'Compile when Drop 6 drafts are ready — only Drop 6 appears in the manuscript.',
        ],
      },
      {
        type: 'p',
        text: 'Open the sample project from File → Open Sample Project to explore a filled-in example.',
      },
    ],
  },
  {
    id: 'method-overview',
    section: 'Getting started',
    title: 'The Dropline Method',
    blocks: [
      {
        type: 'p',
        text: 'The method separates planning, rest, drafting, and polishing into distinct drops. You cannot skip ahead: each drop unlocks when the previous one has content.',
      },
      {
        type: 'h3',
        text: 'Why six drops?',
      },
      {
        type: 'ul',
        items: [
          'Drop 1 — Name the chapter so every scene has a anchor.',
          'Drop 2 — One sentence states purpose and movement.',
          'Drop 3 — One paragraph plans want, pressure, change, and consequence.',
          'Drop 4 — Rest-period notes (bullets only) capture ideas without drafting.',
          'Drop 5 — First draft up to ~500 words (word count is a soft warning).',
          'Drop 6 — Final chapter text used when you compile.',
        ],
      },
      {
        type: 'p',
        text: 'Progress dots under the drop tabs show which drops are complete (✓) or still open (○).',
      },
    ],
  },
  {
    id: 'drop1',
    section: 'The six drops',
    title: 'Drop 1 — Chapter heading',
    blocks: [
      {
        type: 'p',
        text: 'Drop 1 is the chapter or scene title at the top of the editor. It becomes the chapter name in the sidebar and in compiled output.',
      },
      {
        type: 'p',
        text: 'Drop 2 stays locked until the heading has text. Name the chapter before you plan the sentence or paragraph.',
      },
    ],
  },
  {
    id: 'drop2',
    section: 'The six drops',
    title: 'Drop 2 — One sentence',
    blocks: [
      {
        type: 'p',
        text: 'Write one sentence that states the purpose and movement of this chapter. What should the reader feel or understand by the end?',
      },
      {
        type: 'p',
        text: 'Keep it tight — a single line that orients you when you return to draft in Drops 5 and 6.',
      },
    ],
  },
  {
    id: 'drop3',
    section: 'The six drops',
    title: 'Drop 3 — One paragraph',
    blocks: [
      {
        type: 'p',
        text: 'Expand Drop 2 into one paragraph: want, pressure, change, and consequence. This is your scene plan, not prose.',
      },
      {
        type: 'p',
        text: 'Use formatting (bold, lists) if it helps you scan the plan. Drop 4 unlocks when this paragraph has content.',
      },
    ],
  },
  {
    id: 'drop4',
    section: 'The six drops',
    title: 'Drop 4 — Rest period notes',
    blocks: [
      {
        type: 'p',
        text: 'Drop 4 is a rest period: capture bullets and fragments without drafting the chapter. Each new line starts a new note.',
      },
      {
        type: 'h3',
        text: 'Bullet styles',
      },
      {
        type: 'p',
        text: 'Use the list menu on the format toolbar (or Format → list styles) to choose bullets, dashes, circles, or numbers. Drop 4 uses a plain textarea — font and size from the toolbar still apply.',
      },
      {
        type: 'p',
        text: 'Do not write full paragraphs here; save that for Drop 5.',
      },
    ],
  },
  {
    id: 'drop5',
    section: 'The six drops',
    title: 'Drop 5 — First draft',
    blocks: [
      {
        type: 'p',
        text: 'Write the chapter draft — aim for up to 500 words. The status bar shows a soft warning if you go over; it does not block you.',
      },
      {
        type: 'p',
        text: 'When Drop 5 has text, Drop 6 opens with your Drop 5 draft copied in as a starting point.',
      },
    ],
  },
  {
    id: 'drop6',
    section: 'The six drops',
    title: 'Drop 6 — Final draft',
    blocks: [
      {
        type: 'p',
        text: 'Edit and expand your draft into the final chapter text. Only Drop 6 content is included when you compile or preview the manuscript.',
      },
      {
        type: 'p',
        text: 'Drops 1–5 remain in the project for your process but are not exported in the compiled book.',
      },
    ],
  },
  {
    id: 'sidebar',
    section: 'Workspace',
    title: 'Chapters sidebar',
    blocks: [
      {
        type: 'p',
        text: 'The left sidebar lists every chapter or scene in your project. Click a row to open it in the editor.',
      },
      {
        type: 'ul',
        items: [
          'Add chapter — + button at the top or bottom of the sidebar.',
          'Delete chapter — trash icon on hover (at least one chapter must remain).',
          'Resize — drag the vertical handle between sidebar and editor.',
        ],
      },
      {
        type: 'p',
        text: 'Chapter titles come from Drop 1. Empty headings show as “Chapter N” until you name them.',
      },
    ],
  },
  {
    id: 'inspector',
    section: 'Workspace',
    title: 'Inspector',
    blocks: [
      {
        type: 'p',
        text: 'The Inspector on the right holds book-level metadata and editor preferences. Toggle it with View → Show Inspector or ⇧⌘I.',
      },
      {
        type: 'ul',
        items: [
          'Book title, author name, and contact — used on compile title pages and exports.',
          'Working promise — your note on what experience the book should deliver.',
          'Editor width — column width in pixels (480–960).',
          'Autosave frequency — how often backups are written to browser storage.',
          'Focus mode — hides sidebar and Inspector for distraction-free writing.',
        ],
      },
      {
        type: 'p',
        text: 'Drag the handle between editor and Inspector to resize the panel.',
      },
    ],
  },
  {
    id: 'views',
    section: 'Workspace',
    title: 'Editor, corkboard & preview',
    blocks: [
      {
        type: 'h3',
        text: 'Editor',
      },
      {
        type: 'p',
        text: 'Default view: drop tabs, format toolbar, and the active drop editor. Use this for day-to-day writing.',
      },
      {
        type: 'h3',
        text: 'Corkboard',
      },
      {
        type: 'p',
        text: 'A grid of chapter cards showing drop completion at a glance. Open via View → Corkboard or ⇧⌘K. Drag cards to reorder chapters; double-click a card to open it in the editor.',
      },
      {
        type: 'h3',
        text: 'Preview manuscript',
      },
      {
        type: 'p',
        text: 'Read-only view of compiled Drop 6 text for the whole book. Open via View → Preview Manuscript or ⇧⌘P.',
      },
    ],
  },
  {
    id: 'focus-mode',
    section: 'Workspace',
    title: 'Focus mode',
    blocks: [
      {
        type: 'p',
        text: 'Enable Focus mode in the Inspector to hide the sidebar and Inspector, leaving only the menubar, editor, and status bar.',
      },
      {
        type: 'ul',
        items: [
          'Exit via the banner button, View → Exit Focus Mode, or Dropline → Exit Focus Mode.',
          'Press Escape to leave focus mode quickly.',
          'Showing the Inspector while in focus mode turns focus mode off.',
        ],
      },
    ],
  },
  {
    id: 'status-bar',
    section: 'Workspace',
    title: 'Status bar',
    blocks: [
      {
        type: 'p',
        text: 'The bar along the bottom shows the selected chapter, word counts where relevant, drop progress, and autosave status.',
      },
      {
        type: 'p',
        text: 'Autosave messages reflect browser backup timing. Use File → Save for a downloadable .dropline3 project file.',
      },
    ],
  },
  {
    id: 'format-toolbar',
    section: 'Formatting',
    title: 'Format toolbar',
    blocks: [
      {
        type: 'p',
        text: 'Below the drop tabs when editing Drops 2, 3, 5, and 6. Drop 4 uses the toolbar for font, size, and list styles only.',
      },
      {
        type: 'ul',
        items: [
          'Bold, italic, underline — buttons highlight when the style is active at the cursor.',
          'Font and size dropdowns — beside B/I/U; choices apply to the current editor.',
          'Indent and outdent — adjust list or paragraph indentation.',
          'List menu — bullet, dash, circle, and numbered lists.',
        ],
      },
      {
        type: 'p',
        text: 'The same commands live under the Format menu when the editor view is active.',
      },
    ],
  },
  {
    id: 'projects',
    section: 'Projects & files',
    title: 'Projects & saving',
    blocks: [
      {
        type: 'h3',
        text: 'New & open',
      },
      {
        type: 'ul',
        items: [
          'File → New Project (⌘N) — starts a blank project; confirms if you have unsaved changes.',
          'File → Open Project… (⌘O) — loads a .dropline3 JSON file.',
          'File → Open Sample Project — loads a demo manuscript.',
        ],
      },
      {
        type: 'h3',
        text: 'Save & autosave',
      },
      {
        type: 'p',
        text: 'Autosave stores a backup in your browser (per device). Set frequency in the Inspector — from every change to manual only.',
      },
      {
        type: 'p',
        text: 'File → Save (⌘S) downloads or saves a .dropline3 file you can reopen later. On the Mac app, Save writes to disk directly.',
      },
      {
        type: 'h3',
        text: 'Duplicate chapter',
      },
      {
        type: 'p',
        text: 'Dropline → Duplicate Chapter (⇧⌘D) copies the selected chapter including all drop content.',
      },
    ],
  },
  {
    id: 'compile',
    section: 'Compile & export',
    title: 'Compile manuscript',
    blocks: [
      {
        type: 'p',
        text: 'Dropline → Compile Manuscript or View → Compile Manuscript (⇧⌘M) opens the compile dialog.',
      },
      {
        type: 'ul',
        items: [
          'Full manuscript — all chapters, Drop 6 only.',
          'Selected chapter — one chapter’s Drop 6.',
          'Title page — optional sheet with book title and author from the Inspector.',
        ],
      },
      {
        type: 'h3',
        text: 'After compile',
      },
      {
        type: 'p',
        text: 'Review the compiled text, copy to clipboard, or export Plain text (.txt) or DOCX. PDF and Scrivener import formats are planned for a future update.',
      },
      {
        type: 'h3',
        text: 'Export Markdown',
      },
      {
        type: 'p',
        text: 'File → Export Markdown saves the full project structure (all drops) as a .md file for backup or external tools.',
      },
    ],
  },
  {
    id: 'shortcuts',
    section: 'Keyboard shortcuts',
    title: 'Keyboard shortcuts',
    blocks: [
      {
        type: 'p',
        text: 'On Windows/Linux, use Ctrl instead of ⌘ (Command).',
      },
      {
        type: 'shortcuts',
        rows: [
          { keys: '⌘N', action: 'New project' },
          { keys: '⌘O', action: 'Open project' },
          { keys: '⌘S', action: 'Save project' },
          { keys: '⌘Z / ⇧⌘Z', action: 'Undo / Redo' },
          { keys: '⌘B / ⌘I / ⌘U', action: 'Bold / Italic / Underline' },
          { keys: '⌘] / ⌘[', action: 'Indent / Outdent' },
          { keys: '⇧⌘D', action: 'Duplicate chapter' },
          { keys: '⇧⌘K', action: 'Corkboard' },
          { keys: '⇧⌘P', action: 'Preview manuscript' },
          { keys: '⇧⌘M', action: 'Compile manuscript' },
          { keys: '⇧⌘I', action: 'Show or hide Inspector' },
          { keys: 'Escape', action: 'Exit focus mode' },
          { keys: '?', action: 'Open this help panel' },
        ],
      },
    ],
  },
];

export const DEFAULT_HELP_TOPIC_ID = HELP_TOPICS[0]?.id ?? 'welcome';

export function getHelpTopic(id: string): HelpTopic | undefined {
  return HELP_TOPICS.find(t => t.id === id);
}

export function helpTopicsBySection(): { section: string; topics: HelpTopic[] }[] {
  return HELP_SECTION_ORDER.map(section => ({
    section,
    topics: HELP_TOPICS.filter(t => t.section === section),
  })).filter(group => group.topics.length > 0);
}
