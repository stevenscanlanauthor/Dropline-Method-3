const { contextBridge, ipcRenderer } = require('electron');

function on(channel, callback) {
  ipcRenderer.on(channel, () => callback());
}

contextBridge.exposeInMainWorld('droplineBridge', {
  isDesktop: true,
  saveToDisk: data => ipcRenderer.invoke('project:save-to-disk', data),
  exportMarkdown: markdown => ipcRenderer.invoke('project:export-markdown', markdown),
  setDirty: dirty => ipcRenderer.send('project:set-dirty', dirty),
  onMenuNew: callback => on('menu:new', callback),
  onRequestSave: callback => on('menu:request-save', callback),
  onExportMarkdown: callback => on('menu:export-markdown', callback),
  onFileOpened: callback => ipcRenderer.on('file:opened', (_event, payload) => callback(payload)),
  onOpenSample: callback => on('menu:open-sample', callback),
  onDuplicateChapter: callback => on('menu:duplicate-chapter', callback),
  onViewEditor: callback => on('menu:view-editor', callback),
  onViewCorkboard: callback => on('menu:view-corkboard', callback),
  onViewPreview: callback => on('menu:view-preview', callback),
  onToggleInspector: callback => on('menu:toggle-inspector', callback),
  onCompile: callback => on('menu:compile', callback),
  onBold: callback => on('menu:bold', callback),
  onItalic: callback => on('menu:italic', callback),
  onUnderline: callback => on('menu:underline', callback),
  onIndent: callback => on('menu:indent', callback),
  onOutdent: callback => on('menu:outdent', callback),
});
