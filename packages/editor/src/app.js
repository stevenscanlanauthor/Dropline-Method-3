import { createDefaultProject, createItem } from './project.js';
import { dropData } from './drops.js';
import { buildMarkdown } from './markdown.js';
import { escapeHtml, downloadFile } from './util.js';
import { appTemplate } from './template.js';

const AUTOSAVE_KEY = 'dropline-method-3-autosave';

const DROP_FIELDS = {
  1: ['fieldHeading'],
  2: ['fieldHeading', 'fieldBeat'],
  3: ['fieldHeading', 'fieldBeat', 'fieldParagraph', 'qualityBox'],
  4: ['fieldHeading', 'fieldNotes'],
  5: ['fieldHeading', 'fieldFirstPage'],
  6: ['fieldHeading', 'fieldBeat', 'fieldParagraph', 'fieldFirstPage']
};

/**
 * @param {object} item
 * @param {number} drop
 */
function dropHasContent(item, drop) {
  if (drop === 1) return Boolean(item.heading?.trim());
  if (drop === 2) return Boolean(item.beat?.trim());
  if (drop === 3) return Boolean(item.paragraph?.trim()) || Object.values(item.checks).some(Boolean);
  if (drop === 4) return Boolean(item.notes?.trim());
  if (drop === 5) return Boolean(item.firstPage?.trim());
  if (drop === 6) return Boolean(item.firstPage?.trim() || item.paragraph?.trim());
  return false;
}

/**
 * @param {object} state
 * @param {number} drop
 */
function projectDropDone(state, drop) {
  return state.items.some(item => dropHasContent(item, drop));
}

export function mountApp(container, bridge) {
  container.innerHTML = appTemplate;

  let state = createDefaultProject();
  let selectedId = state.items[0].id;
  let activeDrop = 1;

  const elements = {
    projectTitle: container.querySelector('#projectTitle'),
    projectPromise: container.querySelector('#projectPromise'),
    status: container.querySelector('#status'),
    cardList: container.querySelector('#cardList'),
    dropTitle: container.querySelector('#dropTitle'),
    dropDescription: container.querySelector('#dropDescription'),
    itemHeading: container.querySelector('#itemHeading'),
    itemBeat: container.querySelector('#itemBeat'),
    itemParagraph: container.querySelector('#itemParagraph'),
    itemNotes: container.querySelector('#itemNotes'),
    itemFirstPage: container.querySelector('#itemFirstPage'),
    checkWant: container.querySelector('#checkWant'),
    checkPressure: container.querySelector('#checkPressure'),
    checkChange: container.querySelector('#checkChange'),
    checkConsequence: container.querySelector('#checkConsequence'),
    openProjectInput: container.querySelector('#openProjectInput'),
    focusHeading: container.querySelector('#focusHeading'),
    fieldHeading: container.querySelector('#fieldHeading'),
    fieldBeat: container.querySelector('#fieldBeat'),
    fieldParagraph: container.querySelector('#fieldParagraph'),
    fieldNotes: container.querySelector('#fieldNotes'),
    fieldFirstPage: container.querySelector('#fieldFirstPage'),
    qualityBox: container.querySelector('#qualityBox')
  };

  function selectedItem() {
    return state.items.find(item => item.id === selectedId) || state.items[0];
  }

  function setStatus(message) {
    elements.status.textContent = message;
  }

  function cardSummary(item) {
    if (activeDrop === 1) return item.heading || 'Add a heading with a clear change.';
    if (activeDrop === 2) return item.beat || 'Add one sentence of chapter purpose.';
    if (activeDrop === 3) return item.paragraph || 'Add one paragraph plan for this heading.';
    if (activeDrop === 4) return item.notes || 'Add tune notes: keep, fix, cut or merge, move.';
    if (activeDrop === 5) return item.firstPage || 'Draft a first page opening near pressure.';
    return item.firstPage || item.paragraph || 'Continue into full draft from the first page.';
  }

  function qualityPills(item) {
    if (activeDrop !== 3) return '';
    const checks = [
      ['Want', item.checks.want],
      ['Pressure', item.checks.pressure],
      ['Change', item.checks.change],
      ['Consequence', item.checks.consequence]
    ];
    return checks
      .map(([label, ok]) => `<span class="pill${ok ? ' done' : ''}">${ok ? '✓' : '·'} ${label}</span>`)
      .join('');
  }

  function updateDropFieldVisibility() {
    const visible = new Set(DROP_FIELDS[activeDrop] || []);
    const fields = {
      fieldHeading: elements.fieldHeading,
      fieldBeat: elements.fieldBeat,
      fieldParagraph: elements.fieldParagraph,
      fieldNotes: elements.fieldNotes,
      fieldFirstPage: elements.fieldFirstPage,
      qualityBox: elements.qualityBox
    };
    Object.entries(fields).forEach(([id, el]) => {
      if (!el) return;
      el.classList.toggle('hidden', !visible.has(id));
    });

    const focusTitles = {
      1: 'Heading for this section',
      2: 'Beat line',
      3: 'Paragraph plan',
      4: 'Tune notes',
      5: 'First page opening',
      6: 'Draft handoff'
    };
    elements.focusHeading.textContent = focusTitles[activeDrop] || 'Selected section';
  }

  function updateDropPath() {
    container.querySelectorAll('.drop-step').forEach(button => {
      const drop = Number(button.dataset.drop);
      const isActive = drop === activeDrop;
      const isDone = projectDropDone(state, drop) && !isActive;
      button.classList.toggle('active', isActive);
      button.classList.toggle('done', isDone);
      if (isDone) {
        button.querySelector('.step-num').textContent = '✓';
      } else {
        button.querySelector('.step-num').textContent = String(drop);
      }
    });
  }

  function loadInspector() {
    const item = selectedItem();
    if (!item) return;
    elements.itemHeading.value = item.heading;
    elements.itemBeat.value = item.beat;
    elements.itemParagraph.value = item.paragraph;
    elements.itemNotes.value = item.notes;
    elements.itemFirstPage.value = item.firstPage;
    elements.checkWant.checked = item.checks.want;
    elements.checkPressure.checked = item.checks.pressure;
    elements.checkChange.checked = item.checks.change;
    elements.checkConsequence.checked = item.checks.consequence;
  }

  function persistLocal() {
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(state));
  }

  function render() {
    elements.projectTitle.value = state.title;
    elements.projectPromise.value = state.promise;
    const [title, description] = dropData[activeDrop];
    elements.dropTitle.textContent = title;
    elements.dropDescription.textContent = description;

    updateDropPath();
    updateDropFieldVisibility();

    elements.cardList.innerHTML = '';
    state.items.forEach((item, index) => {
      const card = document.createElement('article');
      card.className = 'card' + (item.id === selectedId ? ' active' : '');
      card.tabIndex = 0;
      const pills = qualityPills(item);
      card.innerHTML = `
        <h4>${index + 1}. ${escapeHtml(item.heading || 'Untitled section')}</h4>
        <p>${escapeHtml(cardSummary(item))}</p>
        ${pills ? `<div class="card-meta">${pills}</div>` : ''}
      `;
      card.addEventListener('click', () => {
        selectedId = item.id;
        render();
      });
      card.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          selectedId = item.id;
          render();
        }
      });
      elements.cardList.appendChild(card);
    });

    loadInspector();
    persistLocal();
  }

  function updateSelected(patch) {
    const item = selectedItem();
    if (!item) return;
    Object.assign(item, patch);
    state.updatedAt = new Date().toISOString();
    render();
  }

  function updateCheck(name, value) {
    const item = selectedItem();
    if (!item) return;
    item.checks[name] = value;
    state.updatedAt = new Date().toISOString();
    render();
  }

  function newProject() {
    state = createDefaultProject();
    selectedId = state.items[0].id;
    activeDrop = 1;
    setStatus('New project');
    render();
  }

  function loadProjectData(data, label = 'Opened project') {
    try {
      state = JSON.parse(data);
      selectedId = state.items[0]?.id;
      activeDrop = 1;
      setStatus(label);
      render();
    } catch {
      setStatus('Could not read that file — invalid project format.');
    }
  }

  async function saveProject() {
    const payload = JSON.stringify(state, null, 2);
    if (bridge?.saveToDisk) {
      const result = await bridge.saveToDisk(payload);
      if (result.ok) {
        const name = result.filePath ? result.filePath.split(/[\\/]/).pop() : 'project';
        setStatus(`Saved · ${name}`);
      }
      return;
    }
    downloadFile('dropline-project.dropline3', payload, 'application/json');
    setStatus('Saved to download');
  }

  async function exportMarkdown() {
    const markdown = buildMarkdown(state);
    if (bridge?.exportMarkdown) {
      const result = await bridge.exportMarkdown(markdown);
      if (result.ok) setStatus('Markdown exported');
      return;
    }
    downloadFile('dropline-method-3-export.md', markdown, 'text/markdown');
    setStatus('Markdown downloaded');
  }

  function restoreLocal() {
    const saved = localStorage.getItem(AUTOSAVE_KEY);
    if (!saved) return;
    try {
      state = JSON.parse(saved);
      selectedId = state.items[0]?.id;
      setStatus('Restored from autosave');
    } catch {
      setStatus('Fresh project — autosave unavailable');
    }
  }

  container.querySelectorAll('[data-drop]').forEach(button => {
    button.addEventListener('click', () => {
      activeDrop = Number(button.dataset.drop);
      render();
    });
  });

  container.querySelector('#newProject').addEventListener('click', newProject);
  container.querySelector('#saveProject').addEventListener('click', saveProject);
  container.querySelector('#exportMarkdown').addEventListener('click', exportMarkdown);
  container.querySelector('#openProject').addEventListener('click', () => {
    if (bridge?.openProject) {
      bridge.openProject();
      return;
    }
    elements.openProjectInput.click();
  });

  elements.openProjectInput.addEventListener('change', event => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      loadProjectData(reader.result, `Opened · ${file.name}`);
      event.target.value = '';
    };
    reader.readAsText(file);
  });

  container.querySelector('#addCard').addEventListener('click', () => {
    const item = createItem();
    state.items.push(item);
    selectedId = item.id;
    render();
  });

  container.querySelector('#duplicateCard').addEventListener('click', () => {
    const item = selectedItem();
    if (!item) return;
    const clone = { ...structuredClone(item), id: crypto.randomUUID(), heading: `${item.heading} copy` };
    state.items.push(clone);
    selectedId = clone.id;
    render();
  });

  container.querySelector('#removeCard').addEventListener('click', () => {
    if (state.items.length === 1) {
      setStatus('Keep at least one section.');
      return;
    }
    state.items = state.items.filter(item => item.id !== selectedId);
    selectedId = state.items[0].id;
    render();
  });

  elements.projectTitle.addEventListener('input', event => {
    state.title = event.target.value;
    state.updatedAt = new Date().toISOString();
    persistLocal();
  });
  elements.projectPromise.addEventListener('input', event => {
    state.promise = event.target.value;
    state.updatedAt = new Date().toISOString();
    persistLocal();
  });
  elements.itemHeading.addEventListener('input', event => updateSelected({ heading: event.target.value }));
  elements.itemBeat.addEventListener('input', event => updateSelected({ beat: event.target.value }));
  elements.itemParagraph.addEventListener('input', event => updateSelected({ paragraph: event.target.value }));
  elements.itemNotes.addEventListener('input', event => updateSelected({ notes: event.target.value }));
  elements.itemFirstPage.addEventListener('input', event => updateSelected({ firstPage: event.target.value }));
  elements.checkWant.addEventListener('change', event => updateCheck('want', event.target.checked));
  elements.checkPressure.addEventListener('change', event => updateCheck('pressure', event.target.checked));
  elements.checkChange.addEventListener('change', event => updateCheck('change', event.target.checked));
  elements.checkConsequence.addEventListener('change', event => updateCheck('consequence', event.target.checked));

  if (bridge?.onMenuNew) bridge.onMenuNew(newProject);
  if (bridge?.onRequestSave) bridge.onRequestSave(saveProject);
  if (bridge?.onExportMarkdown) bridge.onExportMarkdown(exportMarkdown);
  if (bridge?.onFileOpened) {
    bridge.onFileOpened(payload => {
      loadProjectData(payload.data, `Opened · ${payload.filePath.split(/[\\/]/).pop()}`);
    });
  }

  restoreLocal();
  render();
}
