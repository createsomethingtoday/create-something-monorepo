# Agency shared search and public-page annotations

This is now integrated into the real Agency SvelteKit shell. The superseded standalone preview has been removed. Changes remain local in `preview/agency-webmcp-search`, based on `40863d40a`; the original checkout remains untouched. No deployment, merge or PR.

## Open the actual shell

```sh
bash scripts/bootstrap-worktree.sh
./scripts/ona-bootstrap-local.sh pnpm --filter @create-something/agency preview:site-search
```

Open http://127.0.0.1:4178/. Cmd/Ctrl+K opens the existing Canon search dialog; mobile has its normal search button. No credentials are required for this public preview. QA also runs a separate instance on 4179. Native host support is optional.

## What is integrated

- Canon `UnifiedSearch` has an optional property-owned `content` snippet. Canon still owns the dialog, launcher, Cmd/Ctrl+K, Escape and scroll lock. Existing default cross-property search is unchanged. The custom body owns its input, focus trap, arrow navigation and result actions.
- Agency enables the shared public controller only on exact paths in `searchRoutes.json`. All other routes retain the previous UnifiedSearch behavior; authenticated MCP/account screens expose none of these site tools.
- Public catalog data comes from existing `quickAccessItems` (extracted unchanged from layout) and `workflowPages`, intersected with the canonical public route manifest. There are 24 entries: 12 public quick-access overviews and 12 workflow guides. Account/token-management and other-property links are excluded. This is bounded metadata search, not all page text or full-site semantic search.
- Human submission and agent tools call the same validated controller. Completed results appear before tool responses. New queries clear selection, generations reject stale calls, execution signals handle cancellation, and registration uses AbortSignal cleanup.
- Selected excerpts and real public-page links appear in the dialog. SvelteKit navigation is constrained to current result paths. Back/forward restores query, category and selection from local session history. Queries are deliberately absent from URLs/referrers because existing consented analytics record full URLs. Search state is not a shareable URL.
- The public search disables legacy search analytics and uses Canon's `data-analytics-ignore` subtree contract for interaction/error/copy/content-link events. Normal consented page analytics elsewhere are unchanged. No remote search calls, private data source, new credential/service, or persistent grant.

## Inventory reviewed

Agency already used Canon UnifiedSearch and its cross-property Workers AI/Vectorize service. That service filters by property after retrieval; its Agency manifest has older service/case-study destinations. Quick access includes `/mcp-access`, so it is not an authorization list. No Agency/Canon browser WebMCP registration existed. The remote search backend and authenticated MCP-access features remain unchanged.

## Site tools

- `search_agency`: query ≤160 characters; category `all`, `overview`, or `guides`. Opens and updates the same dialog, results and local history. Empty query browses the catalog.
- `read_agency_search`: returns current search state, dialog visibility, pathname, IDs, titles, canonical URLs and excerpts.
- `select_agency_result`: accepts only an ID in completed current results and shows its excerpt. Does not navigate automatically. Humans follow the ordinary public page links.

Search/selection truthfully declare visible state changes (`readOnlyHint: false`); reading is read-only. Tools are registered while on eligible public routes even when the dialog is closed, and removed on leaving that scope. No guessed navigator shim, unregisterTool API, declarative tool form, iframe discovery or persistent grants.

## On-page annotations

One lifecycle-managed shared component annotates reviewed editorial sections on Home, Services, Products, Field Reports, Practice and Stack (2/2/2/1/1/1 targets respectively). It excludes forms, editable content, nested/overlapping annotations and all other routes. Metadata has three static public fields, no query strings or user values. Search results also support contextual annotations.

Buttons appear only with supported top-level `document.oai.annotation.request`. A direct user click prepares a short editable prompt. Accepted/rejected/error status is explicit; accepted never means sent. Cleanup removes owned controls/listeners and restores attributes across SPA navigation. Without support, ordinary reading/navigation is unchanged. Custom preview controls are unnecessary; annotations complement tool registration rather than replacing it.

Official contracts checked 2026-10-08:
- https://learn.chatgpt.com/docs/webmcp
- https://learn.chatgpt.com/docs/annotations-extensibility
- https://developer.chrome.com/docs/ai/webmcp/imperative-api

## Verification

```sh
./scripts/ona-bootstrap-local.sh pnpm --filter @create-something/agency test:site-search
./scripts/ona-bootstrap-local.sh pnpm --filter @create-something/agency check
./scripts/ona-bootstrap-local.sh pnpm --filter @create-something/agency build
./scripts/ona-bootstrap-local.sh pnpm --filter @create-something/canon check
./scripts/ona-bootstrap-local.sh pnpm --filter @create-something/canon test
# Real Agency shell running on 4179; isolated Chrome profiles:
node packages/agency/preview/site-search/integrated-qa.mjs
node packages/agency/preview/site-search/annotation-qa.mjs
```

Dedicated tests cover cancellation/stale responses, public boundaries, invalid IDs, registration failure/cleanup, and annotation limits/lifecycle. Canon analytics tests cover optout descendants while preserving ordinary tracking and delegated clicks. Browser tests cover desktop/mobile, keyboard/reduced motion, repeated/empty/no-results queries, filters, real public navigation/back restoration, session history, unsupported fallback, and six-route annotation coverage. Independent review found and helped resolve cancellation, delegated-click, privacy and token issues.

Screenshots: [desktop search](evidence/desktop.png), [mobile search](evidence/mobile.png), [Home annotations desktop](evidence/home-annotations-desktop.png), [Home annotations mobile](evidence/home-annotations-mobile.png). Annotation screenshot state uses a deliberately rejecting host fixture to show graceful behavior; it is not native host acceptance.

## Native host acceptance and remaining gates

Codex In-app Browser now supports this local preview. Real discovery, search for `workflow`, 14 visible results, selection of `/services`, and readback succeeded. See [exact native receipt](evidence/native-search-receipt.json), [source hashes](evidence/source-sha256.json), and [native search screenshot](evidence/native-search.jpg). No fixture was injected for these calls.

A trusted click on Home’s “Ask about how support works” returned “Request accepted. Review and send your comment in the browser.” See [annotation receipt](evidence/native-annotation-receipt.json) and [screenshot](evidence/native-annotation.jpg). This proves request acceptance; composer editing and message submission were deliberately not exercised. No message was sent automatically.

Independent review found no remaining integration blocker. All original 21 Canon failures reproduced at base. The exact upstream `8dfacd302` terminal-tooling exemption was applied as a bounded repair: Canon check now passes, full tests are 655 passed / 19 failed. Remaining failures are one contact-copy expectation, four stale inventory-count assertions, thirteen old homepage design/source contracts, and one test reporting 24 pre-existing token uses. No new search/annotation token violations. See evidence/canon-failure-classification.json for diagnosis and separate repair scope.

Agency check/build, 16 dedicated tests, five analytics tests, desktop/mobile fixture QA and six-page annotation fixture QA passed. Native evidence is distinguished from those fixtures. Promotion requires catalog coverage review, tracked review and approved deployment/rollback. Linear environment credential was unavailable; none was requested. No merge or deployment. Worktree disposition: preserved for review.
