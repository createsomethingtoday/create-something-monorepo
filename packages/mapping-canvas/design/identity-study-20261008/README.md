# Draw — standalone identity study

October 8, 2026. Three original vector directions for Micah's review. These files
are proposals, not installed branding. No app build, provider session, persistent
configuration, production page, signing configuration or user data was changed.

Open `index.html` directly or serve this directory on loopback. The task preview
is `http://127.0.0.1:50941/`. Select a concept and theme to update the app context,
macOS carrier and optical-size samples. The HTML has no external dependencies,
network requests, analytics or fonts. It uses the existing Canon font fallback
stack; the preview machine renders its locally available fallback.

## Directions

| Direction | Intent | Strength | Tradeoff |
| --- | --- | --- | --- |
| Fold | Isometric drawing plane with a turned edge | Most directly suggests a canvas; broad horizontal form | Can resemble a document/layer icon; stroke detail compresses at 16px |
| Draft (recommended) | Isometric extruded D | Strongest name connection, compact silhouette and app carrier | Counter needs optical tuning at favicon sizes; could read as a construction tool |
| Trace | An open drawing stroke across isometric axes | Expresses making a line; lightest structure | Can read as a P/arrow; less distinctive, especially at small sizes |

The proposed wordmark is simply **Draw**, medium/semibold in the existing Canon
sans stack with restrained spacing. It is a typographic treatment, not a finished
custom-lettered or outlined wordmark. Existing Draw chalk/amber are retained in
marks; the review surface uses Canon Performance paper/ink. No global palette or
font change is proposed. The CREATE SOMETHING logo is absent from primary product
chrome in the concept. Publisher attribution remains in About/footer/legal.

## Asset library

`marks/` contains 18 editable SVGs: dark, light, monochrome, reverse and a macOS carrier
study for each direction, plus three Draft optical masters. They include accessible labels and contain no remote
references, embedded raster images or scripts. App carriers use 1024-unit artboards
with an inset rounded square. This is a visual study, not an Apple template or a
signed .app/icon.icns delivery. Do not replace production icon files yet.

`review-dark.jpg` and `review-light.jpg` show Draft in context. Fold/Trace context
screenshots and a 390px mobile review are included. Screenshots were captured
through the in-app browser. The browser tab is retained as a deliverable. The bundle is prepared for Library delivery; no native app installation is claimed.

Monochrome SVGs are dark-on-light studies. Fold's negative stroke currently uses
the light surface color; it needs a real knockout path before production use on
arbitrary backgrounds. A selected direction will receive final monochrome/reverse
and optical masters before any propagation. Original construction is not a
trademark clearance; no third-party marks or tldraw geometry were copied.

## Existing placements inspected

| Current source | Current role | Proposed treatment after selection |
| --- | --- | --- |
| `src/routes/+page.svelte` | CREATE SOMETHING .agency logo then Draw | Standalone mark + Draw; retain Mac/Source and application controls |
| `src/routes/s/[shareId]/+page.svelte`, `+error.svelte` | Publisher logo on public snapshot/error | Same compact Draw lockup, no authority/control changes |
| `src/routes/download/+page.svelte` | Publisher masthead, Draw product copy | Draw masthead; retain factual publisher and exact-artifact warnings/status |
| `static/icon.svg` | Browser squiggle + amber diamond | Selected optical favicon/PWA mark |
| `apps/draw-native/src-tauri/icons/` | Double-ring publisher mark + amber stroke | Selected native iconset after pixel review and bundle acceptance |
| `static/manifest.webmanifest`, route metadata, `static/llms.txt` | Product name/public discovery | Draw as product; CREATE SOMETHING remains publisher/author |
| `static/service-worker.js`, `src/routes/metadata.test.ts` | Cached logo and identity assertions | Update together with chosen assets; test stale-cache behavior |
| `apps/draw-native/src-tauri/tauri.conf.json` | Product/window display names and signing identity | Later review display naming separately; preserve identifier, signing owner and data paths |
| Native README and future About | Product/support/release facts | Draw title; factual “Published by CREATE SOMETHING” attribution |

This study does not rename `agency.createsomething.draw`, change the canonical
URL, create a company, migrate data, purchase a domain, replace an installed app,
or alter downloads. Source/release mismatches from the offline audit still apply.

## Review boundary

The existing native 128px ring icon and browser/native SVG sources were inspected.
All three new concepts were reviewed as rendered pixels in context. The preview
loaded all images without horizontal overflow at 390px. Selection/theme controls
updated their accessible pressed state and visible image sources. No animation
is used. A visible focus outline is provided; contextual marks beside Draw are
decorative, while standalone icon samples have names. Marks are not status colors.

Before propagation: choose a direction, refine the 16/24px master, finish true
knockouts/reverse assets, compare macOS Dock/Finder optical size against actual
system peers in a disposable app bundle, then update the mapped placements with
metadata/cache tests. Native icon rendering in Finder/Dock remains unperformed. Existing native-control availability is limited, and the
pending approved provider-read handoff was not interrupted by this study.


Independent design review recommended Draft and requested a larger 16/24px
counter and a lower, slightly larger mark in the native carrier. Those refinements
are included in this revision. The optical strip now uses dedicated small masters;
normal masters remain at 32px and above. Black and white monochrome studies are
included. Font delivery is still a declared Canon fallback (no Geist font file is
bundled), so final lockup spacing must be checked with the actual application font.

The Fold/Trace and mobile screenshots record the initial comparison; Draft dark/light screenshots reflect the optical refinements.
