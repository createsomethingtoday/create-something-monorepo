# Editorial annotation preview

Expansion reviewed from release `253fb0252656b56da3f2d2199d41d4e0f07aee5a` on `preview/agency-editorial-annotations`. Micah explicitly approved publication of the reviewed expansion. Production promotion requires normal review, CI, merge, deployment, and live verification.

## Coverage

The inventory found 84 page entrypoints, including private, administrative, and dynamic route templates. That is not a count of public pages. This bounded preview adds nine questions to seven routes (six newly covered), retaining all nine existing targets. Total: 18 targets on 12 explicitly allowed routes.

| Public context | New visible question | Grounding and limit |
| --- | --- | --- |
| Home: Outerfields | What carried forward from this project? | Published prototype, funded development, in-house handoff, later PCN. The specific transferred lesson is not documented. |
| About: operating story | What does court vision change? | Published basketball, pressure, veterinary continuity, and working-method account. Does not invent personal incidents. |
| Agent Foundation: illustrative proof | How do I make the next change? | Meeting-notes example and repository/handoff checks. Explicitly illustrative, not a client result. |
| Agent Foundation: boundary | Why is launch a separate step? | Delivered ownership versus separately agreed Production Promotion. |
| Template Review: result | Why keep the final decision human? | 49/50 completed packets, exceptional-case miss, withheld promotion, unmeasured reviewer time remain distinct. |
| Upstream Contributions: contribution | How did the contribution evolve? | Published failure, maintainer changes, accepted result; missing motives/conversations stay unknown. |
| Upstream Contributions: evidence | What do these receipts establish? | Distinguishes proposal, merge, release, and endorsement; does not infer partnership. |
| Human-in-the-loop guide: operating path | What makes this a real decision? | Reviewer evidence, stop authority, exception ownership. Added examples must be hypothetical. |
| Agent Evaluation guide: operating path | Why is a working demo not enough? | Published cases, criteria, misses, recovery steps. Added examples must be hypothetical. |

Before, these sections had no contextual question control. After, supported browsers show a quiet question near the section heading. A click requests an editable browser comment, and the user chooses whether to send it. Unsupported browsers retain the original reading experience.

Narrative controls attach to the stable stage rather than changing scene content. Outerfields uses its explicit h3 heading. Controls have a 44px minimum target, wrap on mobile, retain focus treatment, and use existing Canon tokens. No new site copy claims, private data, credentials, tracking, grants, search infrastructure, or search-state changes are introduced.

## Deliberately deferred

Technical Review, readiness, Control, service providers, partner pages, remaining guides, and product pages need distinct editorial questions and current evidence before expansion. Ground is undergoing an independent release; do not copy stale version claims. Legal pages should preserve precise policy wording. Forms, login, account, dashboard, administrative, tokenized delivery, and client surfaces remain excluded. No prefix-wide annotation rule is used.

Micah's own account is needed for a specific Outerfields funding decision, the lesson transferred to the later PCN, a concrete basketball/medical/veterinary incident, personal reasoning at the automation boundary, or a real client's subsequent change. The preview asks for documented context and flags missing detail instead of supplying these stories.

## Validation and evidence

- 18 focused tests passed (8 annotation and 10 shared-search tests), including metadata/prompt limits, explicit heading, duplicate exclusion, teardown, rejection, detached controls, and inputs introduced after installation.
- Agency check and production build passed.
- Browser fixture: 12 routes at 1440px and 390px; all controls, rejection, 44px targets, overflow, narrative tabs, SPA teardown, excluded login, and unsupported API behavior passed.
- Existing desktop/mobile shared-search regression passed: query, filters, results, selection/navigation/history, empty/no-results, and fixture tool state.
- Native Codex browser on local `/about`: trusted click produced “Request accepted. Review and send your comment in the browser.” No comment was sent. This proves request acceptance only, not editor visibility, save, or send.
- Independent editorial review found no source/content blocker. It caught blank transitional screenshots; the harness now waits for hydration/fonts/paint, handles the privacy banner, and disables capture animations before taking evidence.
- The reviewer confirmed recaptured mobile and desktop examples are legible and restrained. Follow-up fixes capture every individual target (including Outerfields) and match the upstream receipts control to its panel inset.

Evidence lives beside this checkout in `../editorial-before/`, `../editorial-after/`, and `../editorial-native-about.jpg`; logs are `/tmp/agency-editorial-{tests,check,build,browser,search-regression}.log`. Production before screenshots use a standard browser; after screenshots use an explicit annotation API fixture. Neither is native host acceptance. Native evidence is separately labeled above.

API reference: https://learn.chatgpt.com/docs/annotations-extensibility. Annotation metadata and suggested questions complement WebMCP search registration; they do not register or replace search tools.
