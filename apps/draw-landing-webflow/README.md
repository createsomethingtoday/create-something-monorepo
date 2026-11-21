# DRAW landing page

This Astro app is the review candidate for the public DRAW landing at `https://draw.createsomething.agency/download`. The browser canvas continues to run at `https://draw.createsomething.agency/`. The Mac preview is distributed individually.

## Local review

Use Node.js 22.12 or newer. From this directory, run:

```sh
npm ci --workspaces=false
npm run build
npm run preview -- --port 4321
```

Open `http://127.0.0.1:4321/`. For development, use `npm run dev`. The design follows Lexington Alfred’s landing sections with DRAW-specific illustrations and copy. The page works with JavaScript disabled. The heading and body fonts load through the font services used by Alfred.

## Webflow Cloud review deployment

The approved landing page is hosted at [draw-landing-review.webflow.io](https://draw-landing-review.webflow.io/). The operator approved public visitor access. Webflow provisioned a standalone app with a single environment named `main` mounted at `/`. It serves the review site. The live editor and original download route continue to use draw.createsomething.agency.

The manifest records the Webflow site, app and environment IDs. Deployment `fed3abb2-7031-4913-b12a-1dc21b4b6f3a` is the first verified public review deployment. To inspect the linked target before a future deployment, run:

```sh
npx --yes @webflow/webflow-cli@2.18.0 apps deploy --dry-run --json --no-input --environment main --mount /
```

Keep the canonical URL on the existing landing page until cutover is approved. Rollback of this review deployment does not require changing the live editor.
