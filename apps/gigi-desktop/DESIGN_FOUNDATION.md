# GiGi: React and Astryx

GiGi's application UI is rewritten in React 19 using Meta Astryx Core 0.7.11.
The user selected Astryx on 2026-11-08 and clarified that the scope is a full
component rewrite. This supersedes the earlier CSS-only adaptation.

`index.html` loads `ui/main.jsx`; Vite builds `dist`, which Tauri now packages.
The production entry does not load `web/index.html`, the old stylesheet stack,
or the old HTML-string renderer. Existing pure models and native APIs remain.

## Ownership and parity

- `ui/App.jsx`: actual Astryx AppShell, navigation and guarded dialogs.
- `ui/records.jsx`: Today, attention, all record collections, date agenda, editors,
  full/source details, relations, history and incomplete financial summaries.
- `ui/settings.jsx`: onboarding, consent/verification, bounded preview/import,
  receipts/recovery, agent/AI setup, notifications, diagnostics, backups and CTX.
- `ui/appearance.jsx`: saved theme/view/chat preferences and configuration sharing.
- `ui/chat*.jsx`: Astryx chat, safe React prose/code/tables, approval comparisons,
  recovery, selection/drafts, response text preferences and workspace search.
- `ui/creators.jsx`: Music, native media references, revision-safe organization,
  artwork/provenance/recovery, Instagram draft/verified review/exact publication.
- `ui/components.jsx`: small actual-component adapters. Controlled Astryx fields
  bridge to native FormData without weakening transaction guards.
- `ui/controller.mjs`: transaction, route, stale-read/write and consent/approval
  logic extracted from the existing app. It generates no HTML.
- `ui/app.css`: product states, preference behavior, calendar positioning and
  decorative composition; Astryx component props own the application frame,
  rows, spacing, typography and shapes.

The old `web` renderer and its tests remain a behavioral reference. Those tests
alone do not validate React. The new browser harness exercises the actual React
entry, components and extracted controller. The Rust database, tool API, profiles,
source permissions and native transaction contracts are unchanged.

This serves Database (records and provenance), Automation (native actions) and
Judgment (consent, approvals, recovery and receipt interpretation).

## Actual package and theme setup

Core/CLI/Neutral are pinned together at **0.7.11**; React/ReactDOM at **19.2.4**
and StyleX runtime at **0.19.1**. Astryx's prebuilt component CSS/JS is used; no
copy of its components or custom StyleX compiler is introduced.

Danny’s published DEV interface remains the approved layout baseline. The public 0.3.5 reconciliation imports the active React navigation, weekly Today, Calm Tasks/Gigs, G-train green, combined Search and guided/connected setup from Grantbot’s reviewed 71594fb source. `dev-*` source names identify that provenance; the shipped app remains the public GiGi identity. The technical foundation supplements his UI direction. Follow-up review replaces imported raw layout containers with actual Astryx layout and typography components and their spacing props. Decorative collage coordinates remain separate from the application layout. Partial and cancelled source imports offer an explicit recovery preview, including retries beginning at the first page; saving still requires a reviewed preview and approval. An unconfirmed import keeps its exact pending job until receipt and record readbacks succeed; continuation cannot replace that recovery reference.

`astryx-themes.js` registers the generated `gigiDevTheme`, extending Neutral with the approved green for Studio and Paper. `ui/gigi-dev-theme.ts` and `ui/gigi-theme.ts` compile into local assets; the latter supplies Midnight. Existing theme IDs and preference schemas remain stable. Generated Theme previews use the same definitions.

Figtree's local variable font is sourced from pinned
`@fontsource-variable/figtree@5.3.0`, with its SIL license in
`third-party/Figtree-OFL.txt` and the bundled `public/licenses` notices. Vite aliases Astryx's Google-font stylesheet to
`ui/fonts.css`; neither app UI nor fonts need a remote request. Doctor cannot
resolve that build alias and reports a font-proof warning; the browser harness
verifies the actual font loads and no external requests occur.

## Browser and native boundaries

[Official browser guidance](https://astryx.atmeta.com/docs/browser-support)
identifies light-dark(), Popover and CSS anchors as capability boundaries.
GiGi uses explicit theme-token resolution when light-dark() is unavailable and
Astryx modal selector sheets in the native host and when CSS anchors are
unavailable. Native WebKit exposed anchor support but failed to display the
anchored currency menu during exact-app inspection; the modal sheet keeps all
choices visible and returns focus. Date fields use Astryx TextInput with ISO
input under the same policy. These fallbacks preserve the existing macOS
minimum; they are not a claim of tested macOS 13/WebKit support.

Tauri builds target Safari 16.4 syntax. Native WebKit at the advertised platform
floor still needs exact-artifact verification. The CSP retains the existing
script and connection restrictions. Style attributes are now allowed because
Astryx/React set layout properties; user-supplied HTML, CSS and scripts are never
rendered as trusted content.

## Reviewed official sources

The Astryx site and Button preview were directly inspected; installed pinned
package APIs, generated agent guidance, layout templates and browser-support
docs were read before implementation.

- [Getting started](https://astryx.atmeta.com/docs/getting-started): actual React
  setup, prebuilt CSS, Theme and package compatibility.
- [Principles](https://astryx.atmeta.com/docs/principles) and
  [layout](https://astryx.atmeta.com/docs/layout): frame first; dense data as rows.
- [Tokens](https://astryx.atmeta.com/docs/tokens),
  [typography](https://astryx.atmeta.com/docs/typography),
  [spacing](https://astryx.atmeta.com/docs/spacing),
  [shape](https://astryx.atmeta.com/docs/shape): semantic component roles.
- [Elevation](https://astryx.atmeta.com/docs/elevation) and
  [motion](https://astryx.atmeta.com/docs/motion): state/depth meaning and reduced motion.
- [Button](https://astryx.atmeta.com/components/Button): primary, secondary,
  destructive and keyboard behavior.

Supporting appearance research from the prior review remains documented in
`evidence/astryx-foundation/REVIEW.md`. Astryx now owns the component foundation;
outside product layouts and assets were not copied.

## Verify and deliver

After repository bootstrap, from this app:

```sh
pnpm build:web
pnpm test
pnpm test:rewrite
pnpm astryx doctor --built dist
pnpm dev:web
```

Development-only `?fixture=overview` (or a route name) selects synthetic data;
`theme=paper|midnight` and `density=compact` exercise appearance. It never invokes
Tauri or a real provider. Vite excludes the fixture module from production.

See `evidence/astryx-rewrite/REVIEW.md` and CRE-2373 for evidence and limits.
Source/build/browser acceptance is separate from native WebKit, picker/media,
provider, signing/notarization and installer distribution acceptance.

Rollback: revert the rewrite source commit and restore the previous Tauri
frontendDist/build command. No database or preference migration is involved.
