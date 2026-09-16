# Understanding: .space

.space is the public workshop: find, try, and reuse CREATE SOMETHING's work. .io explains research; .agency delivers commissioned systems.

## Ownership

- Database: `src/lib/workshop/catalog.ts` owns public project descriptions and source destinations.
- Automation: SvelteKit routes render the catalog, filter queries, details, search, sitemap, and existing tools.
- Judgment: publication requires public-source verification and honest usage limits. A source entry is not a tested standalone release.

## To Understand This Package, Read

- `src/routes/+page.svelte`: curated workshop introduction.
- `src/routes/projects`: searchable collection and project pages.
- `src/routes/workbench/+page.svelte`: retained previous experience.
- `src/routes/+layout.svelte`: shared navigation and quick search.
- `src/lib/search/sitemap.ts`: static, concept, and catalog route discovery.

The Playground, Praxis, Motion Lab, Data Studio, and Discover routes keep their original URLs. Their runtime implementations are independent of the catalog. A passing catalog test does not prove those external execution services healthy.

Read README.md and package-local AGENTS.md for validation. Update this document with route ownership changes; do not resurrect the retired lessons/experiments structure from historical documents.
