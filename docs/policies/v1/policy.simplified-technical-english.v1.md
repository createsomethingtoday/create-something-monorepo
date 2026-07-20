# policy.simplified-technical-english.v1

- Status: `draft`
- Owner: `CREATE SOMETHING editorial systems`
- Standard reference: `ASD-STE100 Simplified Technical English, Issue 9`
- Public implementation claim: `STE-aligned`

## Purpose

Make Simplified Technical English a first-class clarity profile for CREATE SOMETHING content. The first rollout applies to the active `.agency` conversion path. It keeps technical meaning and brand voice while it reduces ambiguity in instructions and descriptions.

This policy uses public guidance from the ASD Simplified Technical English Maintenance Group. It does not claim ASD certification, ASD endorsement, or complete ASD-STE100 compliance. A full compliance claim requires the official current standard, its complete dictionary and rules, qualified review, and independent evidence for the claim.

## Policy Statements

1. Public instructions MUST name the action and the actor when the actor is known.
2. A procedure sentence MUST contain no more than 20 words.
3. A description sentence MUST contain no more than 25 words.
4. A procedure sentence MUST contain one instruction.
5. A required condition MUST appear before the action that depends on it.
6. A paragraph SHOULD contain one topic.
7. A complex series SHOULD use a vertical list when the layout supports one.
8. One stable term MUST represent one meaning inside the same artifact.
9. Subject-specific technical nouns and verbs MAY remain when the artifact defines or demonstrates their meaning.
10. Brand headings, exact names, code, quotations, proof identifiers, and legally controlled text MAY use a narrower profile. The exception MUST NOT conceal explanatory copy or public claims.
11. Changed-file enforcement MUST block only introduced deterministic profile violations.
12. The full active-route audit MUST report backlog without blocking unrelated work.
13. Redirected and archived routes MUST NOT count as active public migration failures.
14. Consequential publication MUST receive a final human read and rendered-surface verification.
15. Public copy MUST use `STE-aligned` unless complete Issue 9 compliance has been established independently.

## Content Profiles

### Procedure

Use for instructions, form guidance, errors, recovery steps, and operator actions. Use active voice, one instruction per sentence, a 20-word limit, and conditions before dependent actions.

### Description

Use for services, technical explanations, field reports, FAQs, and supporting marketing copy. Use active voice when the actor is known, one topic per paragraph, and a 25-word limit.

### Brand heading

Use for campaign titles, product names, and short display headings. Keep each exception clear in its rendered context. Do not use this profile for explanatory body copy.

### Exact content

Use for code, quotations, product and vendor names, proof identifiers, and legally controlled text. Preserve the exact meaning and keep the exception narrow.

## Agency Scope

The first active route set is:

- `/`
- `/services`
- `/stack`
- `/map`
- `/control`
- `/book`

The `.agency` technical-term registry is stored in the machine-readable artifact. It defines terms such as `workflow`, `agent`, `MCP`, `Substrate`, `Map`, `Build`, `Control`, `Signal`, `Decision`, `Proof`, `receipt`, and `audit trail`.

Retired `/dify` sources and redirected `/notion` sources are outside the active migration count. Their source can remain as historical or rollback evidence.

## Enforcement

The root prose interface owns profile enforcement. Changed-file checks block introduced deterministic violations. The active-route audit reports the current backlog and exits successfully so existing debt cannot block unrelated work.

Sentence length is necessary but not sufficient. Automated checks do not prove comprehension, correct vocabulary meaning, correct grammar, or full ASD-STE100 compliance. Human review remains authoritative for meaning, claims, evidence, voice, and rendered reading order.

### Vale integration boundary

Vale can provide a secondary editor and Markdown/HTML lint adapter. It does not replace the root prose interface. Agency copy often appears in Svelte component properties, and Vale does not list Svelte as a built-in markup format. A required Vale gate needs a pinned runtime, an owned style package, Svelte-aware extraction, and parity fixtures against this policy before it can block publication.

If the team adds the Docker adapter, pin the image version and mount only the repository config, style directory, and selected documents. Do not use an unpinned container or treat a clean Vale result as proof that Svelte copy passed the canonical profile.

## Evidence

- The machine-readable contract is `docs/policies/v1/policy.simplified-technical-english.v1.json`.
- Runtime behavior is covered by `scripts/test/prose-quality.test.mjs`.
- The `.agency` active-route boundary comes from public route ownership and redirect state.
- Production acceptance requires the desktop and mobile browser matrix defined in `.codex/agency-ste-rollout/goal.md`.

## Source Anchors

- Official overview: `https://asd-ste100.org/about_STE.html`
- Official FAQ: `https://asd-ste100.org/STE_faq.html`
- Official Issue 9 request page: `https://asd-ste100.org/STE_downloads.html`
- Existing prose policy: `docs/policies/v1/policy.prose-quality.v1.md`
- Agency public-copy contract: `packages/agency/README.md`
- Agency route and redirect ownership: `packages/agency/src/lib/data/marketingPages.ts`, `packages/agency/src/lib/data/deprecatedRoutes.ts`

## Rollback

Remove the STE profile from the promotion gate while preserving the policy, audit output, and existing prose checks. Do not delete findings or weaken the `.agency` public-copy contract to make a rollback pass.
