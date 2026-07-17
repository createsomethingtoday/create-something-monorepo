import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	testDir: './tests/map-synthetic',
	timeout: 90_000,
	expect: { timeout: 8_000 },
	fullyParallel: false,
	workers: 1,
	retries: 0,
	reporter: [
		['list'],
		['json', { outputFile: 'artifacts/map-synthetic/playwright.json' }]
	],
	outputDir: 'artifacts/map-synthetic/results',
	use: {
		baseURL: process.env.MAP_SYNTHETIC_BASE_URL ?? 'https://createsomething.agency',
		trace: 'retain-on-failure',
		screenshot: 'only-on-failure',
		video: 'retain-on-failure'
	},
	projects: [
		{ name: 'desktop', use: { viewport: { width: 1280, height: 720 } } },
		{ name: 'mobile', use: { ...devices['iPhone 13'], browserName: 'chromium' } }
	]
});
