# Claude Code mods for App Review

Five [Claude Code mods](https://claude.dev/blog/getting-started-with-claude-code-mods/) that sit beside the App Review MCP in a reviewer's Claude Code session. They match any tool name ending in `app_review_<name>`, so the direct `claude.ai App Review MCP` connector and bridge servers both work.

| Mod | What it does |
| --- | --- |
| `app-review-guard` | Stops a developer-facing write (`request_changes`, `approve_version`, `reject_version`, status-setting `update_version_review`, public `send_ticket_followup`, `create_ticket`) until the reviewer answers **Send** on the dialog; a pane shows the full feedback the developer will read. Refuses an official decision on a version whose `get_review_context` has not run this session. Lints feedback (backticks, greeting or sign-off inside the templated fields, blank lines between numbered items) before it is written. Fails closed. |
| `app-review-context` | `/review <version id or app name>` opens a pane with the version, prior decisions and feedback, open exception items, and computed flags (repeat submission, partner, unresolved carry-overs). |
| `app-review-doctor` | Runs the forge doctor (`packages/webflow-app-forge`) on every build command and on `/doctor [path]`; shows the result as a band and a pane, and composes the rubric into the prompt so findings are addressed before submission. |
| `submission-guard` | Denies submit-form POSTs, source maps copied into `public/`, and bundling while a `.map` is present in the bundle directory. |
| `review-queue` | `/queue` lists the review queue; `/queue trend` and the band above the prompt draw a month-by-status sparkline from `app_review_queue_stats`. |

## Load

Copy a mod directory into your session's dev-mods folder (or point `claude plugin` at it) and run `claude plugin validate <dir>`. Each mod has `hooks/register.test.ts`; run it with `claude plugin test <dir>`, which also regenerates the ignored `.claude-plugin/types/` that `tsconfig.json` extends.

Nothing here writes to Airtable, Zendesk, or a developer on its own; every write still goes through the MCP and, for developer-facing writes, through the guard's dialog.
