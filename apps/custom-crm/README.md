# On-demand custom CRM

A static landing page for [crm.createsomething.agency](https://crm.createsomething.agency/). It shows how a signed scope becomes a delivery brief and sends project inquiries to the Agency contact form. Northline Studio is an illustrative account.

The site uses the Agency’s November 20 Canon inspection poster and locally served type. The design draws on Lexington’s Brightlight layout. The repository contains the original CRM page implementation.

## Local preview

From the repository root with Wrangler installed, run:

```sh
node scripts/run-wrangler.mjs --cwd apps/custom-crm dev --local --port 18536
```

The Cook capture script opens the local page with Chrome, checks six viewport widths with JavaScript disabled, and saves screenshots. Supply PLAYWRIGHT_PATH when Playwright is installed outside the working directory.

```sh
node cook/custom-crm/capture.cjs local
```

## Release

The Worker serves the public directory directly. Its custom domain is configured in wrangler.jsonc. After review, run the deployable asset check and deploy from the reviewed revision.

```sh
node scripts/run-wrangler.mjs --cwd apps/custom-crm deploy --dry-run
node scripts/run-wrangler.mjs --cwd apps/custom-crm deploy
```

Verify the published HTML, CSS and poster against the reviewed files, then exercise the inquiry link in a browser. For the initial release, unbind the new hostname to withdraw the page. For subsequent versions, restore the last verified Worker deployment.
