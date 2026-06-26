# Agency And Core Ink Production Promotion

This runbook defines the promotion gates for the `.agency` public surface, Calm
Operator Ink bridge, Core Ink firmware, and Retool review-packet manifest. It is
a plan only; running these checks does not imply approval to deploy production.

## Shared Rule

Use Git-light only for DEV or preview checkpoints. Production promotion requires
intentional review, a branch or PR boundary unless an approved immutable release
path exists, Linear evidence, and an explicit rollback note.

Do not store secrets in repo files. The production smoke paths name the required
secrets, but tokens must come from Infisical or another secret manager.

## Agency Site Gate

Purpose: promote the CREATE SOMETHING public positioning and workflow-console
surface.

Pre-promotion checks:

```bash
pnpm --filter @create-something/canon package
pnpm --filter @create-something/agency check
pnpm --filter @create-something/agency build
```

Promotion command, only after intentional production approval:

```bash
pnpm --filter @create-something/agency deploy
```

Post-deploy smoke:

```bash
curl -I https://createsomething.agency/
curl -I https://createsomething.agency/services
curl -I https://createsomething.agency/stack
```

Rollback: redeploy the last known-good Cloudflare Pages deployment or revert the
merge commit and let the Pages production deployment return to the previous
artifact.

Linear evidence must include issue ID, branch or PR, checks run, deploy URL or
deployment identifier, post-deploy route checks, and rollback note.

## Core Ink Bridge Gate

Purpose: promote the Cloudflare Worker that stores operator signals and serves
Core Ink briefs.

Pre-promotion checks:

```bash
pnpm --dir packages/calm-operator-ink-bridge check
pnpm --dir packages/calm-operator-ink-bridge test
pnpm retool:operating-model:check
```

Required production smoke secrets:

```text
INK_DEVICE_TOKEN
INK_SOURCE_TOKEN
CALM_OPERATOR_BRIDGE_TOKEN
```

Promotion command, only after intentional production approval:

```bash
pnpm --dir packages/calm-operator-ink-bridge run deploy
```

Post-deploy smoke:

```bash
infisical run --env=prod --path=/ --include-imports=true -- pnpm ink:bridge:smoke
```

Read-only smoke variant:

```bash
pnpm --dir packages/calm-operator-ink-bridge smoke:production -- --skip-heartbeat
```

Rollback: redeploy the prior Worker version from Cloudflare deployment history
or revert the bridge change and deploy the reverted artifact.

Linear evidence must include issue ID, bridge package, commands run, Worker
deployment identifier or route, smoke output, and rollback note.

## Core Ink Firmware Gate

Purpose: upload firmware to a physical Core Ink device after bridge and token
contracts are stable.

Pre-upload config and build:

```bash
infisical run --env=prod --path=/ --command "pnpm --dir packages/calm-operator-ink-firmware config:write"
pnpm --dir packages/calm-operator-ink-firmware build
```

Required setup secret:

```text
INK_DEVICE_TOKEN
```

Manual upload, only when the operator is ready with the physical device:

```bash
pnpm --dir packages/calm-operator-ink-firmware upload
pnpm --dir packages/calm-operator-ink-firmware monitor
```

Manual smoke:

- boot screen renders
- `PWR` sync returns the current operator brief
- Decision Garden marks persist across restart
- Check In posts an `offline_decision_garden` packet through `/ink/operator-event`
- no sensitive text or business content appears in local device state

Rollback: upload the previous known-good firmware build to the device and leave
the bridge route untouched unless the bridge smoke also failed.

Linear evidence must include issue ID, firmware version, build command, upload
port, manual smoke notes, and rollback note.

## Retool Manifest Gate

Purpose: keep the Decision Garden import review-only until human approval.

Check:

```bash
pnpm retool:operating-model:check
```

The check must pass before Retool import changes, bridge deploys that affect
`offline_decision_garden`, or firmware uploads that change Decision Garden
payloads.

Rollback: restore the previous `config/retool/operating-model.json` and Retool
app version, then rerun the manifest check.

Linear evidence must include issue ID, manifest path, check output, Retool app
version or draft link when applicable, and rollback note.
