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
| \`template_review_enqueue_analyzer_review\` | Queue browser-backed analysis | Start analysis |
| \`template_review_get_analyzer_review\` | Get results for a specific job | Poll after ~90s |
| \`template_review_list_analyzer_reviews\` | List all jobs for a version | Check prior runs |

The analyzer crawls **every page** and runs 39 automated checks:
- **Structure**: H1 hierarchy, heading levels, required pages (license, instructions, changelog, style guide)
- **Images**: alt text, dimensions, loading strategy, modern formats
- **Links**: broken internal links, empty hrefs, external target="_blank"
- **SEO**: title formula, meta tags (description, og:image), canonical URL
- **Accessibility**: WCAG contrast, form labels, accessible link names
- **Content**: Lorem ipsum detection, placeholder text
- **Site Settings**: custom favicon, custom fonts with licensing, connected apps
- **Policy**: Powered by Webflow badge, affiliate links, GSAP documentation, custom code

Required utility pages do **not** need root-only slugs. License, Instructions, Changelog, and Style Guide pages may be nested in folders when they are discoverable, return 200, and visible links point to the matching utility page. Flag missing pages, broken pages, missing required license text, or utility links that point to unrelated pages.

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

**Common failure patterns that mean Changes Requested:**
- Pervasive missing alt text across all pages
- Skipped heading levels on most pages
- Missing Instructions page when interactions exist
- Missing image dimensions on all pages
- Lorem ipsum or placeholder text detected
- Connected third-party apps (GA, FB Pixel, etc.)

## Phase 5 — Take Ownership & Decide

**You must call \`assign_self\` before any write action.**

| Tool | What it does |
|------|-------------|
| \`template_review_assign_self\` | Claim the version (required first) |
| \`template_review_set_review_status\` | Update status (e.g. In Review) |
| \`template_review_save_draft_feedback\` | Save notes without changing status |
| \`template_review_request_changes\` | Send back with feedback |
| \`template_review_approve_version\` | Approve |
| \`template_review_reject_version\` | Reject with reasons |

### Decision Guide

**APPROVE** if: No critical failures, few major failures, grade B+, design quality is "Good", responsive works.

**REQUEST CHANGES** if: Any critical failures, 3+ major failures, missing required pages, placeholder content, connected apps, design below "Good".

**REJECT** if: Fundamentally below bar, non-functional, guidelines violated.

### Quality Rating

| Rating | Meaning |
|--------|---------|
| ✅ Good | Meets all requirements, solid quality |
| ⚠️ Needs work | Close but fixable issues |
| ❌ Low quality | Below bar, reject or major revision |

**Edge case:** Visually strong but pervasive automated failures → default to Changes Requested. Creators can usually fix technical issues quickly.

## Phase 6 — Publishing (after approval)

| Tool | What it does |
|------|-------------|
| \`template_review_list_releases\` | Available releases to attach |
| \`template_review_update_asset_metadata\` | Update name, description, thumbnails |
| \`template_review_update_asset_publishing\` | Update MRP ID override |
| \`template_review_complete_publishing\` | Mark checklist complete + attach release |

## Quick Reference Checklist

1. \`template_review_health\` — confirm connected
2. \`template_review_list_queue\` — find work
3. \`template_review_get_review_context\` — check capabilities
4. \`template_review_enqueue_analyzer_review\` — start analysis
5. \`template_review_get_analyzer_review\` — read results (~90s)
6. \`template_review_assign_self\` — claim the version
7. \`template_review_request_changes\` / \`approve_version\` / \`reject_version\` — decide

## Rules

1. You must call \`assign_self\` before any write action
2. You cannot assign yourself if another reviewer is already assigned
3. \`canPublish\` is only true after approval
4. The analyzer is a tool, not a judge — use human judgment for design quality
5. Lead with data: cite specific check IDs, page paths, and metrics
6. Feedback must be actionable: tell creators exactly what to fix
7. When in doubt, request changes rather than rejecting`;

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
