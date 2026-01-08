import { contextBridge, ipcRenderer } from 'electron';

// Exponer APIs seguras al renderer
contextBridge.exposeInMainWorld('electronAPI', {
    // Información de la plataforma
    platform: process.platform,

    // Versiones
    versions: {
        node: process.versions.node,
        chrome: process.versions.chrome,
        electron: process.versions.electron,
    },

    // Actualizaciones
    getAppVersion: () => ipcRenderer.invoke('get-app-version'),
    checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
    onUpdateAvailable: (callback: any) => ipcRenderer.on('update-available', callback),
    onUpdateDownloaded: (callback: any) => ipcRenderer.on('update-downloaded', callback),
    onDownloadProgress: (callback: any) => ipcRenderer.on('download-progress', callback),
    onUpdateError: (callback: any) => ipcRenderer.on('update-error', callback),
    onUpdateNotAvailable: (callback: any) => ipcRenderer.on('update-not-available', callback),
    removeListeners: () => {
        ipcRenderer.removeAllListeners('update-available');
        ipcRenderer.removeAllListeners('update-downloaded');
        ipcRenderer.removeAllListeners('download-progress');
        ipcRenderer.removeAllListeners('update-error');
        ipcRenderer.removeAllListeners('update-not-available');
    }
});

// Los tipos están definidos en src/types/electron.d.ts
