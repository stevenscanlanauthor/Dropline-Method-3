export const appTemplate = `
<div class="app-shell">
  <header class="app-header">
    <div class="brand-lockup">
      <img class="brand-logo" src="/logo-dropline-lockup.png" alt="Dropline" width="160" height="auto" />
      <p class="brand-tagline">One drop at a time. One draft completed.</p>
    </div>
    <div class="project-fields">
      <label class="field-compact">
        <span>Project title</span>
        <input id="projectTitle" type="text" value="Untitled Dropline Project" />
      </label>
      <label class="field-compact">
        <span>Working promise</span>
        <input id="projectPromise" type="text" placeholder="What experience should this book deliver?" />
      </label>
    </div>
    <div class="header-actions">
      <button id="newProject" type="button">New</button>
      <button id="openProject" type="button">Open</button>
      <button id="saveProject" type="button" class="primary">Save</button>
      <button id="exportMarkdown" type="button">Export</button>
      <input id="openProjectInput" type="file" accept=".dropline3,.json,application/json" hidden />
      <div id="status" class="status-pill" role="status">Ready</div>
    </div>
  </header>

  <div class="app-body">
    <nav class="drop-path" aria-label="Dropline method steps">
      <div class="drop-path-icon" aria-hidden="true">
        <img src="/logo-dropline-icon.png" alt="" width="48" height="48" />
      </div>
      <ol class="drop-steps" id="dropSteps">
        <li><button type="button" data-drop="1" class="drop-step active"><span class="step-num">1</span><span class="step-label">Headings</span></button></li>
        <li><button type="button" data-drop="2" class="drop-step"><span class="step-num">2</span><span class="step-label">Beat lines</span></button></li>
        <li><button type="button" data-drop="3" class="drop-step"><span class="step-num">3</span><span class="step-label">Paragraphs</span></button></li>
        <li><button type="button" data-drop="4" class="drop-step"><span class="step-num">4</span><span class="step-label">Tune</span></button></li>
        <li><button type="button" data-drop="5" class="drop-step"><span class="step-num">5</span><span class="step-label">First pages</span></button></li>
        <li><button type="button" data-drop="6" class="drop-step"><span class="step-num">6</span><span class="step-label">Full draft</span></button></li>
      </ol>
    </nav>

    <main class="workspace">
      <section class="drop-focus">
        <p class="drop-eyebrow">Method 3</p>
        <h2 id="dropTitle">Drop 1: Headings</h2>
        <p id="dropDescription" class="drop-lead">Create a heading spine. Each heading should imply change.</p>
      </section>

      <section class="workspace-grid">
        <div class="spine-panel">
          <div class="panel-head">
            <h3>Chapter spine</h3>
            <div class="toolbar">
              <button id="addCard" type="button">Add section</button>
              <button id="duplicateCard" type="button">Duplicate</button>
              <button id="removeCard" type="button" class="danger">Remove</button>
            </div>
          </div>
          <div id="cardList" class="card-list"></div>
        </div>

        <aside class="focus-panel" id="focusPanel">
          <h3 id="focusHeading">Selected section</h3>

          <label id="fieldHeading" class="focus-field" data-drop-field="1 2 3 4 5 6">
            <span>Heading</span>
            <input id="itemHeading" type="text" />
          </label>

          <label id="fieldBeat" class="focus-field" data-drop-field="2 3 4 5 6">
            <span>Beat line</span>
            <textarea id="itemBeat" rows="3" placeholder="One sentence of purpose and movement."></textarea>
          </label>

          <label id="fieldParagraph" class="focus-field" data-drop-field="3 6">
            <span>Paragraph plan</span>
            <textarea id="itemParagraph" rows="8" placeholder="Want, pressure, change, and consequence in one useful paragraph."></textarea>
          </label>

          <label id="fieldNotes" class="focus-field" data-drop-field="4">
            <span>Tune notes</span>
            <textarea id="itemNotes" rows="5" placeholder="Keep, fix, cut, merge, or move."></textarea>
          </label>

          <label id="fieldFirstPage" class="focus-field" data-drop-field="5 6">
            <span>First page start</span>
            <textarea id="itemFirstPage" rows="8" placeholder="Open near pressure with anchor, viewpoint, detail, and turn."></textarea>
          </label>

          <div id="qualityBox" class="quality-box" data-drop-field="3">
            <h4>Drop 3 checks</h4>
            <label><input id="checkWant" type="checkbox" /> Want is visible</label>
            <label><input id="checkPressure" type="checkbox" /> Pressure or obstacle appears</label>
            <label><input id="checkChange" type="checkbox" /> Situation changes</label>
            <label><input id="checkConsequence" type="checkbox" /> Consequence pulls forward</label>
          </div>
        </aside>
      </section>
    </main>
  </div>
</div>
`;
