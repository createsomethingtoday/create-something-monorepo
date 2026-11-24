# Cook repair receiver brief template

This file is a portable handoff template, not evidence that a repair ran. The coordinator fills the runtime fields from fresh native case state and durable receipt bodies before dispatch. Placeholder values are not executable authorization.

## Runtime input

- Case ID: `<native case ID>`
- Failed source SHA: `<full 40- or 64-character SHA>`
- Worktree and allowed paths: `<owned checkout and authorized paths>`
- Assignment and policy artifacts: `<durable references>`
- Acceptance criteria: `<observable pass/fail criteria>`
- Graph version: `<planner version>`
- Failure receipt IDs: `<exact sorted inputs.receiptIds>`
- Failure receipt bodies: `<review findings and/or CI failure evidence, with provenance>`
- Repair attempt and cap: `<inputs.repairAttempt>` / `<inputs.repairLimit>`
- Native repair issue/run and dispatched receipt: `<durable identifiers>`

## Receiver procedure

Read the assignment, local AGENTS, policy artifacts, and exact failure receipt bodies. Verify case, full SHA, checkout ownership and allowed paths before editing. Confirm the native dispatch receipt belongs to this source SHA. If any binding is missing or the checkout moved, hold and return the mismatch to the coordinator.

Reproduce each finding with a focused failing check where applicable. Repair only authorized scope. Run the affected checks and directly assess UI or media when applicable. Record exact commands, results and limits in ROUNDS.md or a native evidence attachment. Preserve unrelated changes. Submit a new full SHA and the evidence needed for an independent reviewer; a same-SHA approval cannot erase review change requests.

## Completion and next owner

Return the native case/issue/run IDs, source SHA, resulting SHA, addressed failure receipt IDs, check evidence, unresolved findings, and worktree disposition. A completed repair receipt remains bound to the failed source SHA; include the resulting SHA in its native evidence. The coordinator refreshes native state, retains the dispatch/completion receipts for the case budget, then requests fresh independent review and CI for the resulting SHA. The independent reviewer must assess the actual output. The release reviewer receives the exact passing revision only after those gates pass.

Cook does not approve its own review, mutate coordination history, reset the retry budget, deploy, merge, message third parties, or infer release authority from technical checks. Any shipping authority must come from the explicit owning assignment and its promotion workflow.

## Resume

On restart, read fresh native case and run state before acting. Reuse the existing repair issue/run for the dispatched source SHA. A local file or process exit is not a native completion receipt. If the run is still active, leave it owned by that run. If terminal, reconcile its evidence through the native lifecycle before planning again. Do not enqueue another attempt because completion evidence is delayed. A graph hold requires a new revision or coordinator/operator resolution, not a local counter reset.
