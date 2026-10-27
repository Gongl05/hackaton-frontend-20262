import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const configuredBase = process.env.VITE_API_BASE_URL ?? env.VITE_API_BASE_URL
  const apiOrigin = configuredBase ? new URL(configuredBase).origin : ''
  return {
  plugins: [react(), tailwindcss(), {
    name: 'api-connect-policy',
    transformIndexHtml: html => html.replace('__API_CONNECT_ORIGIN__', apiOrigin),
  }],
  server: { host: '127.0.0.1' },
  preview: { host: '127.0.0.1' },
  test: { environment: 'jsdom', setupFiles: ['./src/test-setup.ts'] },
  }
})
