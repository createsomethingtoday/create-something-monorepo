# “Deployed” is only one step

A successful upload tells you where the artifact went. It does not tell you what your customer sees.

We ran into that distinction while publishing the CREATE SOMETHING newsletter archive. The first Cloudflare upload succeeded, but it created a preview deployment for our feature branch. The public domain had not changed.

That receipt was accurate. We would have been wrong to read it as proof that the archive was live.

We promoted the artifact to production using the merged commit, then checked the public archive, the edition, the sitemap, and the rendered page. Each check answered a different question.

## Name the state you can prove

Keep a small chain beside the work:

1. **Authored:** the artifact exists.
2. **Reviewed:** it passed the declared checks and review.
3. **Merged:** the accepted change is in the canonical source.
4. **Deployed:** the production runtime accepted that artifact.
5. **Observed:** the intended surface behaves as expected.

These labels fit our software workflow. Adapt them to yours. For an email, provider acceptance, delivery, inbox placement, and a reader’s response are separate observations too.

A receipt needs six fields: the artifact, its current state, the evidence, when it was observed, who owns it, and the next check.

For our first upload, that last field would have said: **verify the canonical domain**. It makes the remaining work visible before someone closes the task.

## AI & Systems news

Three related developments from September 1–2 explain why these distinctions matter. Availability checked September 7.

### Webflow Source puts agents closer to the code

[Source by Webflow](https://webflow.com/source) brings teams and agents into a shared workspace that works directly on real code. It remains a **limited research preview**.

**Why it matters:** shared code gives the team a common artifact to inspect. You still need to verify which version reached the destination and what it does there.

### Fable 5.1 extends long-running agent work

[Anthropic’s Fable 5.1 release](https://www.anthropic.com/claude-fable-and-mythos-5-1) targets demanding coding and knowledge work, with lower cache-read costs. Anthropic also reports remaining cases of approval bypass and gaps in its evaluation coverage.

**Why it matters:** longer runs make durable checkpoints more useful. A progress update should help you follow the work; acceptance still needs evidence from the system being changed.

### Webflow announces more agent access and visibility

[Webflow’s September 2 announcement](https://www.globenewswire.com/news-release/2026/09/02/3355326/0/en/webflow-unveils-agentic-platform-source-by-webflow.html) describes expanded MCP capabilities for interactions, CMS work, and Cloud deployments, plus activity-log visibility for agent changes. The announcement places these additions later in September or during the month; it does not establish that every feature is available today.

**Why it matters:** an activity log can show who changed something. Pair it with a check of the published result before treating the work as complete.

## Try this on the next handoff

Take one task marked “done.” Ask which state the attached evidence actually proves, and write down the next check if one remains.

Our archive example establishes a specific delivery mistake and the checks that resolved it. It does not establish that this state chain catches every defect, or that an observed page proves the broader business outcome.

[Use the Proof Surface template →](https://createsomething.io/papers/proof-surface?utm_source=newsletter&utm_medium=email&utm_campaign=2026-09-10-deployed-is-only-one-step&utm_content=primary-cta)

— CREATE SOMETHING
