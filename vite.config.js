import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';

// La versión visible sale de la misma fuente que usa publish-update.
const { version } = JSON.parse(readFileSync(new URL('./src-tauri/tauri.conf.json', import.meta.url), 'utf8'));

// base './' para que los assets carguen con rutas relativas: necesario dentro
// del .exe de Tauri (protocolo tauri://) y para cualquier hosting en subcarpeta.
export default defineConfig({
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  build: {
    chunkSizeWarningLimit: 900,
  },
});
