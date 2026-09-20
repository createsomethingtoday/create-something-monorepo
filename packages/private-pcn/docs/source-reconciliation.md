# Source selection

CRE-2030, 2026-09-19. This package serves the CREATE SOMETHING managed PCN offer; Outerfields remains untouched.

Reviewed:
- Monorepo origin/main at 35dc410d7a69cde392cd09d04bb44f4ba9278a63, packages/agency/clients/outerfields.
- Historical e68eab636 private-access release: revised offer/branding still used cookie sessions backed by stored membership snapshots. It is historical evidence, not a complete security upgrade or authoritative current deploy.
- createsomethingtoday/outerfields-pcn main: a separate Node/Replit export with PostgreSQL/SQLite compatibility and documented session/storage portability gaps. It is not the default for a new Cloudflare deployment.
- CTX Codex session 99e58082 event 5d287230: user explained backend delivery with client-owned Replit frontend editing. Session ec27483b event 58d1a664: reuse for Shivworks. This establishes delivery intent, not present runtime proof.

Reuse: the standalone Stream/TUS initialization and signed playback helper is adapted from the monorepo package with attribution in source. Content publication/series concepts and client delivery experience inform the new isolated schema and UI. Existing Canon Identity verification is reused through its public export. Do not copy client database IDs, storage bindings, accounts, email addresses, media, demo-admin exceptions, ratings, Stripe products, or legacy raw-media routes.

The new surface uses the existing `agency` Identity audience as a first-party .agency application, host-only `__Host-pcn_*` cookies, verified token/issuer/audience/session contract, online active-user readback, and its own D1 access policy. An agency login does not imply PCN membership. No Identity provider change or new audience deployment is necessary for this scope.

Every uploaded Stream video must require signed URLs, including public previews. Public means anonymous users can request a short-lived grant for a published preview, not that originals become public. The grant lifetime is 60 seconds; access changes block new grants immediately, while issued grants and already buffered media have the documented residual lifetime. Administrator access is explicitly configured, not inferred from a demo email.

V1 is a separate deployment per network with invitation-based access. Viewer billing, cross-client tenancy, content production, forums, and AI strategy are separate scopes, not implemented or advertised as included capabilities. Client-editable Replit delivery can be separately scoped; it is not required to launch this managed Cloudflare service.
