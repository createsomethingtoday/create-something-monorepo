import worker from '../dist/index.js';
import { processEvidenceWebhookEvents, signWebhookBody } from '../dist/webhook.js';

const readyInput = {
  runbookId: 'runbook-demo-operator-handoff',
  title: 'Demo operator handoff',
  owner: 'Demo Operator',
  approvalStatus: 'approved',
  rollbackPlan: 'Restore the prior reviewed state.',
  evidenceCount: 3,
  stepCount: 3
};
const blockedInput = {
  ...readyInput,
  owner: '',
  approvalStatus: 'review',
  rollbackPlan: '',
  evidenceCount: 0
};
const instantiateInput = {
  playbookId: 'playbook-operator-handoff',
  playbookVersion: '1.0.0',
  runbookTitle: 'Demo operator handoff',
  owner: 'Demo Operator',
  approved: true,
  dryRun: true,
  targetDataSourceId: null,
  steps: ['Confirm scope.', 'Run the smoke.', 'Attach evidence.']
};

const [blocked, ready, preview, sync] = await Promise.all([
  worker.run('inspectRunbookReadiness', blockedInput, { concreteOutput: true }),
  worker.run('inspectRunbookReadiness', readyInput, { concreteOutput: true }),
  worker.run('instantiateRunbook', instantiateInput, { concreteOutput: true }),
  worker.run('demoEvidenceSync', undefined, { concreteOutput: true })
]);
const syncSummary = {
  changeCount: sync.changes.length,
  keys: sync.changes.map(({ key }) => key),
  databaseKeys: [...new Set(sync.changes.map(({ targetDatabaseKey }) => targetDatabaseKey))],
  hasMore: sync.hasMore
};

const webhookSecret = 'local-demo-secret-not-for-deployment';
const webhookRawBody = JSON.stringify({
  runbookId: readyInput.runbookId,
  evidenceType: 'local-smoke',
  source: 'notion-operator-playbook-demo'
});
const webhook = processEvidenceWebhookEvents(
  [
    {
      deliveryId: 'delivery-local-demo-1',
      body: JSON.parse(webhookRawBody),
      rawBody: webhookRawBody,
      headers: {
        'x-runbook-signature-256': signWebhookBody(webhookRawBody, webhookSecret)
      },
      method: 'POST'
    }
  ],
  webhookSecret
)[0];

console.log(
  JSON.stringify(
    {
      schema: 'create-something/notion-operator-playbook-demo@1',
      proofLevel: 'local-execution-only',
      externalMutations: false,
      sdkVersion: worker.manifest.sdkVersion,
      capabilities: worker.manifest.capabilities.map(({ _tag, key }) => ({ type: _tag, key })),
      results: {
        blockedReadiness: blocked,
        readyReadiness: ready,
        instantiationPreview: preview,
        sanitizedSync: syncSummary,
        verifiedWebhook: webhook
      }
    },
    null,
    2
  )
);
