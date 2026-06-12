const { app, BrowserWindow, Menu, dialog, shell, ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');

let mainWindow = null;
let currentFilePath = null;
let isDirty = false;

const isDev = process.env.ELECTRON_DEV === '1';
const BACKUP_DIR = path.join(app.getPath('userData'), 'backups');

function webIndexPath() {
  if (isDev) return null;
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'web', 'index.html');
  }
  return path.join(__dirname, '..', 'web', 'dist', 'index.html');
}

function send(channel) {
  mainWindow?.webContents.send(channel);
}

function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

function writeBackup(data) {
  try {
    ensureBackupDir();
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    fs.writeFileSync(path.join(BACKUP_DIR, `autosave-${stamp}.dropline3`), data, 'utf8');
    const files = fs.readdirSync(BACKUP_DIR).filter(f => f.startsWith('autosave-')).sort().reverse();
    files.slice(12).forEach(f => fs.unlinkSync(path.join(BACKUP_DIR, f)));
  } catch {
    /* non-fatal */
  }
}

function createWindow() {
  const isMac = process.platform === 'darwin';

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 960,
    minHeight: 680,
    title: 'Dropline Method',
    ...(isMac ? { titleBarStyle: 'hiddenInset', trafficLightPosition: { x: 20, y: 22 } } : {}),
    backgroundColor: '#F6F9FB',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
    show: false,
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(webIndexPath());
  }

  mainWindow.once('ready-to-show', () => mainWindow.show());

  mainWindow.on('close', (e) => {
    if (!isDirty) return;
    const choice = dialog.showMessageBoxSync(mainWindow, {
      type: 'warning',
      buttons: ['Save', 'Discard', 'Cancel'],
      defaultId: 0,
      cancelId: 2,
      message: 'Save changes before closing?',
    });
    if (choice === 2) e.preventDefault();
    else if (choice === 0) {
      e.preventDefault();
      send('menu:request-save');
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  buildMenu();
}

function buildMenu() {
  const isMac = process.platform === 'darwin';
  const template = [
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    }] : []),
    {
      label: 'File',
      submenu: [
        { label: 'New Project', accelerator: 'CmdOrCtrl+N', click: () => send('menu:new') },
        { label: 'Open Project…', accelerator: 'CmdOrCtrl+O', click: openProject },
        { label: 'Open Sample Project', click: () => send('menu:open-sample') },
        { type: 'separator' },
        { label: 'Save', accelerator: 'CmdOrCtrl+S', click: () => send('menu:request-save') },
        { label: 'Save As…', accelerator: 'Shift+CmdOrCtrl+S', click: saveProjectAs },
        { type: 'separator' },
        { label: 'Export Markdown', click: () => send('menu:export-markdown') },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'delete' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'Format',
      submenu: [
        { label: 'Bold', accelerator: 'CmdOrCtrl+B', click: () => send('menu:bold') },
        { label: 'Italic', accelerator: 'CmdOrCtrl+I', click: () => send('menu:italic') },
        { label: 'Underline', accelerator: 'CmdOrCtrl+U', click: () => send('menu:underline') },
        { type: 'separator' },
        { label: 'Indent', accelerator: 'CmdOrCtrl+]', click: () => send('menu:indent') },
        { label: 'Outdent', accelerator: 'CmdOrCtrl+[', click: () => send('menu:outdent') },
      ],
    },
    {
      label: 'View',
      submenu: [
        { label: 'Editor', click: () => send('menu:view-editor') },
        { label: 'Corkboard', accelerator: 'Shift+CmdOrCtrl+K', click: () => send('menu:view-corkboard') },
        { label: 'Preview Manuscript', accelerator: 'Shift+CmdOrCtrl+P', click: () => send('menu:view-preview') },
        { type: 'separator' },
        { label: 'Show or Hide Inspector', accelerator: 'Shift+CmdOrCtrl+I', click: () => send('menu:toggle-inspector') },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Dropline',
      submenu: [
        { label: 'Duplicate Chapter', accelerator: 'Shift+CmdOrCtrl+D', click: () => send('menu:duplicate-chapter') },
        { type: 'separator' },
        { label: 'Preview Manuscript', accelerator: 'Shift+CmdOrCtrl+P', click: () => send('menu:view-preview') },
        { label: 'Corkboard', accelerator: 'Shift+CmdOrCtrl+K', click: () => send('menu:view-corkboard') },
        { type: 'separator' },
        { label: 'Compile Manuscript', accelerator: 'Shift+CmdOrCtrl+M', click: () => send('menu:compile') },
        { label: 'Export Markdown', click: () => send('menu:export-markdown') },
        { type: 'separator' },
        { label: 'Show or Hide Inspector', accelerator: 'Shift+CmdOrCtrl+I', click: () => send('menu:toggle-inspector') },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac ? [
          { type: 'separator' },
          { role: 'front' },
        ] : [{ role: 'close' }]),
      ],
    },
    {
      label: 'Help',
      submenu: [
        { label: 'Visit DroplineMethod.com', click: () => shell.openExternal('https://www.droplinemethod.com') },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

async function openProject() {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Open Dropline project',
    filters: [{ name: 'Dropline Project', extensions: ['dropline3', 'json'] }],
    properties: ['openFile'],
  });
  if (result.canceled || result.filePaths.length === 0) return;
  currentFilePath = result.filePaths[0];
  const data = fs.readFileSync(currentFilePath, 'utf8');
  isDirty = false;
  mainWindow.webContents.send('file:opened', { filePath: currentFilePath, data });
}

async function saveProjectAs() {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Save Dropline project',
    defaultPath: 'dropline-project.dropline3',
    filters: [{ name: 'Dropline Project', extensions: ['dropline3'] }],
  });
  if (result.canceled || !result.filePath) return;
  currentFilePath = result.filePath;
  send('menu:request-save');
}

ipcMain.handle('project:save-to-disk', async (_event, data) => {
  if (!currentFilePath) {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Save Dropline project',
      defaultPath: 'dropline-project.dropline3',
      filters: [{ name: 'Dropline Project', extensions: ['dropline3'] }],
    });
    if (result.canceled || !result.filePath) return { ok: false };
    currentFilePath = result.filePath;
  }
  fs.writeFileSync(currentFilePath, data, 'utf8');
  writeBackup(data);
  isDirty = false;
  return { ok: true, filePath: currentFilePath };
});

ipcMain.handle('project:export-markdown', async (_event, markdown) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Export Markdown',
    defaultPath: 'dropline-export.md',
    filters: [{ name: 'Markdown', extensions: ['md'] }],
  });
  if (result.canceled || !result.filePath) return { ok: false };
  fs.writeFileSync(result.filePath, markdown, 'utf8');
  return { ok: true, filePath: result.filePath };
});

ipcMain.on('project:set-dirty', (_event, dirty) => {
  isDirty = !!dirty;
});

app.whenReady().then(createWindow);
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
