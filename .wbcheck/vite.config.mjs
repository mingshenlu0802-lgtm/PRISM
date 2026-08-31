import react from '@vitejs/plugin-react'
export default {
  root: '/home/user/PRISM/.wbcheck',
  base: './',
  plugins: [react()],
  build: { outDir: '/home/user/PRISM/.wbcheck/dist', emptyOutDir: true },
}
