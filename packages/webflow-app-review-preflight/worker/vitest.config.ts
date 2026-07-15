import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  cloudflareTest,
  readD1Migrations
} from '@cloudflare/vitest-pool-workers';
import { defineConfig } from 'vitest/config';

const directory = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    cloudflareTest(async () => ({
      wrangler: { configPath: './wrangler.jsonc' },
      miniflare: {
        bindings: {
          PREFLIGHT_DEV_TOKEN: 'test-token',
          PREFLIGHT_REVIEWER_DEV_TOKEN: 'reviewer-test-token',
          REVIEWER_USER_IDS: 'local-webflow-reviewer',
          WEBFLOW_CLIENT_ID: 'webflow-client-id',
          WEBFLOW_CLIENT_SECRET: 'webflow-client-secret',
          WEBFLOW_OAUTH_REDIRECT_URI:
            'https://preflight.test/v1/oauth/webflow/callback',
          WEBFLOW_TOKEN_ENCRYPTION_KEY:
            'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
          E2B_COORDINATOR_TOKEN: 'coordinator-test-token',
          RUNTIME_CANARY_URL: 'http://127.0.0.1:4174/webflow-runtime-canary',
          PATTERN_COORDINATOR_TOKEN: 'pattern-coordinator-test-token',
          GOVERNANCE_APPROVER_TOKEN: 'governance-approver-test-token',
          TEST_MIGRATIONS: await readD1Migrations(path.join(directory, '../migrations'))
        }
      }
    }))
  ],
  test: {
    setupFiles: ['./test/apply-migrations.ts']
  }
});
