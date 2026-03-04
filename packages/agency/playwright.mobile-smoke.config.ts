import { defineConfig } from '@playwright/test';

export default defineConfig({
	testDir: './tests/mobile-smoke',
	timeout: 30_000,
	expect: {
		timeout: 5_000
	},
	fullyParallel: false,
	workers: 1,
	reporter: 'list',
	use: {
		baseURL: 'http://127.0.0.1:4173',
		viewport: { width: 390, height: 844 },
		trace: 'retain-on-failure',
		screenshot: 'only-on-failure',
		video: 'retain-on-failure'
	},
	webServer: {
		command: 'pnpm preview --host 127.0.0.1 --port 4173',
		url: 'http://127.0.0.1:4173',
		reuseExistingServer: true,
		timeout: 120_000
	}
});
