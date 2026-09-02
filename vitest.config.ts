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
      // Every module with a dedicated *.test.ts belongs here, or the 80%
      // gate silently stops covering it. The vanilla port (2026-07-17) added
      // app-core/directory-client/saved-client with full test suites that
      // this list never picked up.
      include: [
        'src/lib/alerts.ts',
        'src/lib/app-core.ts',
        'src/lib/constants.ts',
        'src/lib/data-loader.ts',
        'src/lib/defer.ts',
        'src/lib/directory-client.ts',
        'src/lib/eligibility-matcher.ts',
        'src/lib/events.ts',
        'src/lib/ics.ts',
        'src/lib/list-core.ts',
        'src/lib/saved-client.ts',
        'src/lib/status.ts',
        'src/lib/tracker.ts',
        'src/lib/utils.ts',
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
