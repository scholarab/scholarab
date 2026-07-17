import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'happy-dom',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['src/tests/setup.ts'],
    coverage: {
      provider: 'v8',
      include: [
        'src/lib/eligibility-matcher.ts',
        'src/lib/utils.ts',
        'src/lib/tracker.ts',
        'src/lib/data-loader.ts',
        'src/lib/constants.ts',
        'src/lib/list-core.ts',
        'src/lib/ics.ts',
        'src/middleware.ts',
      ],
      reporter: ['text', 'html'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
      },
    },
  },
})
