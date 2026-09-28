# CRE-2152 / Paperclip CRE-118 LMS candidate

Scope: public LMS presentation, owned by `packages/lms`; `packages/learn` is a stdio MCP package, not this website. Judgment tier: make the existing learning sequence and next action legible. Independent reviewer: existing create-something [CRE-119](http://127.0.0.1:3101/CRE/issues/CRE-119), agent `59070700-7c9c-41e5-8b1a-0ba3a71bc850`.

## Source and boundaries

- Branch: `codex/cre-2152-learn-canon`.
- Base at worktree creation: `origin/main`, `c6921a7e2c19968c0a79c70448e92af3e56d8e03`.
- Worktree: `/Users/micahjohnson/.paperclip/instances/create-something/projects/1fb053c2-aa2a-4d88-8c45-0ef82ac8aef5/1e856c62-8d8a-4196-9e04-b1dd070735b5/_default/learn-candidate`.
- Worktree disposition: retain until exact release and evidence closeout. Other worktrees are untouched.
- Existing campaign opening, course copy, curriculum, links, metadata, shared navigation, shared funnel, auth, progress store/server and completion API are unchanged. No shared Canon source changes.
- Course/path collections use contiguous rows, token-backed separators and quieter lesson indices. Course heading scale is bounded; lesson navigation stacks on mobile. Public controls gain visible keyboard focus and reduced-motion handling. Long lesson tables scroll within the reading frame.
- No new provider, auth bypass, transactional send, commerce change, client-site edit or deployment.

## Grounding

Read repo and LMS AGENTS; LMS README and UNDERSTANDING; current Space README; `docs/PROPERTY_INTENT_FUNNEL.md`; generated Atlas/Substrate agent wiki; Canon public-surface/design-review rules; Performance Lab contracts and current source. UNDERSTANDING is dated 2025-12-29 and describes older modules, so actual current `/paths/[id]/[lesson]` routes and PATHS content govern this candidate. Space is the public workshop with retained Workbench/tools, not a rollback to the older runtime-only funnel wording. The funnel's adjacent-action and no-cold-booking boundary remains intact.

CTX status reported generation-verification failure; search failed on a denied lockfile. No history provenance is claimed. Mobbin was not needed for this bounded application of existing Canon patterns. Linear connector required reauthentication; the exact claim/evidence is recorded in Paperclip for root's canonical Linear mirror.

## Local verification (2026-09-28 UTC)

- LMS `pnpm check`: **0 errors / 0 warnings**.
- LMS `pnpm build`: **passed**, Cloudflare adapter completed.
- `git diff --check`: passed.
- Ego38/p3, production-build preview `http://127.0.0.1:5193`: 21 route/viewport checks, at 1440×900, 390×900, 320×900. Home, paths, both course overviews, first Codex lesson, Progress redirect and invalid path: no horizontal overflow.
- Mobile menu exposes Course, Progress, Get Started and Sign in. Progress activation preserves `/login?redirect=%2Fprogress`.
- Keyboard Enter opens the course, Start Lesson 1 reaches the existing lesson, keyboard Next reaches `scaffold-an-mcp-server`.
- Actual Tab/Shift+Tab focus on lesson Next: `:focus-visible`, 2px solid signal outline, 4px offset. Programmatic focus alone does not trigger the keyboard-only ring.
- Reduced-motion emulation: matched, lesson navigation transition duration `0s`.
- Invalid path renders existing Page Not Found. Public lesson links and content remain available as anonymous visitor.
- No authenticated learner fixture was used. D1 progress persistence, protected dashboard empty/completed states and authenticated completion are **not verified** and are not modified. Guest lesson tracking's existing authentication failures are not represented as new completion proof.
- Existing LayoutSEO supplies a generic description alongside route descriptions; this candidate does not alter SEO. Missing editorial font asset/fallback observed locally is pre-existing package/static behavior; no font swap was introduced.

Sparse dependency reuse avoided a full install on the constrained host. Package dependency links point to the existing store; local Canon generated config was synced and existing package dist reused. Initial failures from symlinked Vite cache and unwritable Wrangler registry were resolved by local cache directories and run-owned XDG_CONFIG_HOME. Production-build preview avoids dev-server font allow-list errors. These are local-environment receipts, not CI equivalence.

## Review and release gate

This is authored/local-tested evidence, **not independent approval, merge, deployment or live acceptance**. CRE-119 reviews the exact PR head and preserved screenshots/results. The raw archive is in shared workspace `evidence/cre118-lms-review-evidence.zip`. The attachment helper failed twice before HTTP because its temporary directory is unwritable; upload retries stopped. Root must upload the retained archive and mirror evidence to Linear. The PR and committed report are registered Paperclip work products; no successful archive upload is claimed. Root owns CI/release workflow unblock. Do not publish until independent review passes and normal source gates pass. Release must record exact merged source, provider deployment, prior-good rollback reference, and live public/provider browser verification. Retain the worktree and evidence until that closeout.
