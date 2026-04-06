import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'happy-dom',
    include: ['src/**/*.test.ts'],
    setupFiles: [],
    coverage: {
      provider: 'v8',
      include: [
        'src/lib/eligibility-matcher.ts',
        'src/lib/utils.ts',
        'src/lib/tracker.ts',
        'src/lib/data-loader.ts',
        'src/hooks/useScholarships.ts',
        'src/hooks/usePrograms.ts',
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
