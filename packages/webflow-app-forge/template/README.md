# __APP_NAME__

A Webflow Designer Extension, scaffolded by the internal Webflow App Forge so it starts compliant with Marketplace review.

## Develop

```bash
npm install
npm run dev
```

`webflow extension serve` prints a Development URL. Paste it into the Apps panel in the Designer to load the extension. Webpack rebuilds on save.

## Build for review

```bash
npm run build
```

This typechecks, builds a production bundle, and writes two artifacts:

| Artifact | Where | Goes to |
| --- | --- | --- |
| `bundle.zip` | project root | App version manager (the public artifact customers run) |
| `review-artifacts/bundle.js.map` | project root | The submission form's private source-map upload |

Never copy the `.map` into `public/`. The doctor fails the build if a map lands in the bundle.

## Check before you submit

From the monorepo:

```bash
wf-forge doctor .                 # bundle.zip + review-artifacts
wf-forge listing listing.json     # copy, assets, URLs
wf-forge packet . listing.json    # submission packet + human gates
```

Then run App Review Preflight in the Designer on the same `bundle.zip` and `.map`, and paste the `wfpre_` receipt into the form.

## What the scaffold already decided

- **No site changes on load.** The only mutating path is a click handler.
- **Sections by tag.** `isSectionElement()` uses `getTag()`, because preset-created sections report `type: 'Block'`.
- **`webflow.notify`, not `alert()`.** ESLint blocks `alert`, `confirm`, `prompt`, `eval`, `window.parent`, and `dangerouslySetInnerHTML`.
- **Styles in a stylesheet.** No `style-loader`, so nothing injects `<style>` at runtime.
- **Consent gate, no SDK.** `src/consent.ts` is a no-op until the user agrees and until you wire a vendor in. If you add analytics, name the vendor in the listing and privacy policy.
- **Webflow App colors and Inter.** `public/styles.css` carries the published tokens. Inter falls back to the system font; if you load it from Google Fonts, declare that external connection in your review notes.

## What only you can do

A privacy policy and terms page that describe what this App really does. A 2 to 5 minute demo video from install to usage. Real screenshots at 1280x846. A published `.webflow.io` testing site with the App installed. Two-factor auth on an admin of the submitting Workspace. One developer account. The submit click.
