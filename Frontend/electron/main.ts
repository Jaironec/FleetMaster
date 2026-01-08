import { app, BrowserWindow, shell, dialog } from 'electron';
import path from 'node:path';

// Detectar si está empaquetado o en desarrollo
const isDev = !app.isPackaged;

// Rutas base
const appPath = app.getAppPath();

// En desarrollo: dist-electron está en la raíz del proyecto
// En producción: todo está en app.asar
const RENDERER_DIST = isDev
    ? path.join(appPath, 'dist')
    : path.join(appPath, 'dist');

const PRELOAD_PATH = isDev
    ? path.join(appPath, 'dist-electron', 'preload.js')
    : path.join(appPath, 'dist-electron', 'preload.js');

// Icono de la ventana
const ICON_PATH = isDev
    ? path.join(appPath, 'public', 'icon.png')
    : path.join(RENDERER_DIST, 'icon.png');

let mainWindow: BrowserWindow | null = null;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1024,
        minHeight: 700,
        title: 'FleetMaster',
        icon: ICON_PATH, // Icono explícito para la ventana/barra de tareas
        autoHideMenuBar: true, // Ocultar menú por defecto (F10 para mostrarlo)
        backgroundColor: '#f8fafc', // Evitar flash blanco durante carga
        webPreferences: {
            preload: PRELOAD_PATH,
            nodeIntegration: false,
            contextIsolation: true,
        },
        show: false, // No mostrar hasta que esté listo
    });

    // Mostrar cuando esté listo para evitar flash blanco
    mainWindow.once('ready-to-show', () => {
        mainWindow?.maximize(); // Abrir maximizado
        mainWindow?.show();
    });

    // Abrir enlaces externos en el navegador por defecto
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith('https:') || url.startsWith('http:')) {
            shell.openExternal(url);
        }
        return { action: 'deny' };
    });

    // Cargar la app
    if (isDev && process.env['VITE_DEV_SERVER_URL']) {
        // En desarrollo: cargar desde Vite dev server
        mainWindow.loadURL(process.env['VITE_DEV_SERVER_URL']);
        // Abrir DevTools en desarrollo
        mainWindow.webContents.openDevTools();
    } else {
        const indexPath = path.join(RENDERER_DIST, 'index.html');
        console.log('Loading from:', indexPath);
        mainWindow.loadFile(indexPath);
    }

    // Manejar intento de cierre
    mainWindow.on('close', (e) => {
        // e.preventDefault() cancela el cierre, pero debemos asegurarnos de no bloquear si
        // la app se está cerrando por otro motivo (ej. actualización o apagado del sistema)
        // pero para este caso simple, interceptaremos todo cierre manual.

        const choice = dialog.showMessageBoxSync(mainWindow!, {
            type: 'question',
            buttons: ['Salir', 'Cancelar'],
            defaultId: 0,
            cancelId: 1,
            title: 'Confirmar Salida',
            message: '¿Está seguro que desea salir?',
            detail: 'Su sesión actual se cerrará automáticamente.',
            icon: ICON_PATH
        });

        if (choice === 0) {
            // Usuario eligió Salir
            // Limpiar datos de sesión (cookies, storage, cache) para "cerrar sesión"
            // Nota: Esto limpia TODO el storage de la partición por defecto.
            // Si quieres algo menos agresivo, solo borra cookies específicas.
            if (mainWindow && mainWindow.webContents) {
                mainWindow.webContents.session.clearStorageData();
            }
            // Permitir cierre (no llamamos preventDefault)
        } else {
            // Usuario eligió Cancelar
            e.preventDefault();
        }
    });

    // Debug: mostrar errores de carga
    mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
        console.error('Failed to load:', errorCode, errorDescription);
    });
}

// --- Lógica de Mejorada de Actualizaciones ---
import { autoUpdater } from 'electron-updater';
import { ipcMain } from 'electron'; // Asegurarse de importar ipcMain

// Configurar autoUpdater para máxima disponibilidad
autoUpdater.autoDownload = true; // Descargar automáticamente para que el usuario siempre tenga la última versión
autoUpdater.autoInstallOnAppQuit = true; // Instalar al cerrar la app

function setupAutoUpdater() {
    // Verificar actualizaciones al iniciar (solo en producción)
    if (app.isPackaged) {
        autoUpdater.checkForUpdates();

        // Verificar periódicamente cada 60 minutos
        setInterval(() => {
            autoUpdater.checkForUpdates();
        }, 60 * 60 * 1000);
    }

    // IPC: Permitir chequeo manual desde el frontend
    ipcMain.handle('check-for-updates', async () => {
        if (!app.isPackaged) return { status: 'dev', message: 'Modo Desarrollo' };
        try {
            const result = await autoUpdater.checkForUpdates();
            return { status: 'checking', result };
        } catch (error) {
            return { status: 'error', error };
        }
    });

    // IPC: Obtener versión de la app
    ipcMain.handle('get-app-version', () => {
        return app.getVersion();
    });

    // 1. Actualización disponible
    autoUpdater.on('update-available', (info) => {
        // Notificar al renderer (si existe ventana)
        mainWindow?.webContents.send('update-available', info);

        // Ya no bloqueamos con dialog modal aquí, dejamos que descargue en background
    });

    // 2. Progreso de descarga
    autoUpdater.on('download-progress', (progressObj) => {
        mainWindow?.webContents.send('download-progress', progressObj);
        // console.log(`Download progress: ${progressObj.percent}%`);
    });

    // 3. Actualización descargada
    autoUpdater.on('update-downloaded', (info) => {
        mainWindow?.webContents.send('update-downloaded', info);

        const choice = dialog.showMessageBoxSync(mainWindow!, {
            type: 'info',
            buttons: ['Reiniciar Ahora', 'Al cerrar la app'],
            defaultId: 0,
            cancelId: 1,
            title: 'Actualización Lista',
            message: 'Se ha descargado una nueva versión de FleetMaster.',
            detail: '¿Desea reiniciar ahora para aplicar los cambios?',
            icon: ICON_PATH
        });

        if (choice === 0) {
            autoUpdater.quitAndInstall();
        }
    });

    // 4. Errores
    autoUpdater.on('error', (err) => {
        console.error('Error en auto-updater:', err);
        mainWindow?.webContents.send('update-error', {
            message: err.message,
            stack: err.stack
        });
    });

    // 5. No hay actualizaciones disponibles
    autoUpdater.on('update-not-available', (info) => {
        mainWindow?.webContents.send('update-not-available', info);
    });
}

// Cuando Electron esté listo
app.whenReady().then(() => {
    createWindow();
    setupAutoUpdater(); // Iniciar sistema de actualizaciones

    // En macOS, recrear ventana si se hace clic en el dock
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

// Cerrar la app cuando todas las ventanas se cierren (excepto en macOS)
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
        mainWindow = null;
    }
});
