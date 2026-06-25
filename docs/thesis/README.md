# Living Thesis Evidence

This directory contains the repo-native citation system for the CREATE SOMETHING
systems thesis.

- `claims.yaml` is the source of truth for thesis claims, status, evidence,
  falsification tests, and open questions.
- `../CREATE_SOMETHING_SYSTEMS_THESIS_EVIDENCE.generated.md` is generated from
  `claims.yaml`.
- `scripts/thesis-evidence.mjs` validates citations and generates the report.

Use:

```bash
pnpm thesis:evidence:generate
pnpm thesis:evidence:check
```

The checker validates repo-local file, directory, package, and anchor citations.
Command evidence is listed but not executed by default; run the cited commands
when a claim needs fresh operational verification.
