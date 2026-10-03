# Template Marketplace development

This is the Marketplace website project itself, intended for local and Source-based development. Do not recreate Source's editor inside the website.

## Working boundaries

- Database: read-only public catalog via `lib/catalog.ts` and `/api/catalog`.
- Automation: React/Next routes and filters. Preserve query URLs, creator attribution and actual prices.
- Judgment: keep production purchase and publication on their owning Webflow surfaces.
- `marketplace.config.ts` owns editable home-page content. `app/globals.css` owns the Webflow visual language. Preserve both unless the task explicitly changes them.
- TemplateCard and URL safety helpers have recorded provenance in README. Keep new changes local and test relevant contracts.
- Never label catalog templates Source-compatible without actual conversion/compatibility evidence.
- No private credentials are required. Do not add privileged Airtable/Webflow access to this public preview.

## Commands

`npm install`, `npm run dev`, `npm run check`, `npm test`, `npm run build`.

For UI changes, inspect desktop and mobile, keyboard focus, loading/error/empty states and relevant buyer journeys. Source import and runtime acceptance are distinct from local build success.
