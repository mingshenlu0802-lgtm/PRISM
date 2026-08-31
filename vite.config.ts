import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Hash routing + relative base keeps the prototype runnable from any static host.
export default defineConfig({
  base: './',
  plugins: [react()],
  server: { host: true, port: 5173 },
  build: { outDir: 'dist', sourcemap: false, chunkSizeWarningLimit: 1200 },
})
