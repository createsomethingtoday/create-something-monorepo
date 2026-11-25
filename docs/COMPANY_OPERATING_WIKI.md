# How CREATE SOMETHING works

Start with the decision someone needs to make. What can we claim about a build? Is a fix ready to ship? Did a post go out? Is a market signal worth testing? Each question has a different source of truth.

Use **Database / Automation / Judgment** to locate the work. Database tells you what was recorded, Automation tells you which operation ran, and Judgment tells you who can approve the next action. For example, a delivery receipt can support a claim that a workflow ran. Permission to name the client in a campaign comes from the client’s release terms. [Three-Tier Framework](THREE_TIER_FRAMEWORK.md) · [Agent-Run Receipt Charter](AGENT_RUN_RECEIPT_CHARTER.md)

## Marketing

Start with a reader, one real build, and one claim the reader can check. Read the underlying artifact and its claim limits. Use the property guide to choose where the story belongs and the distribution playbook to prepare a source card. Write down what changed for the person doing the work, the evidence, the approved public details, and the next action for the reader. If all you have is a demo, describe what the demo showed. A production outcome needs production evidence. [Property intent and audience](PROPERTY_INTENT_FUNNEL.md) · [Newsletter distribution playbook](guides/NEWSLETTER_DISTRIBUTION_PLAYBOOK.md)

The template-review field report gives a worked example. Automation assembled evidence packets for 49 of 50 selected cases. Reviewers owned the decision, and the evaluation did not measure time saved. The November 21 newsletter session reused that distinction when planning its ad. Recover the editorial rationale with `ctx show event c41e71ed --window 0` and check the field report before reusing the numbers. [Field report source](../packages/agency/src/routes/field-reports/template-review/+page.svelte)

## Development

Start with the reported behavior and the checkout that owns it. For tracked work, read the Linear issue for scope and acceptance. Locate the record, trace the operation, and inspect the governing policy. For a bug, exercise the failing case before editing and repeat it through the normal entry point after the fix. Record the revision, observed result, and environment. For UI, inspect the rendered experience. For an authorized release, verify the shipped artifact at its destination and attach the receipt and rollback path to the issue. [Repository workflow](../AGENTS.md) · [Delivery policy](guides/GIT_LIGHT_AGENT_DELIVERY_WORKFLOW.md)

## Socials

Start with the requested channel, account, and stage. Adapt one verified field note to the channel. On X, for example, a short reproducible example gives builders something to try and discuss. A dated campaign is a worked example; read the current account or scheduler for today’s queue. For an authorized schedule, check the saved copy, media, link, time and timezone in the native queue. For a published post, read back the public URL. If a write times out, look for the existing post before retrying. Record replies that show what a reader tried or misunderstood alongside any reach figures. [Worked X example](marketing/X_COMMUNITY_EXPERIMENT_2026_09.md) · [Channel roles and receipts](guides/NEWSLETTER_DISTRIBUTION_PLAYBOOK.md)

### Make the visual

Start with the project and the current design for the publishing account. A historical brand kit can identify owned artwork. Before using its layout, compare it with the latest adopted design in the owning repository and the live surface. Record the revision or asset receipt in the brief. On November 20 the retained Agency pages adopted warm paper and editorial serif headings. A company post can use that framing while preserving the project’s native interface. [Agency editorial change](https://github.com/createsomethingtoday/create-something-monorepo/commit/18eb4c2ed89e0fe181a292dc76ec232c89e049a3)

Choose a project with a specific story and a source cleared for the intended audience. GiGi’s public beta walkthrough supplies real frames of a synthetic workspace. For Goldin, the standalone portal’s README identifies private Half Dozen client source and a staging environment. Check the engagement owner’s public-use terms for the specific image and claim before using them in company marketing. [GiGi public walkthroughs](https://createsomething.agency/gigi/beta)

Decide what the reader needs to see. A text-only post can stand on its own. For a claim about a product screen, capture the actual screen, remove private details, and retain the source. For an illustrated company social, use the current felt workshop direction. The `felt-collage-lessons` skill supplies the character reference and reusable scenes: charcoal wool, a stitched face, cream eyes, and a pale wool antenna tip. Compare the finished scene with that reference at feed size. Check the illustration separately from the editorial type and paper color; the retired graphite robot also appears in older, branded assets. A product demonstration can still use an actual screen capture. When a different scene is needed, brief the new still against owned character and material references, generate it with OpenAI image generation, then typeset exact claims separately. Use the `create-something-brand-materials` skill for compositions, editable briefs, and export recipes. [Brand direction](CREATE_SOMETHING_MEASURED_WHIMSY_FOUNDATION.md) · [Screenshot workflow](guides/MARKETING_SCREENSHOT_IMAGE_WORKFLOW.md)

Hand over the channel and account, caption, alt text, final export, editable source, and a note identifying the artwork and the evidence behind the claim. Open the export at full size and at feed size. Can a reader understand the claim and its limits? Are the key words, faces, and gestures visible? Keep the reviewed copy and image together when requesting publication approval. [Example GiGi LinkedIn graphic](examples/social-gigi/gigi-task-review.png) · [Caption, alt text, evidence and editable source](examples/social-gigi/README.md)

## Future casting

Start with a dated signal from a customer, a shipped system, or a primary external source. Compare it with the company thesis and its evidence. Write a short hypothesis with a time horizon, an alternative explanation, and an observation that would change your mind. End with a small test, a decision owner, and a date or event for revisiting the result. Keep speculative claims out of public case studies until evidence supports them. [Company thesis](CREATE_SOMETHING_SYSTEMS_THESIS.md) · [Claim evidence](CREATE_SOMETHING_SYSTEMS_THESIS_EVIDENCE.generated.md)

For example, if two prospects ask who approved an automated action, one hypothesis is that approval history will matter in the next buying cycle. Both prospects could also be responding to the same temporary audit. In the next three discovery calls, ask for a recent buying decision where approval history mattered. The person running discovery can then decide whether to test new positioning. This is an illustrative scenario.

When a workflow already works, ask which step could disappear, move earlier, or pass to someone better placed to act. The [template validator and Ground replay](guides/LEARNING_FROM_SHIPPED_WORK.md) shows how to turn that question into a small experiment.

## Turn a correction into company knowledge

Use the [wiki-maintainer skill](../.agents/skills/wiki-maintainer/SKILL.md) to trace a missed decision or source change and replay the task with a fresh agent.

1. **Capture the decision.** In the work record, note the original assumption, the correction, who made it, when, and the evidence. For earlier rationale, search CTX by a distinctive phrase and inspect the event. Check the owning source for current facts.
2. **Choose where the lesson belongs.** Change a recurring procedure in its playbook or skill. Change a durable company definition in its owning document. Keep a one-off client exception in the client’s authorized workspace. For fast-changing values such as queue times, document how to retrieve them.
3. **Check the scope with the owner.** One correction can settle one assignment. To generalize it, show where else it applies, its exceptions, and which earlier guidance it supersedes. Keep an unconfirmed interpretation with the work as a hypothesis.
4. **Try it on the next case.** Give an agent the original question and the revised entry point. Check whether it finds the source, makes the intended decision, and stops at the right approval boundary. If it still guesses, repair the route or example and try again.

For example, if a draft describes a scheduled post as published, check the queue receipt, correct the draft, and point the agent to the distribution playbook’s publication check. On the next scheduled-only example, the agent should report the scheduled time and leave the public URL pending. Update the owning playbook only if its existing wording leaves that distinction unclear.

This learning loop adapts Harrison Chase’s account of how agents reuse curated knowledge from prior work. [How to build a knowledge factory](https://x.com/hwchase17/status/2124181216719151585)
