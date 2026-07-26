# Performance Page Sharpness

> Status: active whole-page judgment and verification contract
> Scope: Agency, LTD, IO, Space, Learn, and Ona Agents

## Decision

Every CREATE SOMETHING page should communicate with the sharpness established by the indexed Performance homepages: one question or task, focused proof, and an earned next action.

Sharpness is a whole-page property, not a visual style and not a universal three-section template. A page is sharp when a reader or operator can answer four questions without reconstructing the interface:

1. What decision or task is this page for?
2. What is the shortest legible sequence through it?
3. What proof supports the claim or action?
4. What is the one useful next move?

Canon owns the shared contract and composition behavior. Properties own the content, data, artifacts, and domain action. The workspace registry makes the boundary executable.

## Universal Contract

Every rendered page must declare:

- **Decision:** one reader or operator decision in plain language.
- **Spine:** one narrative or task sequence with no duplicated introduction.
- **Chapters:** bounded top-level roles whose purposes do not overlap.
- **Primary proof:** the chapter where the decisive evidence is visible or inspectable.
- **Handoff:** the chapter and action that complete the page argument or task.
- **Rollout state:** `pending` or `migrated`; only callbacks, redirects, and machine-only pages may use `technical-exclusion` with a specific reason.

The page should consolidate ideas that support the same decision. It must not delete substantive content, hide required evidence, or wrap unchanged sections in one semantic container to satisfy a count.

## Archetypes And Budgets

Budgets count direct top-level communication chapters. Navigation, footer, persistent product chrome, dialogs, and transient feedback are not chapters. A long article body or work surface is one chapter even when its internal structure is rich.

| Archetype    | One decision                                         | Canonical spine                                    | Chapter budget |
| ------------ | ---------------------------------------------------- | -------------------------------------------------- | -------------: |
| `landing`    | Is this the right system, property, or path?         | question -> focused proof -> handoff               |            3-5 |
| `commercial` | Does the fit and boundary justify a commitment?      | fit -> boundary proof -> commitment                |            3-4 |
| `editorial`  | Does this thesis or source change the practice?      | thesis -> evidence body -> continuation            |            2-4 |
| `index`      | Which item is most relevant now?                     | orientation -> collection -> selected continuation |            2-3 |
| `learning`   | What should the learner understand or practice next? | objective -> learning sequence -> progression      |            2-4 |
| `tool`       | What task or decision should the operator complete?  | task state -> workspace -> decision receipt        |            1-3 |

The upper bound is a review trigger, not permission to fill every slot. Use fewer chapters when the complete content contract remains visible and legible.

## Chapter Roles

The stable role vocabulary is deliberately small:

- `opening`: creates the primary question.
- `orientation`: explains how to read, choose, or act.
- `conditions`: names fit, constraints, or readiness.
- `sequence`: carries an ordered test or learning progression.
- `collection`: holds one browsable index and its controls.
- `body`: develops one thesis through evidence.
- `workspace`: holds the task and its meaningful states.
- `proof`: concentrates the decisive artifact or evidence.
- `handoff`: completes the argument or task with one next move.

A page may contain rich internal structure, but it must not use multiple `opening` or `orientation` chapters to restate the same proposition. Proof belongs beside the claim, state, or action it supports. A handoff cannot precede its primary proof.

## Interaction Selection

Choose interaction according to the communication problem, not novelty.

| Need                             | Preferred composition                           | Use when                                                         | Avoid when                                                                         |
| -------------------------------- | ----------------------------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| One proposition and one artifact | Static Performance chapter                      | The proof is understandable at rest                              | Selection adds no new meaning                                                      |
| Several related proof scenes     | `PerformanceNarrativeStage`                     | Every scene supports one decision and owns a meaningful artifact | Scenes are unrelated, summaries repeat, or autoplay is required to understand them |
| Ordered field or learning tests  | `PerformanceFieldSequence` or learning sequence | Order changes understanding                                      | The items are a browsable collection                                               |
| Browse and compare               | One index/collection chapter                    | Filters, metadata, and items belong to one choice                | Cards become separate marketing chapters                                           |
| Operate live state               | Task-oriented work surface                      | Input, state, approval, stop, recovery, and receipt matter       | Campaign motion competes with the task                                             |
| Long-form argument               | Editorial body with local navigation as needed  | The thesis needs sustained evidence                              | Abstract, summary, and conclusion repeat the same introduction                     |

No autoplaying carousel, scroll-jacking, parallax, hover-only meaning, mandatory horizontal swipe, or motion-only sequencing is part of the sharpness system. Progressive disclosure must preserve orientation, keyboard and touch access, no-JavaScript meaning where relevant, and reduced-motion equivalence.

## Whole-Page Review

Review the page in order, not as isolated components:

1. Shared navigation or product chrome establishes location without becoming another campaign chapter.
2. The opening or orientation names one decision.
3. The middle concentrates the smallest complete body, collection, sequence, workspace, or proof.
4. The handoff follows the proof and names one next action.
5. Footer and related links provide context without competing with the handoff.

Remove or consolidate an element when it restates another chapter, introduces a second primary action, delays proof, or looks impressive without improving comprehension or task completion.

## Ownership

| Tier       | Owner                                                                                                            |
| ---------- | ---------------------------------------------------------------------------------------------------------------- |
| Database   | `config/performance-pages/registry.ts`, property copy/data, proof objects, destinations, and migration evidence  |
| Automation | Canon validation, route discovery, workspace audit, responsive/accessibility behavior, and rendered verification |
| Judgment   | Archetype choice, the one decision, chapter purposes, consolidation choices, interaction choice, and handoff     |

Canon's public interface is `validatePerformancePageContract` plus the `PerformancePage*` types. The registry lists every checked-in `+page.svelte` implementation explicitly. Adding a new page without classification or registering one page twice fails the workspace audit.

## Commands

```bash
pnpm performance:pages:test
pnpm performance:pages:check
pnpm performance:pages:report
pnpm performance:pages:check -- --require-migrated
```

The normal check permits `pending` entries so migrations can land in bounded cohorts. The final goal gate adds `--require-migrated` and fails until no in-scope page remains pending.

## Migration Evidence

A route advances to `migrated` only after:

1. its complete source composition matches the declared archetype and chapter roles;
2. substantive content, evidence, data states, and destinations are preserved;
3. package checks and production build pass;
4. the rendered page passes desktop and mobile review;
5. keyboard, reduced-motion, no-JavaScript, deep-link, loading, empty, error, recovery, and authenticated states are exercised when relevant;
6. the changed runtime is merged, deployed, and read back live with a previous-good rollback reference.

Source inspection, a green build, or a component-level screenshot alone is not migration evidence.
