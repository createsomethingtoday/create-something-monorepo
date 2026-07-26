# GitHub Actions Runner Broker

This Worker keeps GitHub as the source, pull-request, and check surface while executing private-repository jobs in one-job Cloudflare Containers.

## Security boundary

- Only signed GitHub App `workflow_job` webhooks are accepted.
- Only explicitly allowlisted repositories and jobs labeled `cloudflare-ephemeral` launch containers.
- The GitHub App installation token stays in the Worker. The container receives only the one-job JIT configuration.
- Each JIT runner handles at most one job, deregisters automatically, and exits. Cloudflare then discards its filesystem.
- D1 stores bounded launch/exit receipts; Cloudflare Observability retains runner output.
- A `succeeded` D1 receipt means the runner process completed cleanly; the GitHub check conclusion remains authoritative for the job result.
- Every migrated workflow must set `timeout-minutes: 30`, matching the broker's container lifetime cap.

## GitHub App requirements

Create a private GitHub App owned by `createsomethingtoday` with:

- Repository permissions: **Administration — Read and write** and **Actions — Read-only**.
- Subscribe to the **Workflow job** event.
- Webhook URL: `https://github-actions-runner-broker.createsomething.workers.dev/github/webhook`.
- Install it only on the four repositories in `ALLOWED_REPOSITORIES`.

Convert the downloaded private key to unencrypted PKCS#8 before storing it as a Worker secret:

```bash
openssl pkcs8 -topk8 -inform PEM -outform PEM -nocrypt \
  -in github-app-private-key.pem \
  -out github-app-private-key.pkcs8.pem
```

Required Worker secrets:

- `GITHUB_APP_ID`
- `GITHUB_APP_PRIVATE_KEY_PKCS8`
- `GITHUB_WEBHOOK_SECRET`
- `CONTROL_TOKEN`

Never pass the App private key or installation token into a runner container.

## Validation and deployment

```bash
pnpm --filter @create-something/github-actions-runner-broker test
pnpm --filter @create-something/github-actions-runner-broker check
pnpm --filter @create-something/github-actions-runner-broker dry-run
```

Create/migrate D1, set the four secrets, deploy, install the GitHub App, and then update repository workflow runner labels. Do not switch a repository until a signed test webhook and an actual one-job JIT canary both produce durable receipts.
