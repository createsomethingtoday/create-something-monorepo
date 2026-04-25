# Published Component Signal Validation — 2026-04-24

Scope: validate the published-only component-signal patch that combines DOM structure and stylesheet variant selectors to improve `components.nav_footer_cta` when Designer preview extraction is skipped or unavailable.

Targets:
- Published URL: `https://athelas-template.webflow.io/`
- Fresh worker URL: `https://webflow-site-analyzer-mcp-remote.createsomething.workers.dev/mcp`
- Canonical URL: `https://analyzer.mcp.createsomething.agency/mcp`
- Deployed worker version: `ec2bc1d8-bd09-406f-b8da-888337ca5962`

## Local Verification

- `pnpm --dir packages/webflow-site-analyzer-mcp test` passed
- `git diff --check` passed

## Live Validation

Input:
- `run_template_review`
- `designerMode=skip`
- `includeManual=true`
- `crawlMaxPages=1`
- `crawlMaxDepth=0`
- `timeout=30000`

Fresh worker result (`workers.dev`):

- `components.nav_footer_cta.status=partial`
- `components.nav_footer_cta.confidence=0.49`
- evidence:
  - `publishedHasNav=true`
  - `publishedHasFooter=true`
  - `publishedCtaCount=19`
  - `publishedVariantSelectors=13`
  - sample `w-variant-*` selectors were returned

Associated published signals on the same page:

- `summary.styles.accessibleStyleSheets=4`
- `summary.styles.blockedStyleSheets=1`
- `summary.styles.breakpointHints=["479","767","991"]`
- `summary.styles.definedVariables=245`
- `summary.styles.usedVariables=32`
- `summary.styles.variableCategories=["color","spacing","typography"]`
- `summary.styles.baseTagVariableRules=9`
- `summary.styles.componentVariantSelectors=13`
- `summary.structure.hasNav=true`
- `summary.structure.hasFooter=true`
- `summary.structure.ctaCount=19`

Canonical domain result (`analyzer.mcp.createsomething.agency`):

- First request returned `503` during propagation
- Retry succeeded and returned the same `components.nav_footer_cta.status=partial` result with the same published evidence shape

## Conclusion

The patch worked as intended.

Published-only review can now provide reviewer-useful component evidence without claiming full Designer truth:

- nav/footer/CTA structure exists in the published DOM
- reusable component/variant machinery is visible in shipped CSS via `w-variant-*`
- the row degrades from `manual` to `partial`, not `pass`

This is the correct confidence posture:

- useful reviewer insight from published output
- no overclaim that the Components panel itself was validated
