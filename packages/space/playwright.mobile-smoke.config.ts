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
		baseURL: 'http://127.0.0.1:4174',
		viewport: { width: 390, height: 844 },
		trace: 'retain-on-failure',
		screenshot: 'only-on-failure',
		video: 'retain-on-failure'
	},
	webServer: {
		command:
			'CLOUDFLARE_ACCOUNT_ID=9645bd52e640b8a4f40a3a55ff1dd75a pnpm preview --host 127.0.0.1 --port 4174',
		url: 'http://127.0.0.1:4174',
		reuseExistingServer: true,
		timeout: 120_000
	}
});
