# Webflow Template Review Nontechnical Reviewer Delivery

Reviewers should not have to understand Claude Code, MCP configuration, Infisical, or shell commands. Dify remains the primary reviewer-facing surface.

## Recommended Delivery Model

```text
Reviewer
  -> Dify Review Hub UI
  -> reviewer-specific Hub MCP
  -> webflow-template-review-mcp
  -> Airtable

Operator / power user
  -> Claude Code
  -> template-review skill
  -> local shell checks or server-side MCP probes
  -> reviewer-specific Hub MCP
```

Claude Code is still useful, but it should be an operator/back-office tool unless a reviewer is explicitly comfortable with it.

## Why This Shape

- Dify gives reviewers a familiar chat UI.
- Claude Code gives operators local shell access for raw HTML checks, batch triage, and skill iteration.
- `webflow-template-review-mcp` is the control point that can safely expose reviewer-specific Airtable reads/writes.
- The reviewer Hubs must remain constrained to `webflow-template-review-mcp` only.

## Lowest-Friction Rollout

### Phase 1 — Dify First, Operator Assisted

Use Dify as the reviewer UI. For checks that require local shell today:

1. Reviewer asks Dify for queue/context/draft review.
2. Dify uses the reviewer Hub for Airtable reads and safe writes.
3. Operator runs Claude Code for hard cases, calibration, and batch scans.
4. Operator saves draft findings into the agent-feedback field, not the human review field.

This gets reviewers moving without asking them to install anything.

### Phase 2 — Promote Local Checks Into `webflow-template-review-mcp`

To remove the operator dependency, migrate the skill's shell checks into narrow MCP tools:

| Proposed tool | Purpose |
| --- | --- |
| `template_review_probe_url` | Fetch URL, status, title, redirects, basic failure classification |
| `template_review_check_required_pages` | Check `/style-guide`, `/licenses`, `/changelog`, `/instructions`, `/404` |
| `template_review_scan_homepage_html` | Count H1s, detect metadata, Powered by Webflow link, licensing link |
| `template_review_scan_custom_code` | Detect GSAP, SplitText, Lenis, multiple GSAP versions, suspicious scripts |
| `template_review_run_phase0` | Return `TEMPLATE`, `CUSTOM_DOMAIN_TEMPLATE`, `DEAD_URL`, or `NOT_A_TEMPLATE` |
| `template_review_triage_version` | Pull Airtable context and run the safe URL/page/script probes in one call |

These tools let Dify do what the Claude skill currently does with `curl` and `grep`, but behind a controlled MCP boundary.

### Phase 3 — Reviewer Plugin Only For Power Users

Package the Claude Code skill and reviewer Hub MCP config as an internal Claude Code plugin for operators and power users. Do not make this the default reviewer setup.

The plugin should include:

- the `template-review` skill
- a reviewer-Hub MCP config
- a token helper that keeps bearer values out of config
- one short slash-command style entrypoint, for example `/webflow-template-reviewer:review-next`

## Reviewer Experience Goal

The reviewer should only need to do this:

```text
Open Dify -> ask "What is next in my queue?" -> review draft -> save/send feedback.
```

The reviewer should not need to:

- install Node
- install Infisical
- paste bearer tokens
- run shell commands
- edit `.mcp.json`
- distinguish Hub proxy tools from downstream tools

## Operator Experience Goal

The operator can still use Claude Code for deeper calibration:

```bash
scripts/webflow-template-review-claude-code-setup.sh eric user
```

But this path is for setup, QA, and fallback work, not the normal reviewer workflow.

## Acceptance Criteria

For nontechnical reviewer rollout:

- reviewer can work from Dify only
- `hub_list_services` returns only `webflow-template-review-mcp`
- Dify can read queue/context and save draft feedback
- URL sanity and required-page checks are either precomputed by an operator or available as `webflow-template-review-mcp` tools
- no reviewer receives raw bearer tokens
- Braintrust suite passes after every MCP/tool-surface change

## Decision

Short term: keep reviewers in Dify and use Claude Code as operator support.

Medium term: implement the URL/page/script probe tools inside `webflow-template-review-mcp` so Dify no longer depends on Claude Code for the skill's local checks.

Long term: package the Claude Code plugin for internal operators and reviewer power users only.
