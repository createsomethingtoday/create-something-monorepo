# Template Marketplace

A self-contained Next.js project for developing the Template Marketplace in a code-based environment, including Source by Webflow when preview access is available.

## Run locally

Requires Node.js 22 and npm. From this directory:

```sh
npm install
npm run dev -- --port 4317
```

Open http://localhost:4317/templates. No API key or environment-file setup is needed. The server reads the existing public Webflow catalog; an internet connection is required for catalog results and preview images.

```sh
npm run check
npm test
npm run build
npm start -- --port 4317
```

## Develop in Source

Use this directory as the project root, or extract the standalone archive into a repository. All runtime source, dependencies, fonts and tests are inside this project. There are no workspace package dependencies or imports from the monorepo.

Once Source preview access is available, connect the repository through its supported codebase connection flow. Use `npm install` for dependency setup, `npm run dev` for development, and `npm run build` for a production build. The app listens on `0.0.0.0` and accepts a port through the standard Next CLI.

Source currently advertises existing-codebase support, including Next.js. This project does not invent a Source SDK, manifest, import API, or deployment configuration. Successful import, visual editing, agent editing and deployment inside Source remain unverified until exercised with the preview account.

## Editing map

- `marketplace.config.ts`: homepage headline, description, lead collection and action color.
- `components/Marketplace.tsx`: image-led category discovery, collection rails, search/filter UX and detail composition.
- `components/useInfiniteCatalog.ts`: guarded append, keyed result caching, retry and return-to-results scroll restoration.
- `components/ListingSections.tsx` and `lib/listingContent.ts`: original creator descriptions, license, support, FAQ and features, extracted from public listings and sanitized.
- `components/PreviewDialog.tsx`: keyboard-accessible sandboxed previews and viewport controls.
- `PRODUCT.md` and `DESIGN.md`: product constraints and the Webflow design language.
- `components/TemplateCard.tsx`: existing Marketplace code component, copied with provenance so the project is portable.
- `app/globals.css`: Webflow typography, responsive page layouts and component surfaces.
- `lib/catalog.ts` and `app/api/catalog/route.ts`: bounded read-only catalog adapter.
- `lib/templateRoute.ts`: existing sort and route contract.
- `lib/templateUrlSafety.ts`: existing preview/link safety policy.

The project itself is the editable artifact. It does not simulate the Source editor or embed a fake agent workspace.

## Routes and behavior

- `/templates`: category discovery and featured, newest and free collections.
- `/templates/all`: query, category/subcategory, style/tag, creator, structure, collection, free-only and sort encoded in the URL; 24-item infinite batches with explicit retry. Opening a detail and using Back restores the prior items and scroll.
- `/templates/html/[slug]`: original structured descriptions, license/support/FAQ/features, related and creator discovery, responsive offer and sticky actions, plus a sandboxed preview. Purchase actions open the official listing.
- `/api/listing?slug=...`: bounded read-only public HTML adapter; selects the original description rather than unrelated rich text.
- `/api/catalog`: read-only first-party proxy to the public catalog. Unknown query fields are dropped and pagination is bounded.

No purchases, submissions, publication, credentials or production mutations occur in this project. The existing templates are Webflow Designer assets; Source compatibility and conversion have not been evaluated. The codebase being usable in Source does not imply the listed templates have been converted to Source projects.

## Prior art

Copied from CREATE SOMETHING monorepo base `7cf9b74f04600c677ca5fda2718457687e3cd469`:

- `packages/webflow-components/src/components/cards/TemplateCard.tsx`
- `packages/webflow-components/src/components/marketplace/templateRoute.ts`
- `packages/webflow-components/src/components/marketplace/templateUrlSafety.ts`
- `packages/webflow-dashboard/static/fonts/WFVisualSans-{RegularText,Medium,SemiBoldText}.woff`

Catalog contract and route approach informed by `apps/webflow-marketplace-category-cloud`. Visual and information-architecture reference: https://webflow.com/templates, inspected September 14, 2026. Source context: https://webflow.com/source. Fonts, Webflow branding and creator images are retained for authorized internal review; this is not an open-source template license or redistribution grant.

## Export

Run `npm run export` to create `../template-marketplace-source.tar.gz`. It includes the application, local assets, locked dependencies, tests and development guidance. Build output, installed dependencies and environment files are excluded. Product and design context accompany the source. Extract it, run `npm ci`, and start with `npm run dev`.
