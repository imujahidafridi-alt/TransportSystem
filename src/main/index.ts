import { app, BrowserWindow } from 'electron';
import path from 'path';
import { initDatabase, closeDatabase } from './database/db';
import { seedInitialDataIfNeeded } from './database/seed';
import { registerIpcHandlers } from './ipc/registerHandlers';

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 868,
    minWidth: 1024,
    minHeight: 700,
    title: 'Transport Management & Fleet Operations',
    icon: path.join(__dirname, '../renderer/assets/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    show: false,
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  const devUrl = 'http://localhost:5173';
  if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
    const loadDevServer = () => {
      mainWindow?.loadURL(devUrl).catch(() => {
        setTimeout(loadDevServer, 500);
      });
    };
    loadDevServer();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  console.log('[Main] Application starting...');
  // Initialize Database and Seed initial master records if empty
  initDatabase();
  seedInitialDataIfNeeded();

  // Register secure IPC Handlers
  registerIpcHandlers();

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  closeDatabase();
  if (process.platform !== 'darwin') app.quit();
});
