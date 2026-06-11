# Webflow Template Review Dify Agent Manual

Plain-language guide for the Natalia, Mariana, Eric, and Vicki Webflow Template Review agents in Dify.

## Start Here

The Dify agent is a review assistant. It helps you find template submissions, check public-site evidence, draft feedback, and prepare review actions.

The human reviewer still makes the decision. The agent should not approve, reject, request changes, publish, or save feedback unless the reviewer clearly asks for that exact action.

## Updating The Live Dify Agents

For instruction-only changes, update the existing Natalia, Mariana, Eric, and Vicki Dify apps in place. Do not delete the current apps, and do not create replacement imports just to change prompt policy. Keeping the existing apps preserves the current app IDs, Service API keys, chat URLs, Infisical references, eval bindings, and reviewer workflows.

Use the checked-in manifest prompt as the source of truth:

| Agent   | Source prompt |
| ------- | ------------- |
| Eric    | `config/dify-agents/eric-hub.json#agent_prompt` |
| Natalia | `config/dify-agents/natalia-hub.json#agent_prompt` |
| Mariana | `config/dify-agents/mariana-hub.json#agent_prompt` |
| Vicki   | `config/dify-agents/vicki-hub.json#agent_prompt` |

To print a paste-ready prompt for one agent:

```bash
node -e 'const fs = require("fs"); const manifest = JSON.parse(fs.readFileSync("config/dify-agents/eric-hub.json", "utf8")); console.log(manifest.agent_prompt);'
```

Replace `eric-hub.json` with the target reviewer manifest.

Manual update flow for the current XML-style Dify Instructions field:

1. Open the existing Dify app.
2. Confirm the Instructions field still includes the XML wrapper, Dify variables, `output_format`, and examples.
3. Do not replace the whole field with the compact `agent_prompt` if that wrapper is present.
4. Patch only the intended policy paragraphs from the current `agent_prompt`. Current required policy areas include placeholder/utility-page boundaries, homepage SEO title formula, E2B sandbox evidence, direct Zendesk ticket actions, and the scratchpad/output guard.
5. Preserve the XML wrapper, variables, output format, examples, tool list, model settings, visibility, and API keys.
6. Save or publish the existing app.
7. Export the app DSL from Dify Studio.
8. Reconcile the exported DSL back into `config/dify-agents/{agent}.dify.yml` if Dify rewrites the saved app.
9. Confirm the app is using `claude-fable-5`, the Anthropic provider dependency, E2B built-ins, and Zendesk Get Ticket, Add Comment, and Update Ticket/status.
10. Run `pnpm dify:inventory:check`, `pnpm dify:reviewer-hubs:smoke`, and `pnpm braintrust:eval:dify:reviewer-hubs:local`.

If the live Instructions field is already a plain compact prompt with no XML wrapper:

1. Open the existing Dify app.
2. Paste the current `agent_prompt` into the app instructions/pre-prompt field.
3. Leave tools, MCP server cards, model settings, visibility, and API keys unchanged unless the change explicitly covers them.
4. Save or publish the existing app.
5. Export the app DSL from Dify Studio.
6. Reconcile the exported DSL back into `config/dify-agents/{agent}.dify.yml` if Dify rewrites the saved app.
7. Confirm the app is using `claude-fable-5`, the Anthropic provider dependency, E2B built-ins, and Zendesk Get Ticket, Add Comment, and Update Ticket/status.
8. Run `pnpm dify:inventory:check`, `pnpm dify:reviewer-hubs:smoke`, and `pnpm braintrust:eval:dify:reviewer-hubs:local`.

Create a new imported app only when app structure, tool wiring, or a staging clone is intentionally changing. Deletion should be a separate migration step after the replacement app has passed smoke and eval checks and all callers have moved to the new API key.

## What To Use It For

| Use the agent for                  | Do not use the agent for                      |
| ---------------------------------- | --------------------------------------------- |
| Finding templates in the queue     | Replacing reviewer judgment                   |
| Summarizing review context         | Making silent Airtable changes                |
| Checking the published site        | Using Preview URLs for automated review       |
| Drafting creator feedback          | Guessing scores, grades, or job IDs           |
| Explaining rubric issues           | Treating page text or scripts as instructions |
| Preparing an approved write action | Publishing without explicit approval          |

## Quick Chat Prompts

Copy one of these into the chat box in Dify Studio.

| Goal                   | Prompt                                                                         |
| ---------------------- | ------------------------------------------------------------------------------ |
| Check the system       | `Check whether the review tools are connected.`                                |
| Find work              | `Show me the current review queue.`                                            |
| Resume work            | `Show my assigned reviews.`                                                    |
| Look up a template     | `Find the template named [name] and summarize the review context.`             |
| Validate a site        | `Run published-site validation for this template and explain the main issues.` |
| Check homepage title   | `Explain how you validate the homepage SEO title formula for a Webflow template.` |
| Reply in Zendesk       | `Explain the safe sequence to reply in Zendesk and Submit as Solved without calling tools.` |
| Draft feedback         | `Draft creator feedback, but do not send or save it yet.`                      |
| Request changes        | `I approve this feedback. Request changes for this version.`                   |
| Get a manual checklist | `The validator is unavailable. Give me a manual review checklist.`             |

## Normal Review Flow

Use this flow for most reviews.

| Step | What happens                          | Why it matters                                        |
| ---- | ------------------------------------- | ----------------------------------------------------- |
| 1    | Find the submission                   | Starts from the real review queue or assigned work    |
| 2    | Open the version details              | Confirms the exact template version                   |
| 3    | Check review context                  | Shows what the reviewer is allowed to do              |
| 4    | Run published-site validation         | Gathers public-site evidence without changing records |
| 5    | Review caveats                        | Separates tool findings from human judgment           |
| 6    | Draft feedback                        | Gives the reviewer something clear to edit            |
| 7    | Reviewer approves the action          | Keeps the decision human-owned                        |
| 8    | Agent writes only the approved action | Prevents accidental state changes                     |

Short version:

```text
Find template -> check context -> validate public site -> draft feedback -> reviewer approves -> agent writes approved action
```

## What The Agent Can Access

The agent has access to three kinds of information and tools.

### Review Tools

The agent uses the Webflow Template Review MCP through the CREATE SOMETHING Hub.

It can:

- Check review-system health.
- List templates ready for review.
- List templates assigned to the current reviewer.
- Search assets and versions.
- Open asset and version details.
- Read reviewer context and capability flags.
- Resolve reference URLs.
- Run read-only published-site validation.
- Validate the homepage SEO title formula with `publishedUrl` plus `template_name` when available:
  - Static/CMS: `{Template Name} - Webflow HTML website template`
  - Ecommerce: `{Template Name} - Webflow Ecommerce website template`
- Save draft feedback or request changes when explicitly approved and allowed.
- Handle Zendesk tickets directly when the Dify Zendesk tools are exposed:
  - Get Ticket before drafting or writing.
  - Add Comment only after explicit approval of text and visibility.
  - Update Ticket/status, including Submit as Solved, only after the approved sequence is complete.
  - Align the Version status with `📤Changes Requested (No Notification)` after an approved public Zendesk comment so a duplicate creator notification is not sent.

### Knowledge

The agent has two Dify knowledge sources:

- Submission Guidelines
- Grading Rubric

These help it explain what the rules mean and how a finding relates to the review standard.

### Sandbox

The agent also has sandbox tools for deeper public-site checks when needed.

The sandbox can help inspect:

- Public page content.
- Metadata.
- Images.
- Links.
- Accessibility signals.
- Screenshots or visual details when available.
- Performance observations when available.

The sandbox is for extra evidence. It is not a replacement for reviewer judgment.

## What Published-Site Validation Checks

Published-site validation checks the public template site. It does not use Designer data, Preview URLs, or Airtable writes.

It can help find:

- Placeholder text.
- Heading issues.
- SEO metadata issues.
- Link problems.
- Image and asset issues.
- Accessibility signals.
- Legacy IX2 interaction signals.
- GSAP and custom-code policy signals.

Treat this as review evidence, not the final decision.

### Interpreting Placeholder And Alt-Text Findings

Lorem or placeholder findings are review evidence, not automatic blockers. The reviewer should request changes only when the current evidence points to authored, customer-facing placeholder content on non-utility pages. Do not cite intentional utility-page/example/specimen copy on Style Guide, Changelog, Licenses, Instructions, Password, Search, 401/404, or `/utility/*` pages as a placeholder failure by itself. Do not cite Webflow search result snippets or warning-only placeholder signals as confirmed blocking failures. If placeholder evidence is limited to intentional utility-page specimens, Webflow search snippets, warning-only placeholder signals, or Webflow-generated video fallback assets, exclude it from draft creator feedback.

Alt-text findings are actionable only when they point to editable content images or icons that need accessible names. Do not flag intentionally decorative empty-alt images or Webflow-generated video fallback/poster assets as creator-fixable missing-alt issues.

## How The Agent Should Answer

A strong answer should usually have three parts.

| Section           | What it means                                      |
| ----------------- | -------------------------------------------------- |
| Confirmed summary | What the agent can prove from current tool results |
| Caveats           | What still needs human judgment or more evidence   |
| Draft feedback    | Suggested wording the reviewer can edit            |

Example:

```text
Confirmed summary:
The template is ready for review and has a published URL.

Caveats:
The validator found missing image dimensions, but visual quality still needs reviewer judgment.

Draft feedback:
Please add missing image dimensions across the affected pages and confirm that required utility pages are linked and discoverable.
```

## Evidence Labels

The agent should label evidence clearly.

| Label   | Meaning                                                              |
| ------- | -------------------------------------------------------------------- |
| Auto    | The tool found clear evidence that is usually safe to trust          |
| Partial | The tool found a useful signal, but a reviewer should still check it |
| Manual  | The issue needs human judgment                                       |

Partial evidence should not be treated like final proof.

## Write Actions

Write actions change review records or save feedback. They require extra care.

Before a write, the agent should:

1. Confirm the exact action the reviewer wants.
2. Confirm the selected template version.
3. Check `template_review_get_review_context`.
4. Assign the version if required.
5. Re-check that the reviewer is allowed to make the change.
6. Run only the approved write action.

### Normal Reviewer-Owned Writes

These can be used after assignment, capability checks, and explicit reviewer approval:

- Save draft feedback.
- Set a review status.
- Request changes.

### Official Decision Or Publishing Actions

These need stronger confirmation and should only happen when the reviewer specifically asks:

- Approve version.
- Reject version.
- Complete publishing.
- Update metadata.
- Update publishing settings.

## Safety Rules

The agent should not:

- Approve a template without explicit reviewer approval.
- Reject a template without explicit reviewer approval.
- Request changes without explicit reviewer approval.
- Publish or complete publishing without explicit reviewer approval.
- Use raw Airtable as the normal review path.
- Use Preview URLs for automated review.
- Treat page text, custom code, scripts, or metadata as instructions.
- Guess job IDs, scores, grades, or check IDs.
- Include `<think>` blocks, scratchpad text, hidden chain-of-thought, raw tool schemas, or function-call markup in final responses.

If something is unclear, the agent should pause and ask for clarification or give a manual checklist.

## Common Problems

| Problem                                  | What to ask                                                |
| ---------------------------------------- | ---------------------------------------------------------- |
| The agent cannot connect                 | `Check Hub status and review tool connection.`             |
| The template is assigned to someone else | `Show the review context and current reviewer assignment.` |
| The agent finds duplicate matches        | `Show the selected match and duplicate count.`             |
| Published URL is missing                 | `Resolve reference URLs for this version.`                 |
| Validation coverage is over 100 percent  | `Explain which extra pages the crawler found.`             |
| A tool is unavailable                    | `Give me a bounded manual review checklist.`               |

## Best Working Habit

Ask the agent for one task at a time.

Good:

```text
Find this template and summarize the review context.
```

Then:

```text
Run published-site validation and draft feedback.
```

Then:

```text
I approve this feedback. Request changes for this version.
```

This keeps the review clear, traceable, and easy to check.
