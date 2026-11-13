---
name: review-evidence-collected
kind: responsibility
version: 0.1.0
id: 01M58T5M4W8MTY3JM903F4EESB
---

# Review Evidence Collected

> Automation tier. Collects published-site and Designer evidence for each
> queued version. Each version runs in its own session, so raw validator
> output, screenshots, and stylesheets stay out of the main context. First
> reviews collect everything and read the screenshots, so they run on Sonnet.
> Re-reviews recheck only the items cited in the last round and run on Haiku.

### Goal

Every queued version without a `skip_reason` has an evidence bundle that is
enough to stage a verdict, with each finding labeled Auto, Partial, or Manual.

### Requires

- `queue`: the reviewer's versions with context and recheck items.
  *(Maintained by `review-queue-loaded`.)*

### Maintains

**Type**:

- `evidence`: list of `{ version_id, coverage, findings, gallery_url,
  designer, errors }` where `coverage` is `partial_published_site_validation`
  unless a fuller artifact exists, each finding is `{ item, label, claim,
  evidence_ref, status }` with `label` one of `Auto`, `Partial`, `Manual` and
  `status` one of `open`, `resolved`, `withdrawn`, and `designer` is the
  `designer-pass` result or null.

**Canonicalization spec**: version ids and each finding's `item`, `label`,
and `status` are material. Gallery URLs, timings, and raw tool output are
immaterial.

**Postconditions**:

- Automated analysis uses only the published `*.webflow.io` URL. Preview
  URLs and Designer data never go into validator or sandbox input.
- Every finding cites concrete evidence: a crawl path, visible text, a
  selector, or a saved artifact path in the run directory.
- Every finding has passed `screen-false-positives`. Withdrawn findings stay
  in the bundle with the reason, so the verdict can withdraw an earlier ask.
- On a re-review, each `prior_cited_items` entry has a finding with status
  `resolved` or `open`.

### Continuity

- **input-driven**: the `queue` fingerprint moved.

### Tools

- `mcp:claude_ai_Template_Review_MCP`: `template_review_run_published_site_validation`,
  `template_review_capture_published_site_screenshots`,
  `template_review_fetch_published_site_stylesheet`,
  `template_review_run_published_site_sandbox`
- `cli:curl`: static HTML fetches for `href="#"`, label, and heading checks

### Invariants

- Read-only. No template_review write tool is called.
- The brief each session reads is `workspace/collector-brief.md` in the run
  directory, written from this contract; it carries the checks, the
  false-positive rules, and the output schema.
- Published sites are never screenshotted with a code-execution sandbox
  browser; the MCP capture tool is the screenshot path.
- Sandbox console errors seen under a request cap are rerun per page
  (`max_pages: 1`) before they become a finding.
- Blank mid-page screenshot segments are recaptured with `settle_ms: 6000`
  before they become a finding.

### Shape

- `self`: run validation, capture, read CSS, run the collector, grep static
  HTML, screen findings.
- `delegates`:
  - `designer-pass`: Designer-only checks through ego-browser
  - `screen-false-positives`: known false-positive rules
- `prohibited`: any decision, status, ticket, Admin, or Airtable write.

### Execution

```prose
agent collector:
  model: sonnet
  prompt: "You collect template review evidence for one first-review version. Use the Template Review MCP read tools and curl. Look at the captured screenshots and record visual observations. Save raw output under the run directory. Return compact findings with evidence references, never raw payloads."
  shape:
    self: ["published-site validation", "screenshots", "stylesheet", "sandbox", "static HTML checks"]
    prohibited: ["any template_review write tool", "Airtable writes", "Preview URLs as analysis input"]

agent rechecker:
  model: haiku
  prompt: "You recheck the items cited in the last Changes Requested round for one version. Use the Template Review MCP read tools and curl. Save raw output under the run directory. Return each cited item as resolved, open, or withdrawn with evidence, never raw payloads."
  shape:
    self: ["ticket thread", "cited items", "static HTML checks"]
    prohibited: ["any template_review write tool", "Airtable writes", "Preview URLs as analysis input", "full screenshot or sandbox passes"]

let active = session "Return the queue entries whose skip_reason is null."
  context: queue

let bundles = []
parallel for entry in active (on-fail: "continue"):
  let raw = null
  if entry.status == "response_to_review":
    raw = session: rechecker
      prompt: "Recheck only entry.prior_cited_items and anything those fixes could break. Compare Last Published with the last Changes Requested date. Return findings."
      context: entry
      retry: 1
      backoff: linear
  else:
    raw = session: collector
      prompt: "Run the full published-site pass: validation, desktop and mobile screenshots, stylesheet summary, sandbox collector, href=# and label checks per page. Return findings and the gallery_url."
      context: entry
      retry: 1
      backoff: linear

  let designer = null
  if entry.needs_designer_pass:
    designer = call designer-pass
      preview_url: entry.preview_url
      checks: entry.prior_cited_items

  let screened = call screen-false-positives
    findings: { raw, designer }
    published_url: entry.published_url
    asset_id: entry.asset_id

  bundles = bundles with { version_id: entry.version_id, raw, designer, screened }

return { evidence: bundles }
```

### Runtime

- `persist`: project
