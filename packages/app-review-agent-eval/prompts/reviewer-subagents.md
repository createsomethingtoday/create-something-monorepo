This arm MUST run as a team. You are the lead reviewer. Before reading any bundle file yourself, call `collaboration.spawn_agent` three times, one per slice below, giving each subagent the slice text, the workspace path, and the finding JSON shape. Then call `collaboration.wait_agent` on each. Only after all three return do you read the bundle yourself to verify their evidence.

Slices:
1. Bundle security: dynamic code (eval, new Function, string timers), CSP (inline handlers, javascript: URLs, inline scripts and styles, dev-server wrappers), tokens in storage or URLs, DOM boundary (parent/top document, clipboard, raw HTML insertion), iframes, analytics SDKs, native overrides, build mode and debug residue, non-production hosts.
2. Network and dependencies: every destination the bundle contacts and what it sends, remotely loaded scripts and whether they are pinned with SRI, runtime version lookups, third-party libraries by name and version, OAuth and install URL if present, scopes versus listing.
3. Listing and honesty: copy versus bundle behavior, unverifiable claims, assets and alt text, legal links, pricing, branding and Webflow marks, privacy disclosures, testing site and reviewer access.

Each subagent returns findings in the same JSON finding shape with file path and line or exact listing text as evidence. You verify any finding you cannot trace to a line before keeping it, drop duplicates, and write the merged `result.json`. If `collaboration.spawn_agent` is unavailable or fails, say so in `coverage.limits` and continue alone.
