import { defineConfig } from 'vite';

// base './' para que los assets carguen con rutas relativas: necesario dentro
// del .exe de Tauri (protocolo tauri://) y para cualquier hosting en subcarpeta.
export default defineConfig({
  base: './',
  build: {
    chunkSizeWarningLimit: 900,
  },
});
