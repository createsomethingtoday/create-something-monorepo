# Paperclip delivery review with Cook

A native Paperclip case retains one primary task. Its assigned agent can hand the task to independent review, engineering using `$cook`, or release assessment. GitHub Actions runs the configured pull-request workflow in parallel. The graph reads its receipt on each invocation. A readiness handoff gives the release reviewer evidence and leaves the release decision with the owning workflow.

## Bind a case

Use an operator-controlled config file outside the candidate checkout. Pin the reviewed runner installation independently of the PR under review. Configure the following fields.

| Field | Source |
| --- | --- |
| companyId | Native Paperclip company UUID |
| roles | Map `request_independent_review`, `run_cook_repair`, and `assess_release_readiness` to three distinct authorized Paperclip agent UUIDs. The repair agent needs the Cook skill installed. |
| repo, pullNumber | Same-repository GitHub pull request |
| reviewer, ciWorkflowId | Independent GitHub reviewer login and numeric Actions workflow ID. The workflow runs on pull requests and checks the candidate commit. |
| brief, acceptance | Operator-approved task text and a nonempty array of observable criteria for the Cook recipient |
| journalDir | Private absolute directory shared by the participating trusted runners for this case |
| caseId, issueId | Native case and primary-task UUIDs assigned by Paperclip at kickoff |

Generate the exact workflow document from the configured bindings before kickoff. Supply its unmodified bytes as `workflow_document_text` to the owning Paperclip case creation flow. After kickoff, add the returned case and primary-task IDs to the config.

```sh
node scripts/paperclip-review-graph/runner.mjs definition /path/to/operator-config.json > workflow.md
node scripts/paperclip-review-graph/runner.mjs inspect /path/to/operator-config.json
```

## Native heartbeat

For this bound task, call the following command from the assigned agent's existing process adapter after its role has produced an output. Run it once when the coordinator starts the case and again on an eligible task wake after GitHub evidence changes. An idle graph waits for the next configured wake. The adapter needs its native API URL, agent ID, company ID, run ID and runtime-issued API key. Supply a read-scoped GitHub token for private repositories. Keep all credentials in the existing runtime environment.

```sh
node scripts/paperclip-review-graph/runner.mjs heartbeat /path/to/operator-config.json
```

A reviewer records its review on the bound PR. The Cook recipient reads its assignment and exact finding IDs, applies the task criteria, and submits a new candidate revision. Run the heartbeat after that work. Release assessment returns to the existing release owner. The receiver template lives in [cook/BRIEF.md](cook/BRIEF.md).

The runner validates native ownership, the primary task's workflow bytes and the GitHub binding on each wake. It persists a dispatch intent before requesting a native handoff, supplies both concurrency versions, and verifies the resulting native row. After an interrupted request, resume on the same case with its journal intact. Conflicting history, altered bindings, incomplete evidence, or an exhausted repair budget require reconciliation. Roll back by disabling this case's invocation in the owning adapter and retaining native history and journals for readback.

## Verification

```sh
node --test scripts/paperclip-review-graph/*.test.mjs
```

Native handoffs require the Paperclip Cases feature and the case-handoffs API. The adapter tests use process-local fixtures. A live GitHub source, an installed Cook agent, and an authorized native case each require their own qualification.
