# LinkedIn Post: Webflow Analyzer 01 - The Website Was Only One Source of Truth

**Campaign:** Webflow Analyzer Series
**Target:** LinkedIn (Personal - Micah)
**Type:** Longform post + static diagram
**Asset:** `packages/agency/static/social/linkedin-webflow-analyzer-multi-surface.png`
**Source Asset:** `packages/agency/static/social/linkedin-webflow-analyzer-multi-surface.png`
**Graphic Brief:** `packages/agency/static/social/linkedin-webflow-analyzer-multi-surface-brief.md`
**CTA:** createsomething.io/papers/analyzer-mcp-review-architecture

---

## Post

I think one of the easiest mistakes in workflow automation is pretending the website is the whole system.

That sounds obvious when you say it out loud.

But a lot of review tools still act like if they can crawl the published page, they understand the whole job.

Working on Webflow review forced me to stop thinking that way.

The published site is only one source of truth.

You also have:
- the Designer, where structure and component hygiene actually live
- the policy, which sits outside the codebase and can change underneath you

If you only look at the page, you miss authoring reality.

If you only look at the Designer, you miss runtime reality.

If you ignore policy provenance, you cannot explain what rules you actually used.

That was the real turning point for me.

The interesting move was not "build a better crawler."

It was admitting that review spans multiple truth surfaces, then building the system around that fact.

That is when the analyzer started becoming useful.

I wrote up the architecture because I think this pattern shows up in a lot more places than Webflow.

Any messy workflow with real stakes usually has the same problem:
the truth is split across more than one surface.

---

## Comment (Post after publishing)

Paper: createsomething.io/papers/analyzer-mcp-review-architecture

The shortest version:
published state, authoring state, and policy state are not the same thing.

#WorkflowDesign #MCP #Webflow #SystemsThinking #AgentEngineering

---

## Voice Compliance

- [x] Personal, builder-led voice
- [x] Clear by line 2 for non-technical readers
- [x] Low-jargon framing with one simple core claim
- [x] No "AI replaces review" language
- [x] Explains the architectural move, not just the tool

---

## Asset Notes

- Keep the graphic simple and monochrome.
- Three labeled columns are enough:
  - `Published Site`
  - `Designer State`
  - `Policy Snapshot`
- Avoid product screenshots on this one. The point is the model, not the UI.

---

## Repo Anchors

- `packages/io/content/papers/analyzer-mcp-review-architecture.md`
- `packages/webflow-site-analyzer-mcp/README.md`
- `packages/io/content/experiments/webflow-analyzer-lineage.md`

---

## Posting Notes

- Post 1 of 4
- Best fit: weekday morning
- Best audience: workflow owners, product-minded operators, design systems leads
