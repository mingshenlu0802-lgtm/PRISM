import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Hash routing + relative base keeps the site runnable from any static host.
 *
 * The console is lazy-loaded (see App.tsx), so a reader never downloads the
 * Claude SDK for a screen only the owner opens. The single-file builds want
 * exactly one script, so they set PRISM_ONE_FILE and get everything inlined
 * into one chunk instead.
 */
export default defineConfig(({ mode }) => {
  const oneFile = loadEnv(mode, '.', 'PRISM_').PRISM_ONE_FILE === '1'
  return {
    base: './',
    plugins: [react()],
    server: { host: true, port: 5173 },
    build: {
      outDir: oneFile ? 'dist-single' : 'dist',
      sourcemap: false,
      chunkSizeWarningLimit: 1200,
      rollupOptions: { output: { inlineDynamicImports: oneFile } },
    },
  }
})
