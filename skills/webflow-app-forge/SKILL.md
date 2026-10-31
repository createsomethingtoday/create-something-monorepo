---
name: webflow-app-forge
description: Internal. Create a Webflow Designer Extension App that passes Marketplace review, from scaffold to submission packet. Use when asked to build, generate, or scaffold a Designer Extension for the Marketplace, to check a built extension bundle before App Review Preflight, to validate listing copy, icon, screenshots, or legal URLs, or to assemble a submission packet. Designer Extension-only; for Data Client or Hybrid Apps, OAuth scopes, or injected scripts use webflow-app-preflight. For issued review findings use webflow-app-review-remediation.
---

# Webflow App Forge

Build a Designer Extension that starts compliant, prove it against the requirements registry, and hand the developer a packet with the gates only they can close. Never submit on anyone's behalf and never promise approval.

Tooling lives in `packages/webflow-app-forge/` in the CREATE SOMETHING monorepo. Run it from the monorepo root as `pnpm forge <command>` or `node packages/webflow-app-forge/src/cli.mjs <command>`.

## Decide scope first

This skill covers **Designer Extension-only** Apps: UI inside the Designer, Designer APIs only, no Webflow Data API, no OAuth scopes, no Install URL, no code delivered to customer sites. If the App needs any of those, stop and switch to `webflow-app-preflight`, which handles Data Client and Hybrid Apps. Do not register a Data Client "to have OAuth"; every capability registered is something the reviewer must verify.

## Phase 1: Scaffold

```bash
pnpm forge new <dir> --name "Product Name"
```

The name must be the real product name: 30 characters or fewer, no Webflow mark, not a placeholder. The scaffold refuses otherwise. It copies `template/` and fills `__APP_NAME__` and `__APP_SLUG__`.

Then in the new directory: `npm install`, `npm run dev`, and paste the printed Development URL into the Designer's Apps panel.

What the template already settled, and what to keep when you write the App's real work:

- The only code path that changes the site is a click handler. Read on load, mutate on click.
- Sections are identified with `isSectionElement()` (uses `getTag()`), never `element.type === 'Section'`.
- Results go through `notify()` (wraps `webflow.notify`), never `alert()`.
- Styles go in `public/styles.css`. Do not add `style-loader` or inline `style=` attributes.
- Analytics, if ever added, go through `src/consent.ts` and the vendor is named in the listing and privacy policy.
- ESLint enforces the above. Run `npm run lint` before you build.

## Phase 2: Build and doctor

```bash
npm run build          # in the App: typecheck, production webpack, webflow extension bundle
pnpm forge doctor <dir>
```

`npm run build` writes `bundle.zip` (ships to customers) and `review-artifacts/bundle.js.map` (the form's private upload). The doctor reads both and reports against the registry, most severe first. Fix every blocker and required finding; read each suggested finding and decide.

Known non-findings the doctor already ignores, so do not "fix" them: the React error-decoder URL (production React carries it), a bare `localhost` literal in a library fallback, and a `telemetry` block in `webflow.json` is hygiene, not a dev build.

## Phase 3: Listing

```bash
pnpm forge listing --example > listing.json
pnpm forge listing listing.json
```

Fill `listing.json` with real values and point `icon.path` and `screenshots[].path` at real files. The kit checks: name 30, short 100, long 10,000 characters, up to 5 features, 1 to 2 categories from the published list, the submission form's content rules (beta language, unverifiable claims, agency pitch, Webflow marks, links in the long description, script tags), HTTPS production URLs for website, docs, privacy, and terms, support email, pricing disclosure for Paid apps, a `.webflow.io` testing site, a 900x900 PNG icon under 50 KB with alt text, and 3 to 5 screenshots at 1280x846 with alt text.

Write listing copy that says specifically what the App does and for whom. Reviewers return vague listings.

## Phase 4: Packet

```bash
pnpm forge packet <dir> listing.json
```

Writes `submission-packet/packet.json` and `CHECKLIST.md`: the form's field values by their real names, every requirement with its status, and the human gates. Walk the developer through the gates in order:

1. Privacy policy and terms describe what this App really does. Use the disclosure outline in the checklist. **Do not write the legal text yourself.**
2. Demo video, 2 to 5 minutes, install to usage, English or English subtitles, private link.
3. Published `.webflow.io` testing site with the App installed.
4. Two-factor auth on an admin of the submitting Workspace. One developer account.
5. Run **App Review Preflight** in the Designer on the exact `bundle.zip` and `.map` from this build. Paste the `wfpre_` receipt.
6. Fill the form at <https://developers.webflow.com/submit> from the packet and submit. The developer clicks.

## Reporting

Report findings most severe first with the fix for each. Separate what the tool verified from what remains a human gate. Cite evidence from the App's own files (path plus snippet). Say "ready for Preflight" or "ready to submit"; never say "will be approved".

## Anti-advice

- ❌ "Register a Data Client so the App can call the API later." → Register what the App uses today. Expanding later is an App update.
- ❌ "The bundle has `reactjs.org/docs/error-decoder`, so it is a dev build." → Production React carries that URL. Look for `react-dom.development.js` or `Warning:` strings.
- ❌ "Put the `.map` next to `bundle.js` so reviewers can find it." → Source maps go in the form's private upload. A map inside `bundle.zip` is a required-fix finding.
- ❌ "Use `alert()` for the error, it's just one line." → `webflow.notify`. Review flags browser dialogs.
- ❌ "Check `el.type === 'Section'`." → Preset-created sections report `type: 'Block'`. Use `getTag()`.
- ❌ "Generate a privacy policy from a template so the URL resolves." → A policy that does not describe the App's real data handling fails the published privacy requirement and is a liability. Emit the outline; a person writes the policy.
- ❌ "Submit for them to save time." → The developer owns the submission. The packet is the handoff.

## Definition of done

- `pnpm forge doctor <dir>` is READY with zero blockers and zero required findings.
- `pnpm forge listing listing.json` is READY.
- `submission-packet/CHECKLIST.md` exists and every human gate is listed, with the developer told which remain.
- The developer has the Preflight step and the form link, and knows the tool did not submit.
