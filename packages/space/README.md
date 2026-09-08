# CREATE SOMETHING Space

**createsomething.space — The public workshop.**

Tools, workflows, skills, plugins, and building blocks shaped by CREATE SOMETHING's work. Community use comes first; source access does not include hosting or managed support.

## Routes

- `/`: selected projects and a permanent Workbench entrance.
- `/projects`: searchable collection with URL-backed query and type filters.
- `/projects/[slug]`: purpose, usage, boundaries, and public source/install destinations.
- `/workbench`: the previous interactive workbench homepage.
- `/about`: contribution and publishing context.

Existing tools retain their addresses: `/playground`, `/praxis`, `/motion`, `/data` (including all NBA views), and `/discover` (including concepts).

## Catalog ownership

`src/lib/workshop/catalog.ts` is the curated public catalog. It supplies project pages, search, and sitemap entries. Keep source libraries distinct from installable packages. Adding an entry requires a verified public destination, a useful description, usage limits, and a source/installation distinction. Do not import the private discovery inventory or client operational material. Related slugs must resolve.

The supported source archive policy remains `config/public-distribution.v1.json`; catalog inclusion does not expand that archive or claim package GA. `.io` owns deeper research, `.agency` commissioned work, and GitHub source and contributions.

## Imagery

`static/images/workshop` follows the Agency's material-study language. See its README for provenance. Images are conceptual illustrations, not software screenshots or runtime proof.

## Development and verification

Run `pnpm bootstrap:worktree` from a new worktree, then `pnpm --filter @create-something/space dev`.

- `pnpm --filter @create-something/space check`
- `pnpm --filter @create-something/space build`
- `pnpm performance:pages:check`

Before promotion, verify desktop/mobile project search, type filtering, empty results, detail/source links, Workbench access, old routes, and reload. Deployment follows the repository PR and production verification workflow.

Browser build target follows Vite 7: Chrome/Edge 107+, Firefox 104+, Safari 16+. The top-level-await plugin receives this explicitly so it cannot restore its older implicit defaults.
