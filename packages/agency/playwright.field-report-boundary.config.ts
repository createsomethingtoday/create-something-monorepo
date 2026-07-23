import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/field-report-boundary',
  timeout: 30_000,
  expect: {
    timeout: 5_000
  },
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
    screenshot: 'on',
    video: 'retain-on-failure'
  },
  projects: [
    {
      name: 'mobile',
      use: { viewport: { width: 390, height: 844 } }
    },
    {
      name: 'desktop',
      use: { viewport: { width: 1200, height: 900 } }
    },
    {
      name: 'screenshot-wide',
      use: { viewport: { width: 1493, height: 1000 } }
    },
    {
      name: 'wide-stress',
      use: { viewport: { width: 1600, height: 1000 } }
    }
  ],
  webServer: {
    command: 'pnpm preview --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: true,
    timeout: 120_000
  }
});
