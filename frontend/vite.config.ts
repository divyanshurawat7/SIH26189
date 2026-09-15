/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/health': 'http://localhost:8000',
      '/overview': 'http://localhost:8000',
      '/persons': 'http://localhost:8000',
      '/cases': 'http://localhost:8000',
      '/networks': 'http://localhost:8000',
      '/findings': 'http://localhost:8000',
      '/cross-case': 'http://localhost:8000',
      '/investigation': 'http://localhost:8000'
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: false
  }
})
