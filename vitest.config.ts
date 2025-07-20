import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          include: ['packages/**/tests/**/*.test.ts'],
          exclude: ['packages/**/tests/**/*.integration.test.ts', 'apps/cms/**'],
          name: { label: 'unit', color: 'cyan' },
          env: loadEnv('test', './apps/server', ''),
        },
      },
      {
        test: {
          include: ['packages/**/tests/**/*.integration.test.ts'],
          exclude: ['apps/cms/**'],
          name: { label: 'integration', color: 'magenta' },
          env: loadEnv('test', './apps/server', ''),
          setupFiles: ['./vitest.setup.ts'],
        },
      },
    ],
  },
})
