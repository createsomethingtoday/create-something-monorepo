# CRE-1369 source and rendered baseline

Date: 2026-07-20

Base: `8b732035a39db09456ac50bc6eca9f12f4f8bc38`

Scope: the nine IO admin routes, their shared layout, the admin request client, the auth hook, and the APIs those pages call.

## Reader outcome

A junior operator should be able to answer, from the first screen:

1. What is this page for?
2. What data or system does it represent?
3. Is the displayed state live, empty, unavailable, or stale?
4. What can I safely do next?
5. What changed after an action, and how can I recover?

## Source findings

- Four protected pages use an `h1`; four use an `h2` as the page title. The login page has an `h1`, but its rendered document has no `main` landmark.
- The shared navigation exposes six of eight protected tools. Agent Drafts and Tufte Dashboard are reachable only by a direct URL.
- The dashboard renders the database name in success green even though that row is not backed by a health check. A failed stats request does not make that static status claim unavailable.
- The dashboard, analytics, experiments, submissions, and subscribers descriptions say what the page contains, but not the operator's immediate task or the data boundary.
- Agent Drafts uses seven blocking `alert()` calls. Approve is labeled `Approve & Send`, while the success alert says the operator must still send the email. The label therefore promises an effect the action does not perform.
- Agent Drafts sends triage and review decisions to `/api/agent`. The auth hook protects `/admin/**` and `/api/admin/**`, but not `/api/agent`. A public read-only request to production returned `400`, not `401`, confirming that this route is outside the admin guard. No mutation request was sent.
- Submissions and Subscribers use blocking `confirm()` dialogs for permanent deletion. Neither page provides an in-page pending state, success receipt, focus recovery, or undo path.
- Subscribers uses raw `fetch()`, discards non-2xx responses, and therefore turns unavailable or forbidden data into a plausible empty list. Its records are typed as `any[]`.
- Agent Drafts also uses raw `fetch()` and attempts to parse every response as its success-shaped JSON. Session expiry, forbidden access, and service failure are not distinguished.
- Observability redirects on 401/403. Analytics explains expired and forbidden states without redirecting. Submissions shows the server message. Subscribers shows no failure. The family has no consistent session-recovery contract.
- Tufte Dashboard issues one request from `onMount` and another from a reactive statement on first render. It uses raw `fetch()`, does not cancel older requests, and describes the result as `AI-powered` even though the API may return a heuristic summary when Workers AI is absent.
- Experiments is the strongest existing route: it names the repository as source of truth, marks the surface read-only, separates unavailable from empty, and explains the change path.

## Live public boundary

Unauthenticated production requests:

| Destination | Result |
| --- | --- |
| `/admin` | `303` to `/admin/login?next=%2Fadmin` |
| `/admin/agent-drafts` | `303` to its safe encoded login continuation |
| `/admin/analytics` | `303` to its safe encoded login continuation |
| `/admin/experiments` | `303` to its safe encoded login continuation |
| `/admin/observability` | `303` to its safe encoded login continuation |
| `/admin/submissions` | `303` to its safe encoded login continuation |
| `/admin/subscribers` | `303` to its safe encoded login continuation |
| `/admin/tufte-dashboard` | `303` to its safe encoded login continuation |
| `/admin/login` | `200` |
| `/api/admin/stats` | `401` |
| `/api/agent?contact_id=not-a-number` | `400` (unguarded route) |

The production login was inspected at 1440x900 and 390x844 with reduced motion. It has one `h1`, visible Email and Password labels, one Sign In button, no horizontal overflow, and no console errors. It has no `main` landmark and leaves initial focus on the document body.

Current screen history contained no recent authenticated IO admin URL. Authenticated state claims therefore need a local test fixture or a new signed-in read-only session; historical screenshots will not be counted as current proof.

## Baseline checks

- `pnpm --dir packages/io check`: pass, 0 errors and 0 warnings.
- `pnpm --dir packages/io build`: pass.
- `pnpm --dir packages/io test:analytics`: 6/6 pass.
- `pnpm --dir packages/io test:admin-experiments`: 5/5 pass.
- Scoped prose audit: 10 files, 2 blocking findings, both `AI-powered` in Tufte Dashboard.

## Why the existing checks passed

The current tests prove narrow data invariants for Analytics and Experiments. Svelte checks prove types and component validity. The prose audit catches two banned marketing phrases. None of them asserts the family-level operator contract: title hierarchy, source-of-truth cue, reachable navigation, accurate action labels, guarded mutations, explicit failure states, confirmation and recovery, or focus behavior.

That gap allowed locally valid pages to pass while remaining operationally ambiguous.
