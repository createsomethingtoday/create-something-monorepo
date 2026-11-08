# GiGi design foundation

GiGi uses Meta's Astryx foundations as its product design contract. The user
selected this direction on 2026-11-08. The runtime implementation is
[`web/foundation.css`](web/foundation.css), a framework-neutral adaptation for
GiGi's existing Tauri HTML/ESM renderer. It does not install or claim to render
Astryx React components. The official component package requires React 19+;
a component migration would be separate work.

This serves the Database tier through readable records and state, and the
Judgment tier through explicit consent, approval and receipt presentation.
Presentation changes do not change those workflows or their authority.

## Reviewed source and translation

The official docs and Button preview were inspected in the browser on
2026-11-08 (Button docs identified Core v0.7.11).

| Reference | Adopt in GiGi | Boundary |
| --- | --- | --- |
| [Principles](https://astryx.atmeta.com/docs/principles) | Semantic roles; decide the frame before content; dense data stays in rows with dividers | Existing navigation and optional saved card view remain |
| [Tokens](https://astryx.atmeta.com/docs/tokens) and [Color](https://astryx.atmeta.com/docs/color) | Purpose-named colors; neutral light/dark surfaces; separate status foregrounds and backgrounds | Stronger control borders and secondary text for contrast; Midnight retains its local identity |
| [Spacing](https://astryx.atmeta.com/docs/spacing) | 4px base, rem-based gaps and padding | 44px primary action target retained; supported window stays 880×620 |
| [Typography](https://astryx.atmeta.com/docs/typography) | 14px body, 24/20/17px heading hierarchy, supporting text and consistent leading | System fonts are local and available offline; user chat size still wins |
| [Shape](https://astryx.atmeta.com/docs/shape) | 8px inner, 12px control, 16px container roles | Artwork and media keep their proportions |
| [Elevation](https://astryx.atmeta.com/docs/elevation) | Flat inline surfaces; medium popovers and high dialogs | No decorative shadows on every card |
| [Motion](https://astryx.atmeta.com/docs/motion) | Fast interaction feedback; medium panel entrance; shared easing | Reduced motion disables transitions; no spring/gesture-engine claims |
| [Button](https://astryx.atmeta.com/components/Button) | Clear primary, secondary, text and destructive states | Native HTML semantics and existing handlers retained |
| [Getting started](https://astryx.atmeta.com/docs/getting-started) | Explicit cascade and framework requirements | No React/StyleX dependency added to a plain ESM app |

Supporting static appearance references were inspected through Mobbin:

| Reference | Why / adopt | Avoid |
| --- | --- | --- |
| [Revolut appearance](https://mobbin.com/screens/d6d26e5a-fcb7-4903-bc5b-af4099a0df59) | Distinct selected theme preview | Background effects and banking navigation |
| [Sprig settings](https://mobbin.com/screens/bec05de8-cf7f-4c59-97bb-2dc01212df32) | Separate appearance from account setup | CSS authoring and its product layout |
| [hilos appearance](https://mobbin.com/screens/c1fcba88-fba8-43f1-9eb3-90914d71e75d) | Honest previews plus readable text/spacing controls | Its palette, fonts and modal composition |

These support GiGi's existing Appearance flow. They do not dictate identity or
prove motion behavior. No third-party screenshots or assets are retained.

## Ownership

`foundation.css` owns primitives, theme colors, compatibility aliases and shared
control anatomy. Feature sheets use semantic variables. Older feature-specific
layout rules remain local; superseded root palette definitions were removed from
`style.css`, `reference-layout.css`, `studio.css` and `preferences.css`.
`foundation.css` loads after these sheets. `chat.css` stays last so chat width,
text size and spacing preferences remain authoritative.

Search uses one borderless 17px query row inside its 16px dialog container. Its
focus indicator spans the row; rounding an unfilled inner input would add no
visible control boundary. This is an intentional shared-container exception.

Studio and Paper adapt Astryx's neutral dark/light roles. Midnight uses the same
roles with GiGi's deeper slate surfaces. Stored IDs (`studio`, `paper`,
`midnight`) and preference schema are unchanged. Theme previews consume these
same palette roles instead of maintaining separate swatches.

The `canon-overlay` directory records house governance and registry compatibility;
its theme is not loaded by this renderer. It must not be mistaken for the
runtime palette. Canon's consent, provenance and approval policies still apply.

## Verification

Run from the app directory after `pnpm bootstrap:worktree` at the repo root:

```sh
node --test web/*.test.mjs scripts/*.test.mjs
node scripts/astryx-foundation-browser.mjs --check --out /tmp/gigi-astryx-evidence
node scripts/astryx-foundation-browser.mjs --serve --port 4383
```

The preview server serves the actual app source with synthetic records and a
denied native bridge; it never opens a user's profile or a provider. Direct
review routes include `?fixture=overview`, `appearance`, `tasks`, `settings`,
and `chat`; `theme=paper|midnight`, `density=compact`, `empty=1`, and
`state=approval` select states. The harness cannot establish production source
consent/import, native WebKit, signing/notarization or installed-app acceptance.

Acceptance covers all themes and densities at 880×620 and 1280×840; contrast;
shared control shape; keyboard focus and More-menu recovery; unsaved drafts;
empty/error/approval states; saved appearance/chat preferences; reduced motion;
and direct perceptual review of the rendered output. See CRE-2373 for the final
evidence and promotion state.

Rollback: revert the scoped foundation commit and restore the previous stylesheet
order. There is no database or stored-preference migration to undo.
