import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'

// Detectar si estamos en modo Electron
const isElectron = process.env.ELECTRON_DEV === 'true';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    isElectron && electron([
      {
        // Main process
        entry: 'electron/main.ts',
        vite: {
          build: {
            outDir: 'dist-electron',
            rollupOptions: {
              external: ['electron'],
            },
          },
        },
      },
      {
        // Preload script
        entry: 'electron/preload.ts',
        vite: {
          build: {
            outDir: 'dist-electron',
            rollupOptions: {
              external: ['electron'],
              output: {
                format: 'cjs',
              },
            },
          },
        },
        onstart(args) {
          // Notify the renderer process to reload when preload is rebuilt
          args.reload();
        },
      },
    ]),
    isElectron && renderer(),
  ].filter(Boolean),
  server: {
    host: '0.0.0.0',  // Escuchar en todas las interfaces de red
    port: 5173,
  },
  // Base path relativa para que funcione en Electron
  base: './',
  build: {
    // Asegurar que los assets usen rutas relativas
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        // Evitar nombres de chunk con hash muy largo
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },
})
