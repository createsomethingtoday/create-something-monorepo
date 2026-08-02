# Source and deployment policy

## Evidence order

| Lane          | Source                                                                                             | Use                                                                      |
| ------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Primary       | Public LTK posts, creator profiles, captions, product links, and visible exclusive-code indicators | Discover creator offers first; preserve app-gated or inaccessible states |
| Verification  | Official retailer offer pages and inspectable checkout evidence                                    | Confirm terms, timing, eligibility, and code behavior                    |
| Corroboration | Creator-owned pages and authorized affiliate feeds                                                 | Support a public LTK claim without replacing retailer proof              |
| Lead          | Search indexes and deal aggregators                                                                | Find candidates that still require stronger evidence                     |

Record the direct URL, publisher, observation time, creator-post publication time when available, access state, offer terms, code evidence, eligibility and fulfillment facts, and corroborating URLs. Never substitute observation time for publication time.

## Public access and reuse

Public visibility permits bounded discovery and citation; it does not automatically permit bulk collection, persistent republication, resale, or commercial reuse. Store only the evidence needed for the resolver and watch receipt. Link to the originating page and keep excerpts short.

## ChatGPT boundary

The ChatGPT or Codex host agent calls `plan_offer_search`, performs the bounded LTK-first public discovery pass with its own web capability, then submits factual observations to `resolve_offers`. The production MCP is the authority for observation time, reliability scores, caps, ranking, evidence separation, receipts, and watch baselines; it does not trust a host-authored score. It does not perform server-side web search, retrieval, or scheduled rechecks. Only `recommend` decisions are returned as usable offers. `verify` and `lead` decisions remain non-actionable evidence until current official or checkout corroboration is supplied.

The plugin connects to that service through the stable public HTTPS `/mcp` endpoint declared in the plugin bundle. The endpoint uses CREATE SOMETHING Identity OAuth and an explicit access policy. Installing the plugin does not authorize broader user access or publish it to the public ChatGPT directory.
