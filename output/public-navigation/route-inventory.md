# CRE-2127 public route inventory

Source: base 7f3d6ede3 and current owning hooks/load handlers. Evidence: anonymous cookie-free GETs, redirects not followed, `anonymous-http.json` and `logs/anonymous-http.log` (2026-09-25 UTC). No forms submitted. All global static page routes are covered. A 200 alone is not an access decision: route purpose and guards determine navigation inclusion.

| Route | Anonymous HTTP | Navigation | Source / reason |
|---|---|---|---|
| `/` | 200 | Home via wordmark | No page guard; public offer. |
| `/admin` | 403 | Excluded | Excluded: server requires administrator role (403). |
| `/apply` | 303 → `/login?next=%2Fapply` | Excluded | Excluded: server redirects anonymous visitors to login. |
| `/collection` | 303 → `/login?next=/collection` | Excluded | Excluded: server requires identity, redirects to login. |
| `/dashboard` | 303 → `/login?next=/dashboard` | Excluded | Excluded: server requires identity, redirects to login. |
| `/field-engineering` | 200 | Field practice | Public route; no page server guard. |
| `/impact` | 303 → `/login?next=/impact` | Excluded | Excluded: identity plus reviewer policy. |
| `/join` | 200 | More / Connect / Request invitation | No GET load guard; POST action retains same-origin, consent, validation and rate limits. |
| `/library` | 200 | Library | library/+page.server.ts loads optional foundationEntry; catalog API separately filters access. |
| `/login` | 200 | Sign in | Public sign-in entry; no credentials submitted. |
| `/paths` | 200 | Learning paths | $lib/server/path-page.ts loads learning/paths; $lib/server/learning.ts returns empty paths when not admitted. Public index does not grant lesson access. |
| `/privacy` | 200 | More / Legal / Privacy | Public legal page. |
| `/remote-sessions` | 303 → `/login?next=%2Fremote-sessions` | Excluded | Excluded: server requires identity, redirects to login. |
| `/review` | 303 → `/login?next=/review` | Excluded | Excluded: identity plus reviewer policy. |
| `/review/intake` | 303 → `/login?next=/review` | Excluded | Excluded: identity plus reviewer policy; impersonation denied. |
| `/signup` | 200 | More / Account / Create account | Public account entry; enrollment policy is unchanged. No enrollment request submitted. |
| `/start` | 200 | Start here | start/+page.server.ts loads optional foundationEntry; no identity gate. |
| `/support` | 200 | More / Connect / Support | support/+page.server.ts calls public GET /api/support, returning no personal workspaces for anonymous visitors. POST still requires identity. |
| `/support-session` | 303 → `/login?next=/support-session` | Excluded | Excluded: identity/reviewer/impersonation-enabled policy; token/session workflow. |
| `/support/partner` | 303 → `/login?next=/support/partner` | Excluded | Excluded: identity plus approved support-partner policy. |
| `/terms` | 200 | More / Legal / Terms | Public legal page. |
| `/verify` | 200 | Excluded | Excluded: token-specific verification utility reads token from URL fragment, not a primary destination. |

Dynamic routes excluded as global destinations: `/lessons/[id]`, `/paths/[id]`, `/support/[id]` and every `/n/[slug]` route (tenant landing, assets/releases, field notes, impact, lessons, paths, seller, settings and studio). They depend on selected records/tenants and their owning access checks. API/webhook endpoints are not pages. Query variants such as signup recovery and invitation tokens remain contextual utilities.

Home remains discoverable through the explicitly labelled wordmark. The desktop header keeps four learning/orientation destinations and Sign in direct; More groups Connect, Account and Legal using native details/summary. Mobile preserves the existing menu and exposes the same full destination set. Legal links also remain in the footer.

No hook, load handler, identity/payment flag, data policy or provider configuration changed. Only the owning layout presentation and its new public disclosure state changed.
