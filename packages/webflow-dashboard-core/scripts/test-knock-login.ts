#!/usr/bin/env -S node --import tsx
/**
 * One-shot smoke test: triggers the asset-dashboard-login-validation Knock
 * workflow with a fake token and recipient micah@webflow.com.
 *
 * Does not touch Airtable, does not affect production users.
 *
 * Usage:
 *   KNOCK_API_KEY=sk_test_xxx pnpm --filter @create-something/webflow-dashboard-core test:knock-login
 *   # optional overrides:
 *   KNOCK_TEST_RECIPIENT_EMAIL=other@webflow.com KNOCK_LOGIN_WORKFLOW_KEY=asset-dashboard-login-validation \
 *     KNOCK_API_KEY=... pnpm ...
 */

import { triggerKnockLoginWorkflow } from '../src/knock.js';

async function main() {
  const apiKey = process.env.KNOCK_API_KEY;
  if (!apiKey) {
    console.error('KNOCK_API_KEY is required');
    process.exit(1);
  }

  const workflowKey = process.env.KNOCK_LOGIN_WORKFLOW_KEY ?? 'asset-dashboard-login-validation';
  const recipientEmail = process.env.KNOCK_TEST_RECIPIENT_EMAIL ?? 'micah@webflow.com';
  const recipientId = process.env.KNOCK_TEST_RECIPIENT_ID ?? `test-${recipientEmail}`;

  const token = `TEST-${Date.now().toString(36).toUpperCase()}`;
  const expiresAtIso = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  console.log(`Triggering Knock workflow "${workflowKey}" → ${recipientEmail}`);
  console.log(`  verificationToken: ${token}`);
  console.log(`  expiresAtIso:      ${expiresAtIso}`);

  const result = await triggerKnockLoginWorkflow({
    apiKey,
    workflowKey,
    recipient: { id: recipientId, email: recipientEmail },
    data: { verificationToken: token, expiresAtIso }
  });

  console.log('Success:', result);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
