# Non-IaC Demo Script

This demonstration intentionally excludes Notion-as-Code.

1. Show `playbooks/operator-handoff.playbook.json` as the reusable method.
2. Show `runbooks/demo-operator-handoff.runbook.json` as its bound instance.
3. Run `pnpm --filter @create-something/notion-operator-playbook check`.
4. Run `pnpm --filter @create-something/notion-operator-playbook demo` to show
   blocked and ready evaluations, a dry-run instantiation, sanitized sync
   changes, and a verified webhook receipt in one local execution.
5. Point to the webhook tests to show invalid signatures fail before
   processing.
6. Generate the local build receipt and point out
   `proofLevel=local-build-only` and `externalMutations=false`.

The acceptance-day runbook adds hosted deployment and live readback only after
the exact target is approved.
