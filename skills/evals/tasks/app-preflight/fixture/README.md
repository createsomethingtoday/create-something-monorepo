# Formlight

Formlight copies Webflow form submissions into a CMS collection and adds a small
"thanks, we got it" badge to published pages. It is a Hybrid App: a Designer
Extension for the UI and a Node backend for OAuth, sync and script delivery.

## Submission notes

- App type: Hybrid (Designer Extension + Data Client).
- We are launching Formlight as a private App first, as our public beta. The
  Reports tab is not finished (it shows sample numbers for now), but the
  form-to-CMS sync works, so early users can start.
- Uninstall: Webflow removes everything Formlight added to a site when the App
  is uninstalled (the scripts, the CMS items and the stored submissions), so site
  owners have nothing to clean up and the docs have no removal steps.
- Sync: every connected site is checked once a minute. If Webflow answers with an
  error we wait 60 seconds and try again so no submission is dropped.
- The badge code is served from our CDN so fixes reach sites quickly.
- Backend: https://api.formlight.example.com (always on during review).
- Demo account: demo@formlight.example.com, password in the review notes.
- Review ZIP: `review-zip/` plus `package.json` and `package-lock.json`.
- Two-factor authentication is on for the admin of our Workspace.

## Layout

- `src/extension/` Designer Extension entry point and helpers
- `src/server/` OAuth callback, config endpoint, sync loop, script delivery
- `listing.json` the listing fields we will enter in the submission form
