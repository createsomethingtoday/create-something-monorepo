# Template agent telemetry snapshots

The existing hourly alert scan completes before optional snapshot work. Set
`GITHUB_SNAPSHOT_TOKEN` only when publishing aggregate telemetry to the configured
GitHub repository is intended. `GITHUB_SNAPSHOT_REPO` defaults to
`createsomethingtoday/template-chat-telemetry`; its value must be an owner/repo
pair. No token means no additional query or GitHub request.

Snapshot queries and each GitHub request have a ten-second timeout. Only a 404
read permits creating a new file; an existing file requires its returned blob SHA.
Failed reads, invalid responses and write conflicts fail the optional publisher
without suppressing the already-completed alert scan. Existing alert delivery and
cooldown behavior remain unchanged. No new cron is introduced.

Run `pnpm --filter @create-something/webflow-template-agent check` for typechecking
and fixture-only tests. Tests never send Slack messages or write a GitHub file.

## Deploy

`pnpm run deploy` first runs `pnpm run preflight`. The preflight sends the Worker's
request shape to the model API's free token-count endpoint and stops the deploy
when the API rejects it. It needs `ANTHROPIC_API_KEY` or `WEBFLOW_ANTHROPIC_KEY`,
so run the deploy under `infisical run`. `SKIP_MODEL_PREFLIGHT=1` deploys without
the check.

The hourly scan runs the same check (A8) and reports when no turn completed in
24 hours while turns were attempted (A7). `/telemetry/summary` lists the active
findings in `alerts`.

## Failed turns

A turn that the model API rejects before any output is charged only what earlier
steps of that turn used. Every other failure keeps the full reservation, because
its real cost is unknown and the daily budget must still hold.
