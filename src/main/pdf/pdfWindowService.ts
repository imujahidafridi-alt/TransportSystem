import { BrowserWindow, Menu } from 'electron';

let pdfWindow: BrowserWindow | null = null;

export function openPdfPreviewWindow(title: string, htmlContent: string): void {
  // If preview window exists, close previous window safely
  if (pdfWindow && !pdfWindow.isDestroyed()) {
    pdfWindow.close();
  }

  pdfWindow = new BrowserWindow({
    width: 1020,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    title: title || 'PDF Print Preview',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Remove native top menu bar
  pdfWindow.setMenu(null);

  // Load generated HTML string as Data URL directly into window
  pdfWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);

  pdfWindow.once('ready-to-show', () => {
    pdfWindow?.show();
    pdfWindow?.focus();
  });

  pdfWindow.on('closed', () => {
    pdfWindow = null;
  });
}
