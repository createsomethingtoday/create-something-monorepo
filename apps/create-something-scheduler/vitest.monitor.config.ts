import { cloudflareTest } from '@cloudflare/vitest-pool-workers';
import { defineConfig } from 'vitest/config';
export default defineConfig({ plugins: [cloudflareTest({ wrangler: { configPath: './wrangler.monitor.test.jsonc' } })], test: { include: ['src/monitor.worker.test.ts'] } });
