/**
 * LOCAL FIXTURE ONLY. Runs the real SvelteKit dashboard (routes, layouts,
 * navigation, API routes) against a fictional portfolio, so the UI can be
 * viewed and screenshotted with no credentials.
 *
 *   pnpm --filter @create-something/webflow-dashboard fixture:dashboard
 *   open http://127.0.0.1:5198/dashboard
 *
 * How it stays local:
 *  - `$lib/server/airtable` resolves to ./fake-airtable.ts (in-memory data).
 *  - Routes that call other services are answered here before SvelteKit runs.
 *  - Sign-in uses the existing dev-only PLAYWRIGHT_AUTH_EMAIL hook, which
 *    `hooks.server.ts` ignores outside `vite dev`.
 * Nothing in src/ changes for the fixture, and it is not part of the build.
 */
import { sveltekit } from '@sveltejs/kit/vite';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin, type PluginOption } from 'vite';
import { FIXTURE_EMAIL, FIXTURE_SUBMISSION_STATUS, fixtureThumbnailSvg } from './data';

const here = (path: string) => fileURLToPath(new URL(path, import.meta.url));
const REAL_AIRTABLE = here('../../src/lib/server/airtable.ts');
const FAKE_AIRTABLE = here('./fake-airtable.ts');

process.env.PLAYWRIGHT_AUTH_EMAIL = FIXTURE_EMAIL;

function fixtureDashboard(): Plugin {
	return {
		name: 'fixture-dashboard',
		enforce: 'pre',
		async resolveId(source, importer, options) {
			if (!importer || importer === FAKE_AIRTABLE || !source.endsWith('airtable')) return null;
			const resolved = await this.resolve(source, importer, { ...options, skipSelf: true });
			return resolved?.id === REAL_AIRTABLE ? FAKE_AIRTABLE : null;
		},
		configureServer(server) {
			const json = (res: import('node:http').ServerResponse, body: unknown) => {
				res.setHeader('Content-Type', 'application/json');
				res.end(JSON.stringify(body));
			};

			server.middlewares.use('/fixture-thumbs', (req, res) => {
				const n = Number.parseInt((req.url ?? '').replace(/\D+/g, ''), 10) || 0;
				res.setHeader('Content-Type', 'image/svg+xml');
				res.end(fixtureThumbnailSvg(n));
			});
			server.middlewares.use('/api/submission-status', (_req, res) =>
				json(res, FIXTURE_SUBMISSION_STATUS)
			);
			server.middlewares.use('/api/analytics/track', (_req, res) => json(res, { success: true }));
		}
	};
}

export default defineConfig({
	plugins: [fixtureDashboard(), sveltekit() as unknown as PluginOption],
	server: { host: '127.0.0.1', port: 5198, strictPort: true }
});
