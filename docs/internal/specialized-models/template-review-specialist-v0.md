# Template Review Specialist v0

Status: source recovered on current main; local gate supported; live revalidation pending.

This package preserves the permission-safe Template Review Specialist data flywheel built under CRE-860 and CRE-863. Those issues recorded a passing live gate on June 27, 2026, but the source remained only in a preservation worktree. CRE-1457 recovered it without restoring the retired Braintrust dependency.

## Boundary

The specialist drafts reviewer-facing evidence and Agent Review Feedback. It does not make official approval, rejection, quality-rating, publishing, or creator-facing decisions.

Allowed corpus inputs:

- repository-owned policy and eval examples
- sanitized Dify smoke behavior
- reviewer-approved corrections with explicit permission flags
- Langfuse message and conversation join identifiers

Excluded inputs:

- raw employer, customer, creator, or marketplace records
- credentials, bearer tokens, private configuration, and raw trace payloads
- unapproved reviewer output or official review decisions

## Local workflow

Build the request-free dataset, telemetry summary, and dry-run receipt:

```bash
pnpm specialist:template-review:dataset -- --include-tool-cases
pnpm specialist:template-review:telemetry
pnpm specialist:template-review:finetune -- --dry-run
pnpm langfuse:eval:dify:template-review-specialist-dataset:local
```

Or run the complete request-free recovery gate:

```bash
pnpm specialist:template-review:production-gate -- --issue CRE-1457
```

Generated files live under `output/specialized-models/template-review-specialist/` and remain local evidence by default.

## Approved corrections

Correction records require `id`, `approved_at`, `approved_by`, `prompt`, `accepted_answer`, and all three policy flags:

- `permission_safe: true`
- `excludes_private_data: true`
- `reviewer_approved: true`

Validate a candidate file:

```bash
pnpm specialist:template-review:corrections -- --input path/to/corrections.jsonl --check
```

Append reviewed records to a ledger:

```bash
pnpm specialist:template-review:corrections -- --input path/to/corrections.jsonl --append
```

## Live checkpoints

Live dataset collection, runtime evaluation, Template Review Hub evaluation, and Langfuse emission are separate checkpoints. Run them only with the owning credentials and approval path:

```bash
infisical run --env=prod --path=/ --recursive -- \
  pnpm specialist:template-review:production-gate -- --live --issue CRE-1457
```

The prompt-specialized runtime can be invoked separately with an approved provider credential:

```bash
infisical run --env=prod --path=/ --recursive -- \
  pnpm specialist:template-review:runtime -- --prompt "Draft bounded Agent Review Feedback headings."
```

Fine-tune creation is not part of the recovery. The command defaults to dry-run, and `--create` additionally requires the explicit environment gate documented by the CLI. The historical OpenAI fine-tune attempt remains evidence in CRE-863; it is not replayed.

## Readiness thresholds

- `0-50` approved corrections: prompt-specialized runtime and local/Langfuse evals
- `50-200`: consider a bounded low-cost adapter experiment
- `200-500`: compare a specialist training pass with the hosted baseline
- `500+` plus repeated usage: consider an always-on endpoint only with a budget and rollback path

The thresholds are planning gates, not authorization to train, deploy, or mutate a provider account.
