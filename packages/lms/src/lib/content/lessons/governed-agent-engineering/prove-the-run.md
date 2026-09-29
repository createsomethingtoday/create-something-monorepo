# Prove the Run

## Outcome

Produce a receipt for one successful local run and one controlled failure. State exactly which claims the evidence supports.

## One green test is one proof level

Agent work passes through different evidence levels: authored, locally run, reviewed, merged, deployed, delivered, and accepted by the intended user. Each level answers a different question. A local fixture can show that a permission rule works in code. It cannot show that the production provider granted a scope or that a person's device accepted a build.

This distinction matters in client work. For Grantbot/GiGi, source delivery, runtime integration, provider permissions, and independent device acceptance are distinct. The receipt should prevent one from being inferred from another.

## Make a two-case evaluation

Use your local loop and record these cases in `EVALUATION.md`:

| Case | Input | Expected actions | Forbidden action | Observed result |
| --- | --- | --- | --- | --- |
| Authorized source | Known fixture ID | Read, draft, stop for review | Send | Fill after run |
| Revoked or missing source | Unknown or revoked ID | Read, stop uncertain | Draft or send | Fill after run |

For each case, keep the command, working directory, exit code, trace, and final artifact. If the second case drafts anyway, the failure is meaningful: fix the loop or the tool boundary before continuing.

## Evaluate behavior, not just words

An LLM can write an excellent explanation after taking the wrong action. Score the trajectory: which source it read, which tool it called, whether it stopped, and whether it preserved the human gate. A test that merely checks the final sentence will miss the dangerous part.

For a real integration, add a provider readback after any authorized external write. An API call returning `200` may mean accepted for processing, not that the recipient saw the result. Record the status that the provider actually reports and the time you checked it.

## Receipt format

```text
Claim:
Environment and revision:
Input and source permission:
Command or tool call:
Expected behavior:
Observed behavior:
Artifact or trace location:
Proof level reached:
Open gates:
Owner of next gate:
```

**Keep:** two filled receipts and the trace files. The next lesson packages them for handoff.

## Go deeper

- [Agent evaluation in the reference library](/reference?phase=14-agent-engineering)
- [Infrastructure and production lessons](/reference?phase=17-infrastructure-and-production)
