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
