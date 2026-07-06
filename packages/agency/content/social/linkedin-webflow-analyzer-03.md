# LinkedIn Post: Webflow Analyzer 03 - Policy Should Be Fetched, Hashed, And Named

**Campaign:** Webflow Analyzer Series
**Target:** LinkedIn (Personal - Micah)
**Type:** Longform post + provenance diagram
**Asset:** `packages/agency/static/social/linkedin-webflow-analyzer-policy-provenance.png`
**Source Asset:** `packages/agency/static/social/linkedin-webflow-analyzer-policy-provenance.png`
**Graphic Brief:** `packages/agency/static/social/linkedin-webflow-analyzer-policy-provenance-brief.md`
**CTA:** createsomething.io/papers/analyzer-mcp-review-architecture

---

## Post

If your workflow depends on rules that live on someone else's website, I do not think you have real governance until you can name the version you used.

This came up very directly in Webflow review.

The submission rules and rubric do not live inside our codebase.

So "the agent used the latest rules" is not actually a very good answer.

Latest when?
From where?
Which text?
What changed?

That is why I think policy should be treated like data:

- source URL
- fetch timestamp
- content hash
- derived policy version

Once you do that, the conversation changes.

You stop saying:
"the model reviewed this against the guidelines."

You can start saying:
"this review used this policy snapshot, fetched at this time, normalized from these sources."

That is a much stronger system.

Not because it sounds more technical.

Because it is more legible.

If external policy matters, burying it in prompt text is not enough.

You need provenance.

I think this applies way beyond Webflow.

Any workflow that depends on vendor policy, compliance text, marketplace rules, or operating guidelines eventually hits the same wall:
you need to know which rules were in force when the decision was made.

---

## Comment (Post after publishing)

This is one of the biggest differences between "prompting a workflow" and actually governing one.

If the rule can change upstream, provenance has to become part of the system.

#PolicyAsArtifact #MCP #WorkflowGovernance #SystemsDesign #AIEngineering

---

## Voice Compliance

- [x] Clear, direct claim in the first sentence
- [x] Builder-led voice, not compliance theater
- [x] Low jargon relative to topic
- [x] Concrete mechanism instead of abstract governance talk
- [x] Framed for operators and technical leads

---

## Asset Notes

- Show a left-to-right provenance chain:
  - `Guideline URL`
  - `Fetched At`
  - `Content Hash`
  - `Policy Version`
- Keep the graphic closer to an evidence chain than a product diagram.

---

## Repo Anchors

- `packages/webflow-site-analyzer-mcp/src/policy/index.ts`
- `packages/io/content/papers/analyzer-mcp-review-architecture.md`
- `specs/webflow-analyzer-series.md`

---

## Posting Notes

- Post 3 of 4
- Best posted after the multi-surface and manual-state posts
- Best audience: technical founders, compliance-minded operators, platform teams
