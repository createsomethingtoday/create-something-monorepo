# Claude Code mods for Template Review

Three [Claude Code mods](https://claude.dev/blog/getting-started-with-claude-code-mods/) that sit beside the Template Review MCP in a reviewer's Claude Code session. They match the direct `claude.ai Template Review MCP` connector, the `wf-template-review-*-bridge` servers, and Hub `hub_execute_proxy_tool` calls alike (any tool name ending in `template_review_<name>`).

| Mod | What it does |
| --- | --- |
| `template-review-guard` | Stops a creator-facing write (`request_changes`, `approve_version`, `reject_version`, `complete_publishing`, status-setting `update_version_review`, public `send_ticket_followup`, `create_ticket`, `update_ticket_status`, publishing/featured/MRP flags) until the reviewer answers **Send** on the engine's dialog. When the call carries creator-facing text, the dialog quotes it and a pane titled "What the creator will read" shows the full Markdown beside it (the pane needs a wide terminal; the dialog excerpt shows either way). Refuses an official decision on a version whose `get_review_context` has not run this session, and one with no validation and screenshot evidence for that version (a Phase 0 `DEAD_URL` / `NOT_A_TEMPLATE` fast-exit is exempt). Evidence persists across sessions in the plugin store, keyed by version; it is dropped once the version's `latestReviewDate` passes it (the creator resubmitted after Changes Requested) or after 14 days, and a toast says what was restored. Refuses a Preview link on the published-site evidence tools. Lints feedback before it is written: backticks (truncate the email), a greeting or sign-off in `review_feedback` / `rejection_feedback` (the email template adds its own), and a missing greeting on verbatim ticket messages are refused; blank lines between numbered items are collapsed so Airtable does not renumber them all `1.`. If the guard itself crashes on a Template Review call, the call is refused rather than let through. |
| `template-review-viz` | Review visualization. **Compact rows:** every Template Review result in the transcript is drawn as a summary instead of raw JSON (review context as name, status, creator, Phase 0 verdict and capability flags; validation as issue counts per category, custom-code detections and the first sample issues; screenshots as segment counts per viewport with a **Show strip** button; queues as name, status, age and version id rows; anything else as key/count lines). Ctrl+O still shows the raw result. **Screenshot strip** (`/trs`): desktop, tablet and mobile segments drawn side by side in the terminal from the last capture, with Prev / Next paging through the full page; segments are fetched with curl and converted with `sips` into `/tmp/claude-tr-shots/`, so this needs macOS and a kitty-graphics terminal (Ghostty, kitty); elsewhere the pane shows the segment links. **Scorecard** (`/trc`): the ten rubric dimensions with tier bars (`###` Exceptional, `##.` Good, `#..` Satisfactory, `???` Unverifiable), the verdict, hard-failure and BLOCKING / RECOMMENDED counts, and the pass-bar check (Good or better everywhere, zero blockers). It reads the structured `format_agent_review_feedback` call for evidence labels and findings, and parses the report table and lists out of `save_agent_feedback`, `save_draft_feedback`, `request_changes` and `update_version_review` text. |
| `template-review-hud` | Tracks every version touched this session and shows the current one's playbook progress above the prompt (`ctx own val shots dom zd draft notes decision`), with the screenshot gallery link and decision as toasts. `/tr` opens a pane listing all of them; `Hide` dismisses the band for the session. |

## Load

For one session:

```bash
claude --plugin-dir packages/webflow-template-review-mcp/mods/template-review-guard \
       --plugin-dir packages/webflow-template-review-mcp/mods/template-review-hud \
       --plugin-dir packages/webflow-template-review-mcp/mods/template-review-viz
```

For every session (also the desktop app), in `~/.claude/settings.json`:

```json
{ "env": { "CLAUDE_CODE_PLUGIN_DIRS": "/abs/path/mods/template-review-guard:/abs/path/mods/template-review-hud" } }
```

Edits to a loaded folder hot-reload in an interactive session. The guard's confirmation uses the engine's AskUserQuestion dialog, so it shows even under bypass-permissions mode; in a headless `claude -p` run nobody can answer and every creator-facing write is refused.

## Check

```bash
claude plugin validate packages/webflow-template-review-mcp/mods/template-review-guard
claude plugin test     packages/webflow-template-review-mcp/mods/template-review-guard
```

Once a mod has loaded, the engine lays this build's API types in `<mod>/.claude-plugin/types/` (gitignored), and `tsc -p <mod>` type-checks it. That in-place check also declares every MCP tool connected in the session; with many claude.ai connectors attached (hundreds of tools) `tsc` runs out of heap, so type-check against the API file alone (the `plugin-authoring` skill's `types/claude-code.d.ts`) in that case. `claude plugin test` is unaffected.

## Known limits

- The screenshot strip assumes terminal cells are twice as tall as wide when sizing images; a font with a different aspect draws them slightly squashed or stretched. The segment pane title shows the true pixel size.
- Scorecard tiers come only from a Markdown table in the review-template shape (`| Dimension | Tier | Evidence |`); prose like "typography is good" is not read.

- Hub proxy calls (`hub_execute_proxy_tool`) are linted and gated but never rewritten, so the blank-line fix only applies on direct and bridge calls; the model is told what to change instead.
- The guard credits validation and screenshot evidence to the version whose published site the call ran on, matched by host against the `websiteUrl` in each `get_review_context` result, so several templates can be captured in parallel. A URL whose site no loaded context names (a custom domain, say) still falls back to the most recently seen `version_id`. The HUD still attaches URL-only steps to the most recently seen `version_id`.
- The approval buttons cannot live in the pane: a hook has ten seconds of its own time per dispatch and only `$` calls pause that clock, so the wait happens on `$.ui.ask` and the pane is read-only.
- Template names come from the `get_review_context` result text by key name (`template_name`, `name`, …); an unexpected payload shape falls back to the record id.
