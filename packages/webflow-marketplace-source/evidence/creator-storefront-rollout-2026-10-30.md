# Creator storefront preview integration

The preview fetches the published storefront DTO server-side in parallel with CMS identity and catalog data. It preserves CMS identity, checks featured-template ownership, resolves pins outside the initial catalog page, and falls back to the existing profile on malformed data, 404, failure, or a 2.5-second timeout. Public responses use no-store so unpublishing is not hidden by a page cache. The catalog remains owned by template-search.

The preview retains the prior local UI polish and creator profile design. No live Marketplace domain or routing changes are included. The local customization editor remains development-only; the Asset Dashboard owns persistent authoring.

Validation before deployment: Astro check 0 errors and 0 warnings (5 existing vendor hints), 16 tests, production build, and 11 HTTP route checks passed at 127.0.0.1:4382. No live customer profile was published for testing. Deployment verification is recorded separately after the hosted run.

The newly configured Source upload target failed archive validation before compiling. This release uses the established GitHub-linked preview at https://webflow-marketplace-source.webflow.io/ (app 477da3e6-4ef7-4d60-9256-d644f30fb856).
