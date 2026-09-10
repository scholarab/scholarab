import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './e2e-matching',
  timeout: 45000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 2,
  reporter: 'list',
  // Fault injection must reach page routes, rather than an installed service worker cache.
  use: { baseURL: 'http://127.0.0.1:4325', trace: 'retain-on-failure', serviceWorkers: 'block' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    {
      name: 'mobile-320',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 320, height: 740 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: {
    command: 'npx wrangler pages dev dist --port 4325',
    url: 'http://127.0.0.1:4325',
    reuseExistingServer: false,
    timeout: 60000,
  },
});
