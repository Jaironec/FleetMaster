// Tipos globales para la API de Electron expuesta via contextBridge
export interface UpdateCheckResult {
    status: 'dev' | 'checking' | 'error';
    message?: string;
    result?: any;
    error?: any;
}

export interface DownloadProgress {
    percent: number;
    transferred: number;
    total: number;
    bytesPerSecond: number;
}

export interface UpdateInfo {
    version: string;
    releaseDate: string;
    releaseName?: string;
    releaseNotes?: string;
}

export interface UpdateError {
    message: string;
    stack?: string;
}

export interface ElectronAPI {
    // Información de la plataforma
    platform: string;
    versions: {
        node: string;
        chrome: string;
        electron: string;
    };

    // Actualizaciones
    getAppVersion: () => Promise<string>;
    checkForUpdates: () => Promise<UpdateCheckResult>;

    // Listeners de actualizaciones
    onUpdateAvailable: (callback: (event: any, info: UpdateInfo) => void) => void;
    onUpdateDownloaded: (callback: (event: any, info: UpdateInfo) => void) => void;
    onDownloadProgress: (callback: (event: any, progress: DownloadProgress) => void) => void;
    onUpdateError: (callback: (event: any, error: UpdateError) => void) => void;
    onUpdateNotAvailable: (callback: (event: any, info: UpdateInfo) => void) => void;

    // Limpieza de listeners
    removeListeners: () => void;
}

declare global {
    interface Window {
        electronAPI?: ElectronAPI;
    }
}

export { };
