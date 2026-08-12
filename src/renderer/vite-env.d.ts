/// <reference types="vite/client" />
/// <reference types="react" />
/// <reference types="react-dom" />

import { ElectronAPI } from '../preload';

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
