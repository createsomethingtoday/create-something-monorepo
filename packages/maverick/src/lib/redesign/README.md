# September 2026 client design

CRE-1991 promotes the CRE-1511 preview direction and September 11 client HTML updates into the maintained SvelteKit application. The former staging worktree was removed without committing its implementation, so these source routes reconstruct the supplied design rather than embedding its runtime.

- `content.ts`: client-approved applications, leadership and news.
- `Header.svelte` / `Footer.svelte`: native route links and contact triggers; mobile navigation.
- `Media.svelte`: existing production R2 videos with local fallback images and reduced-motion support. Watermarked prototype video assets were not imported.
- `fonts.css`, `static/redesign/`: self-hosted Barlow fonts and seven client-provided portraits extracted from the supplied HTML; prototype JavaScript excluded.
- `design.css`: styles scoped to the five marketing routes; admin, water treatment and legal pages retain existing layouts.

The incomplete visible PetroX paragraph is restored from the complete sentence in the reference's underlying template. The Yahoo rebrand URL returned 429 during verification; the news item links to the verified original company release on GlobeNewswire instead.

## Content and integration boundaries

Existing KV namespaces, page keys, admin API, D1, R2, contact modal and `/api/contact` delivery/recipients are retained. No data migrations or secret changes are required. Legacy content fields remain stored; they do not override the new approved marketing copy. Optional `redesign.title` and `redesign.subtitle` in `home`, `petrox`, and `lithx` allow deliberate CMS overrides. `news.redesign.articles` can override the approved articles using `{ date, kind, title, source, url }` records. Leadership is versioned in `content.ts`.

## Verification and rollback

Run package `check` and `build`, then `node packages/maverick/scripts/verify-release.mjs <origin>`. This HTTP check supports, but does not replace, desktop/mobile browser checks of navigation, portraits, media, contact focus/validation/close and reload persistence. It only sends an empty invalid contact payload, rejected before persistence or email.

Before production, record the current Cloudflare Pages deployment. Baseline production: `21bde5fb-509b-4c7c-8238-0cbd38c2d5c6` (main source `d85c80c`); baseline preview: `4cf89236-8b15-4e78-a2de-d77ce71d3dae`. Use the Pages production rollback action for the baseline deployment if promotion fails. Canonical production is `https://www.maverickx.com`; preview alias is `https://preview.maverick-x.pages.dev`.

## Preview video scope

The latest user instruction limits delivery to preview. Media uses the six exact MP4s from the supplied local HTML, including its existing stock watermarks. reference-media.json records source IDs and SHA256 hashes. Oil and Mining heroes use separate clips from their supporting cards; News shares the Oil supporting clip. About has its own clip. Production promotion is not authorized by this preview change.

September 11 follow-up: homepage clip replaced with supplied unwatermarked 197985421 H264HD720 file, preserved byte-for-byte. Hero media now uses full opacity with lighter localized gradients for text contrast; sector gradients also lightened. Preview only.
