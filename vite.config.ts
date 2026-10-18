import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // The app, plus the About page at /about/.
    rollupOptions: {
      input: { main: resolve(import.meta.dirname, 'index.html'), about: resolve(import.meta.dirname, 'about/index.html') },
    },
  },
})
