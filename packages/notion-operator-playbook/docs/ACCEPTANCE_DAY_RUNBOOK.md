# Hosted Worker Acceptance Runbook

This runbook begins only after an operator approves an exact disposable Notion
workspace. Notion authentication or platform entitlement is not permission to
mutate an existing production or client workspace.

## 1. Approve the disposable target

Record the disposable workspace name and ID, operator, Worker name, expected
resources, rollback owner, and expiry date in Linear. Reject the known Half
Dozen and CREATE SOMETHING production workspace IDs.

Because this package intentionally excludes Notion-as-Code, manually create a
disposable Runbooks data source with exactly these properties before a live
instantiation smoke:

| Property    | Type      | Requirement                           |
| ----------- | --------- | ------------------------------------- |
| Name        | Title     | Existing title property               |
| Playbook ID | Rich text | Stores the reusable definition ID     |
| Owner       | Rich text | Stores the named operator             |
| Status      | Status    | Includes a `Ready` option             |
| Receipt ID  | Rich text | Used for idempotent read-before-write |

## 2. Verify identity and entitlement read-only

```bash
ntn --version
ntn doctor
NOTION_WORKSPACE_ID=<disposable-workspace-id> ntn whoami --json
```

Do not run any Notion-as-Code command from this package; the demonstration is
limited to Workers and the surrounding operating policy.

## 3. Validate the non-IaC package

```bash
pnpm --filter @create-something/notion-operator-playbook check
pnpm --filter @create-something/notion-operator-playbook manifest
SOURCE_DATE_EPOCH=<approved-epoch> \
  pnpm --filter @create-something/notion-operator-playbook receipt
```

## 4. Prepare Worker configuration

Create package-local `workers.json` with the disposable workspace selected.
Do not commit it. Confirm `git status` shows no `.env`, state, configuration, or
receipt file containing live IDs.

## 5. Deploy only after a second approval

```bash
ntn workers deploy --name create-something-operator-playbook-demo --local-build
ntn workers get
ntn workers capabilities list
```

No secret is needed for the read-only tool or synthetic manual sync. Before
testing the webhook, set only `RUNBOOK_WEBHOOK_SECRET`. Before any live Runbook
write, set `NOTION_RUNBOOK_WRITE_ENABLED=true` and `NOTION_API_TOKEN` only after
the disposable target data source is confirmed.

## 6. Exercise in increasing authority order

1. `inspectRunbookReadiness` with a blocked fixture.
2. `inspectRunbookReadiness` with a ready fixture.
3. `instantiateRunbook` with `dryRun=true`.
4. `demoEvidenceSync` with preview/local execution before hosted execution.
5. Signed webhook delivery and invalid-signature rejection.
6. Optional live instantiation against the disposable Runbooks data source.
7. Repeat the same instantiation and verify `status=existing`.

Attach tools to a disposable Custom Agent only after the capability list and
write boundary are reviewed. Record that attachment separately from Worker
deployment.

## 7. Receipt and rollback

Record CLI version, workspace ID, Worker ID/version, capability keys, secret
names only, commands, results, created page IDs, repeat-run result, and the
operator decision in Linear.

Rollback order:

1. Disable or delete the disposable Worker.
2. Remove the tool from the disposable Custom Agent.
3. Trash only resources named in the deployment receipt.
4. Read back that no uniquely named demo resources remain.
5. Preserve the receipt and failure evidence; remove local state/configuration
   only after the readback is complete.
