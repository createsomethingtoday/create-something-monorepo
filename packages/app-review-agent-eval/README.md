# App review agent experiment

Internal. Tests one hypothesis: **an agent with sandbox access to the submitted bundle and listing, running on a given model, produces reviewer-grade Marketplace App review findings.** The bet under test is the combination of sandbox access and model, with "Astra with subagents" as a variant arm.

Nothing here writes to Airtable, Zendesk, or a developer. The agent produces findings; humans decide.

## Design

| Piece | What it is |
| --- | --- |
| Corpus | Decided app versions since 2026-07-01 with written reviewer feedback, joined to their listing fields and to the exact bundle the reviewer saw. 346 labeled versions, 165 with a bundle. Reviewer feedback is the label and lives in `corpus/labels.json`, which the agent never sees. |
| Arms | `astra` (gpt-6-astra), `daybreak` (gpt-daybreak-blue-latest), `astra-subagents` (gpt-6-astra, Codex multi-agent on), `sol` (gpt-6.1-sol, cheap control). Same prompt, same workspace, same sandbox. |
| Runtime | The Codex CLI in `workspace-write` sandbox, network off by default. The workspace holds the unzipped bundle, `listing.json`, the published guidelines as Markdown, the forge requirements registry, and the taxonomy. Output is JSON against `schemas/findings.schema.json`. |
| Judge | Claude, a different vendor from every arm. Step 1 classifies the human feedback into taxonomy codes with verbatim quotes, cached per version so every arm is scored against identical labels. Step 2 matches agent findings to human issues and grades evidence as specific or vague. |
| Metrics | Recall of human issues, precision of agent findings, unsupported-finding rate, verdict agreement, tokens, wall time, refusals. |

## Run

```bash
cd packages/app-review-agent-eval
infisical run --projectId e1532079-2f2b-46b5-8972-cf7a025eb803 --env prod --path / -- node scripts/corpus.mjs   # Airtable pull
# admin version lists need an Okta admin browser session; see scripts/fetch-bundles.mjs header and the ego-browser step in the session log
node scripts/fetch-bundles.mjs                                   # CDN downloads
node scripts/run-arm.mjs --arm astra --sample 20 --seed 7        # one arm, stratified by capability
node scripts/run-arm.mjs --arm daybreak --sample 20 --seed 7     # same versions, other model
node scripts/run-arm.mjs --arm astra-subagents --sample 20 --seed 7
infisical run ... -- node scripts/judge.mjs --arm astra          # Claude judge, cached labels
node scripts/report.mjs                                          # runs/REPORT.md
```

Codex uses the machine's ChatGPT login. The child process gets a minimal environment (PATH, HOME, locale, `CODEX_HOME`), never the Infisical-injected keys. While an arm runs, `corpus/labels.json` and `corpus/judged-labels/` are `chmod 000`, because the `workspace-write` sandbox restricts writes, not reads; every `run.json` records `labelPathHits`, the count of events that name the label store (0 across all runs so far). Pass `--network` to let the agent reach the listing URLs and testing site; this turns on unrestricted egress for the sandbox, and the GET-only rule is enforced by the prompt, not the sandbox. Off by default so the first results isolate what the bundle and listing alone support.

## What the corpus cannot tell you

- Reviewer feedback is the label, and reviewers enforce some rules the docs do not state. A disagreement is not automatically an agent error; the judge marks plausible new findings separately so a human can adjudicate.
- 226 of the 532 Jul–Sep rejections have no written reason in Airtable. They are not in this corpus. The corpus skews toward Shea's code-security reviews (264 of 346).
- Backend authentication, OAuth state, and uninstall cleanup need live endpoints. With network off they are out of reach; with `--network` the prompt restricts the agent to GET probes, and the sandbox does not enforce that.
- Bundles come from the admin versions API through a browser session and the public CDN. Keep `corpus/bundles/` out of git (it is).

## Preflight receipt side-finding

Of 34 decided versions carrying a `wfpre_` receipt in Airtable, 4 resolve in Preflight's production database; receipts stopped being issued after 2026-08-27. The others are codes the form accepted without verifying. Worth a separate look.
