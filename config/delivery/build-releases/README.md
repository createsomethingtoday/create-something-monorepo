# Build release packages

Each directory contains one immutable Build release manifest, its normalized Map handoff receipt, and the five canonical delivery artifacts. Verify a package from any checkout with:

```bash
pnpm build:release:check -- config/delivery/build-releases/example-non-production/build-release.json
```

`READY` means the checked files match their recorded hashes, the Map handoff receipt is accepted and identity-aligned, staging and UAT receipts passed, rollback and ownership are present, and the terminal decision says accepted. It does not deploy, contact a customer, grant access, or replace an owning production-promotion approval.

`example-non-production` is synthetic proof for the verifier and second-operator runbook. Its accounts, actors, commands, SHA, deploy ID, evidence URIs, and acceptance are fixtures; none represent a customer or live system.

Existing bespoke delivery manifests opt into this contract through `buildReleasePackage`. A `not_configured` value is intentionally fail-closed and preserves their historical evidence without claiming that it satisfies this newer release boundary.
