import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

// Separate from vite.config.ts: the router and PWA plugins generate files and a
// service worker, neither of which a test run should touch.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
    environment: 'jsdom',
    // Node's fetch/Request (undici, not jsdom) can't resolve the default
    // relative '/api' base the way a browser does.
    env: { VITE_API_URL: 'http://localhost/api' },
    restoreMocks: true,
    unstubGlobals: true,
  },
})
