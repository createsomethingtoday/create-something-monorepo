# Draw identity — approved local implementation

The approved isometric D direction is named Draft in the original comparison. The product name remains **Draw**; CREATE SOMETHING remains its publisher. This is an unreleased local implementation, not a release announcement.

## Assets and use

Editable SVG masters live in `../../static/brand/draw-*.svg`: dark/light at 32px and larger; optical small variants at 16/24px; mono/reverse with real transparent counters; app carrier; social image source. Keep the mark beside the word Draw in navigation. Amber is decorative, not a status signal. Preserve the existing Canon typography and colors.

The native PNG/ICNS files in `apps/draw-native/src-tauri/icons` were generated from `icon.svg` with the existing Tauri CLI 2.11.2 (`tauri icon INPUT --output OUTPUT`), then only the existing macOS target filenames were copied. No new dependency installation. The social SVG was rasterized with existing resvg 2.6.2 to the 1200×630 OG image.

`public-study.html` is self-contained. `public-study.jpg` is its browser-rendered public-safe board: actual empty local Canvas UI plus 16/24/32/64px, dark/light, and monochrome comparisons. It contains no personal artwork, credentials, socket paths, or system chrome. The board is explicitly labeled in progress and not a release announcement.

## Implementation boundary

Canvas, Motion, snapshot and download chrome, favicon, manifest, offline shell cache, product metadata, native window title, native icon resources, and social image are updated. Publisher metadata and attribution remain CREATE SOMETHING. The native `productName` remains `CREATE SOMETHING Draw` for compatibility with existing artifact/acceptance scripts; the visible window title is Draw. Bundle identifier, data paths, signing identity, version 0.1.0, and historical receipts are unchanged. Download availability and unsigned/not-notarized statements are unchanged.

No deployment, plugin registration, installed app replacement, signing, or provider attempt was performed for this identity change. Native Dock/Finder and About rendering require a later isolated bundle acceptance; current PNG/ICNS pixels and native frontend source are checked, not represented as an installed release. The pending read-only provider handoff remains separate.
