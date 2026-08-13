# Worker Execution Policy

## Database

- Demo sync records are generated fixtures. Client data, page IDs, workspace
  IDs, and credentials are prohibited.
- Live Runbook creation targets one explicit data source and uses a
  deterministic receipt ID to find an existing page before creating anything.

## Automation

- `demoEvidenceSync` is manual and replace-mode.
- `inspectRunbookReadiness` is read-only.
- `instantiateRunbook` defaults to dry-run and fails closed unless approval,
  input validation, the environment gate, the target, and authentication all
  pass.
- `runbookEvidenceWebhook` verifies HMAC-SHA256 over the raw request body.

## Judgment

- Authentication does not imply permission to deploy or write.
- Alpha acceptance does not imply permission to target production or client
  workspaces.
- An operator must approve the exact workspace, Worker, data source, secret
  names, and rollback before any hosted mutation.
- Local proof, hosted deployment, Custom Agent attachment, and live workspace
  readback are separate evidence levels.
