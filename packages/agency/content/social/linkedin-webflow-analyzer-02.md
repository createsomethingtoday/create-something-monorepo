# LinkedIn Post: Webflow Analyzer 02 - Manual Is A First-Class Review State

**Campaign:** Webflow Analyzer Series
**Target:** LinkedIn (Personal - Micah)
**Type:** Longform post + simple graphic
**Asset:** `packages/agency/static/social/linkedin-webflow-analyzer-manual-state.png`
**Source Asset:** `packages/agency/static/social/linkedin-webflow-analyzer-manual-state.svg`
**Graphic Brief:** `packages/agency/static/social/linkedin-webflow-analyzer-manual-state-brief.md`
**CTA:** createsomething.io/papers/analyzer-mcp-review-architecture

---

## Post

I think a lot of automation gets less trustworthy right at the moment it tries to sound the most confident.

Everything becomes pass or fail.

That looks clean in a demo.

It is not how real review works.

One of the most useful design decisions in the Webflow analyzer was treating **manual** as a real answer.

Not a fallback.
Not an error.
Not an embarrassment.

A real state.

Because some checks genuinely do have an evidence boundary.

The system can:
- pass what it can justify
- fail what it can justify
- stop and say manual when the claim would be too weak

That sounds small, but I think it changes the trust profile of the whole workflow.

The reviewer can see where automation is helping.

They can also see where it is intentionally refusing to bluff.

That is a much better relationship than an agent pretending it knows more than it does.

For me, this is one of the clearest signs that a workflow tool is maturing:

it stops trying to win by looking fully autonomous.

It starts winning by being explicit about where judgment still belongs.

I would rather use a system that is narrow and honest than one that is broad and theatrical.

---

## Comment (Post after publishing)

One of my favorite questions for any workflow tool is:

where is it still allowed to say "manual"?

If the answer is nowhere, I usually trust it less.

#HumanInTheLoop #WorkflowDesign #AI #ReviewSystems #CreateSomething

---

## Voice Compliance

- [x] Personal, builder-led voice
- [x] Concrete, non-hyped framing
- [x] Explicitly values bounded automation over autonomy theater
- [x] High-school senior readable
- [x] Self-contained without needing protocol background

---

## Asset Notes

- Use a simple three-state diagram:
  - `Pass`
  - `Fail`
  - `Manual`
- The visual should make `Manual` feel intentional, not degraded.
- Keep it diagrammatic, not screenshot-heavy.

---

## Repo Anchors

- `packages/io/content/papers/analyzer-mcp-review-architecture.md`
- `packages/webflow-site-analyzer-mcp/src/checklist/designer-checklist.ts`
- `specs/webflow-analyzer-series.md`

---

## Posting Notes

- Post 2 of 4
- Best posted 2-4 days after post 1
- Best audience: operators, QA leads, workflow automation buyers
