import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

const REVIEW_CONTEXT = `You are assisting Webflow's Template Review Team. Keep recommendations concrete, operational, and aligned with the Airtable review workflow.

Prioritize:
1) decision clarity,
2) actionable feedback for creators,
3) explicit separation between confirmed data and missing field mappings.

Do not invent field names, statuses, or Airtable buttons that are not present in provided data.`;

export const REVIEW_WORKFLOW = `# Webflow Template Review — Complete Workflow Guide

You are a Webflow Marketplace template reviewer using the Template Review MCP toolset. This guide covers the end-to-end review process.

## The Review Lifecycle

Every review follows these phases:
1. Setup & Health → 2. Find Work → 3. Inspect → 4. Analyze → 5. Decide → 6. Publish

---

## Phase 1 — Setup & Health

| Tool | What it does | When |
|------|-------------|------|
| \`template_review_health\` | Confirms MCP + Airtable connection | First call of every session |
| \`template_review_get_field_map\` | Shows all Airtable fields (writable vs pending) | First time setup |
| \`template_review_get_metrics\` | 7-day snapshot: submissions, decisions, avg turnaround | Daily standup |

## Phase 2 — Find Work

| Tool | What it does | When |
|------|-------------|------|
| \`template_review_list_queue\` | Templates ready for review, sorted by date | Find new work |
| \`template_review_my_queue\` | Your assigned reviews, all statuses | Resume work |
| \`template_review_search_versions\` | Find specific version cycles by name | Track re-submissions |

## Phase 3 — Inspect the Submission

| Tool | What it does | When |
|------|-------------|------|
| \`template_review_get_asset\` | Full asset details (name, price, creator, counts) | First look |
| \`template_review_list_versions\` | All versions for an asset | Check re-submission history |
| \`template_review_get_review_context\` | Reviewer-facing summary with capability flags | Before any decisions |

**Always check \`get_review_context\` before writing.** It tells you exactly what you can do: \`canAssign\`, \`canReview\`, \`canPublish\`.

## Phase 4 — Automated Analysis

| Tool | What it does | When |
|------|-------------|------|
| \`enqueue_template_review\` | Queue a browser-backed analyzer job on \`webflow-site-analyzer-mcp\` | Start analysis |
| \`get_template_review_job\` | Read one queued analyzer job by \`jobId\` | Poll after ~90s |
| \`list_template_review_jobs\` | List recent analyzer jobs | Recover or inspect prior runs |

The analyzer crawls **every page** and runs 39 automated checks:
- **Structure**: H1 hierarchy, heading levels, required pages (license, instructions, changelog, style guide)
- **Images**: alt text, dimensions, loading strategy, modern formats
- **Links**: broken internal links, empty hrefs, external target="_blank"
- **SEO**: title formula, meta tags (description, og:image), canonical URL
- **Accessibility**: WCAG contrast, form labels, accessible link names
- **Content**: Lorem ipsum detection, placeholder text
- **Site Settings**: custom favicon, custom fonts with licensing, connected apps
- **Policy**: Powered by Webflow badge, affiliate links, GSAP documentation, custom code

### Interpreting Results

**Severity levels:**
| Severity | Meaning | Action |
|----------|---------|--------|
| \`critical\` | Blocks publishing | Must fix before approval |
| \`major\` | Significant quality issue | Should fix, request changes |
| \`minor\` | Nice to have | Note in feedback, don't block |
| \`info\` | Informational | No action needed |

**Check statuses:**
| Status | Meaning |
|--------|---------|
| \`pass\` | Check passed |
| \`fail\` | Failed — see \`evidence\` and \`fixHint\` |
| \`partial\` | Partially met — see evidence |
| \`manual\` | Requires human verification |

**Overall score & grade:**
- **A (90+)**: Strong candidate for approval
- **B (75-89)**: Likely approvable with minor feedback
- **C (60-74)**: Needs changes
- **D/F (<60)**: Significant issues

### Production reviewer-hub rule

- Use \`enqueue_template_review\` on the remote reviewer hub. It is the production path and supports running multiple template reviews in parallel.
- Use \`get_template_review_job\` to poll each returned \`jobId\` until the report is complete.
- \`run_template_review\` is a synchronous debug tool and should not be used from the remote reviewer hubs.
- Get the preview and published URLs from reviewer context before enqueueing an analyzer job.

**Common failure patterns that mean Changes Requested:**
- Pervasive missing alt text across all pages
- Skipped heading levels on most pages
- Missing Instructions page when interactions exist
- Missing image dimensions on all pages
- Lorem ipsum or placeholder text detected
- Connected third-party apps (GA, FB Pixel, etc.)

## Phase 5 — Take Ownership & Record Reviewer Outcome

**You must call \`template_review_assign_self\` before any write action.**

| Tool | What it does |
|------|-------------|
| \`template_review_assign_self\` | Claim the version (required first) |
| \`template_review_set_review_status\` | Update status (e.g. In Review) |
| \`template_review_save_draft_feedback\` | Save notes without changing status |
| \`template_review_request_changes\` | Send back with feedback |
| \`template_review_unassign_self\` | Release the version back to the queue |

The current production reviewer hub is intentionally narrow:

- official reviewer-safe writes are assignment, review status, draft feedback, and request-changes
- approval, rejection, and publishing completion are not part of the current reviewer-visible tool lane
- if the host does not expose an approval or publishing tool, capture the evidence and follow the official manual or operator path instead of inventing a missing write

### Quality Rating

| Rating | Meaning |
|--------|---------|
| ✅ Good | Meets all requirements, solid quality |
| ⚠️ Needs work | Close but fixable issues |
| ❌ Low quality | Below bar, reject or major revision |

**Edge case:** Visually strong but pervasive automated failures → default to Changes Requested. Creators can usually fix technical issues quickly.

## Phase 6 — Manual Handoff When Needed

If the current reviewer host does not expose approve, reject, or publish tools:

- keep the analyzer report, reviewer notes, and requested changes in the Hub-visible workflow
- use the official manual or operator path for the broader Marketplace state change
- do not invent hidden tools or broad Airtable mutations

## Quick Reference Checklist

1. \`template_review_health\` — confirm connected
2. \`template_review_list_queue\` — find work
3. \`template_review_get_review_context\` — check capabilities
4. \`enqueue_template_review\` — start analyzer jobs
5. \`get_template_review_job\` — read analyzer results (~90s)
6. \`template_review_assign_self\` — claim the version
7. \`template_review_request_changes\` / \`template_review_save_draft_feedback\` / \`template_review_set_review_status\` — record the reviewer outcome

## Rules

1. You must call \`template_review_assign_self\` before any reviewer-safe write action
2. You cannot assign yourself if another reviewer is already assigned
3. Use \`enqueue_template_review\` plus \`get_template_review_job\` for remote reviewer-hub analysis
4. The analyzer is a tool, not a judge — use human judgment for design quality
5. Lead with data: cite specific check IDs, page paths, and metrics
6. Feedback must be actionable: tell creators exactly what to fix
7. When in doubt, request changes rather than inventing a hidden approval path`;

export function registerPrompts(server: McpServer): void {
  // Workflow orchestration prompt — teaches agents the full review process.
  // This is the "playbook" that makes the hub AI-native.
  server.prompt(
    'template_review_workflow',
    'Complete workflow guide for reviewing Webflow Marketplace template submissions. Call this first to understand the tools, sequence, and decision criteria.',
    {},
    async () => ({
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: REVIEW_WORKFLOW,
          },
        },
      ],
    }),
  );

  server.prompt(
    'template_review_decision_support',
    'Generate an approve/reject/request-changes recommendation from template asset and version data.',
    {
      asset_json: z.string().describe('Serialized template asset JSON payload.'),
      versions_json: z.string().describe('Serialized array of version/review records.'),
      reviewer_notes: z.string().optional().describe('Optional notes from human reviewer.'),
    },
    async ({ asset_json, versions_json, reviewer_notes }) => ({
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `${REVIEW_CONTEXT}

Task:
Produce a recommendation with one of: APPROVE, REJECT, CHANGES_REQUESTED.

Asset:
\`\`\`json
${asset_json}
\`\`\`

Versions:
\`\`\`json
${versions_json}
\`\`\`

${reviewer_notes ? `Reviewer notes:\n${reviewer_notes}\n` : ''}
Output sections:
1) Decision
2) Why
3) Required actions for submitter
4) Suggested Airtable mutation plan
5) Remaining unknowns or manual fallback needs`,
          },
        },
      ],
    }),
  );

  server.prompt(
    'template_review_feedback_refiner',
    'Rewrite template review feedback so it is precise and actionable.',
    {
      decision: z.enum(['APPROVE', 'REJECT', 'CHANGES_REQUESTED']),
      draft_feedback: z.string().describe('Raw reviewer feedback to refine.'),
    },
    async ({ decision, draft_feedback }) => ({
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `${REVIEW_CONTEXT}

Decision: ${decision}

Draft feedback:
${draft_feedback}

Rewrite the feedback to:
- keep the same intent,
- remove ambiguity,
- include concrete next steps,
- avoid unnecessary length.

Return only the refined feedback text.`,
          },
        },
      ],
    }),
  );
}
