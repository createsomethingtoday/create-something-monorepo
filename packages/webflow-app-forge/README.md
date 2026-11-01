# Webflow App Forge

Internal tool. It scaffolds a Webflow Designer Extension that starts compliant with Marketplace review, checks the built bundle and the listing against a versioned requirements registry, and assembles the submission packet. It never submits.

Scope: **Designer Extension-only Apps.** No Data Client, no Webflow OAuth scopes, no Install URL, no code injected into customer sites. That scope removes the largest rejection families (OAuth and Install URL, excess scopes, backend trusting the client, uninstall cleanup) by construction. Linear: CRE-2226.

## Use it

From the monorepo root:

```bash
pnpm forge new ../section-namer --name "Section Namer"
cd ../section-namer && npm install && npm run dev      # load the Development URL in the Designer
npm run build                                           # bundle.zip + review-artifacts/bundle.js.map
pnpm forge doctor .                                     # bundle checks
pnpm forge listing --example > listing.json             # fill it in, point it at real assets
pnpm forge listing listing.json                         # copy, assets, URLs
pnpm forge packet . listing.json                        # submission-packet/{packet.json,CHECKLIST.md}
```

Then run App Review Preflight in the Designer on the same `bundle.zip` and `.map`, paste the `wfpre_` receipt into the form at <https://developers.webflow.com/submit>, and work the human gates in `CHECKLIST.md`.

`doctor` and `listing` exit 1 when a blocker or required finding is open. Use `--json` for machine output.

## What is in the box

| Path | Tier | What it is |
| --- | --- | --- |
| `registry/requirements.json` | Database | 54 requirements for a DE-only App. Each carries a provenance tag (`published`, `control`, `reviewer-practice`), a severity, the layer that enforces it, and a check id. |
| `template/` | Automation | A React + TypeScript Designer Extension over the official CLI layout, with the review rules baked in. |
| `src/doctor.mjs` | Automation | Reads `bundle.zip` and `review-artifacts/`, reports against the registry. |
| `src/listing-kit.mjs` | Automation | Checks listing copy, icon, screenshots, URLs, pricing, testing site. Reuses the submission form's own rules. |
| `src/packet.mjs` | Judgment | Prefills the form's field names, maps every requirement to a status, lists the gates only a person can close. |
| `skills/webflow-app-forge/` (monorepo root) | Touchpoint | The Claude Code skill that orchestrates the above. |

### The registry is the source of truth

Every finding the doctor or listing kit emits carries the registry ids it serves, and the packet's coverage table shows every requirement with `pass`, `fail`, `warn`, `skip`, `human`, or `not-run`. The test suite fails if an automated check id in the registry has no implementer, so the registry cannot quietly promise a check that does not exist.

Provenance matters because the target moves. Reviewers reject on some rules the docs do not state (inline styles under CSP, analytics consent inside the extension). Those are tagged `reviewer-practice` and are encoded here only because this tool is internal. The 8/17 changelog promise is "if it isn't published we don't hold your submission to it", so a public version of this tool must drop or relabel them.

### The template decides these for you

- Production webpack build writes a **hidden source map to `review-artifacts/`**, never into `public/`. Development builds use `cheap-module-source-map`, so even a dev bundle has no `eval()` wrappers.
- **No `style-loader`.** Styles live in `public/styles.css`, which carries the published Webflow App color and type tokens.
- **ESLint blocks** `alert`/`confirm`/`prompt`, `eval`, `new Function`, `javascript:` URLs, `window.parent`/`window.top`, `document.write`, `dangerouslySetInnerHTML`, and `element.type === 'Section'`.
- **Sections by tag.** `isSectionElement()` uses `getTag()`, because preset-created sections report `type: 'Block'`.
- **Nothing mutates on load.** The only site change is in a click handler.
- **Consent gate with no SDK.** `src/consent.ts` is a no-op until the user agrees and until a vendor is wired in.

### What the doctor deliberately does not flag

Production React includes the `reactjs.org/docs/error-decoder` URL in its minified error formatter, so that URL proves nothing about build mode. The doctor looks for markers that differ between development and production output (`react-dom.development.js`, `"Warning: ..."` strings, unreplaced `process.env.NODE_ENV`, webpack eval wrappers, hot-update residue). The same reasoning applies to a bare `localhost` literal in a library fallback: not residue. A localhost URL with a port or path, or any tunnel host, is.

### Vendored form rules

`src/vendor/form-rules/` is a one-way copy of seven self-contained rule modules from `webflow/wf-app-form-cloud`, the submission form. They were calibrated against approved and rejected live listings. `VENDOR.json` records the source commit. Re-sync with:

```bash
pnpm --filter @create-something/webflow-app-forge sync:form-rules [path-to-checkout]
```

## What only a person can do

The packet lists these as gates and the tool does not pretend otherwise: a privacy policy and terms page that describe what the App really does (this tool emits a disclosure outline and never writes legal text), the 2 to 5 minute demo video, real screenshots, a published `.webflow.io` testing site with the App installed, two-factor auth on an admin of the submitting Workspace, one developer account, the Preflight run and receipt, and the submit click.

## Develop

```bash
pnpm --filter @create-something/webflow-app-forge test     # node:test, 34 tests, fixtures built on the fly
pnpm --filter @create-something/webflow-app-forge lint
```

Acceptance: an App scaffolded from the template, built with `npm run build`, must come back `READY` from `doctor` with zero blockers or required findings, and the example listing with spec-conformant assets must come back `READY` from `listing`. Both were verified on 2026-10-05 with Webflow CLI 2.8.0-next.2, webpack 5.111, and `@webflow/designer-extension-typings` 2.2.2.

## Sources

- Marketplace Guidelines, Submitting your App, Listing your App, Designer Extension design guidelines on developers.webflow.com
- `output/app-review-gap-analysis-2026-09-30.md` (532 rejections Jul–Sep 2026 crosswalked to the docs and to Preflight)
- `skills/webflow-app-preflight/` (quality gate, governance pitfalls, listing reference)
- `webflow/wf-app-form-cloud` lib rules (vendored)
