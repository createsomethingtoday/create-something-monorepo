---
name: capture-evidence-screenshots
kind: function
version: 0.1.0
---

# Capture Evidence Screenshots

> Takes the screenshots that let the meeting verify a claim without opening
> four tools: an Airtable record or automation step, a Slack bot post or
> thread, a submission-form validation state, a dev-docs section. Uses
> ego-browser in one task space and places the images in the doc and on the
> board.

### Parameters

- `items`: list of `{ kind, target, caption, place_under }` where `kind` is
  one of `airtable_record`, `airtable_automation_step`, `slack_thread`,
  `slack_channel`, `form_state`, `dev_docs_section`, `published_site`,
  `creator_hub`, `linear_project`;
  `target` is a URL, record id, automation step deep link, permalink, or
  `{ url, element_id }`; `caption` says what the image proves;
  `place_under` is the doc paragraph text the image belongs to, or a board
  zone name.
- `doc_id`: the notes document id.
- `board_url`: this week's board.

### Returns

- `result`: `{ placed: [{ file, caption, placed_in, doc_paragraph?,
  board_node? }], skipped: [{ item, reason }] }`.
- if a page needs a sign-in the ego profile does not have: the item is
  skipped with reason `sign-in required` and the operator is told which
  profile to sign into (Airtable and Slack web sign in through Okta FastPass
  in the ego profile; Google Docs is already signed in).

### Invariants

- Exactly one ego-browser task space per run, named
  `weekly-notes-evidence-<YYYYMMDD>`; new rounds resume it by name. Pages are
  reused by label; a stuck page is recovered in the same space, never by
  opening a new space.
- Airtable record deep links of the form
  `https://airtable.com/<base>/<tbl>/<rec>` open the expanded record; wait
  about 7 s before the screenshot. Automation step deep links
  `https://airtable.com/<base>/<wfl>/<wac>` open the step panel.
- Slack web is `https://app.slack.com/client/<enterprise or team id>/<C…>`;
  a thread is opened from the message, since the `/thread/` URL form is
  dropped by the client. Dismiss the "Set yourself to active?" prompt with
  "No Thanks" before capturing.
- Dev docs sections are captured after `scrollIntoView` on the heading id,
  for example `choosing-your-installation-url` on
  `https://developers.webflow.com/apps/docs/marketplace/submitting-your-app`.
- Creator Hub progress is captured from the live dashboard in the operator's
  own workspace, `https://webflow.com/dashboard/workspace/<slug>/marketplace-hub`
  (`?tab=creations` for Listings, `?tab=api` for Settings); the app detail
  modal opens from a row's "More options for <app>" button, then "View
  details". Visit once per run; the templates endpoint rate-limits repeated
  loads. PR state comes from the GitHub CLI, not the browser, because the
  ego profile is not signed in to the webflow org on GitHub. A Linear project
  page is captured by its uuid URL, which redirects to the slug.
- Any round that inserts into the doc is written to a file and run once; a
  failed round is diagnosed from its output, never re-run, because the
  replay would press Enter in the doc again. A stray empty bullet left by an
  insert is removed with `deleteContentRange` through the Docs API.
- The submission form lives at
  `https://webflow-app-form.webflow.io/app-form`. A validation state is
  captured with a probe submission that the scanner stops before persistence
  (app name "Webflow Helper", fake client id, install URL on a real domain
  that returns 404); nothing is submitted for real.
- Every screenshot is cropped or the field hidden when it would show a
  creator's or developer's personal email, a token, or a secret. Review-team
  names and template or app names are fine.
- Placement in the doc goes through Google Docs in ego-browser: find the
  `place_under` paragraph with the doc's own find (Ctrl/Cmd+F, Esc), move to
  the end of the line, Enter, then Insert > Image > Upload from computer with
  `waitForFileChooser()` and `setInputFiles()`. The image is then checked by
  a screenshot of the paragraph. The Docs API path (`insertInlineImage`)
  needs a publicly reachable URL and is not used, because the images contain
  internal data.
- Placement on the board uses the Figma `upload_assets` tool on the board's
  file key, one upload per image, dropped into the matching zone.
- Files are written under the run's scratchpad `shots/` directory with a
  two-digit prefix and a slug, and each caption carries the capture date.

### Strategies

- Capture Airtable and Slack first; those are the ones the meeting asks for.
  Dev docs and form states are nice to have and can be skipped when the
  tool-call budget is short.
- Wrap each ego run in a background watchdog; `timeout` is not on macOS, and
  a hung `fetch()` inside an ego script has run silently for 13 minutes before.
- Prefer one script per observation round: act, wait for the expected state,
  screenshot, print the next snapshot last.

### Shape

- `self`: open, wait, capture, place, report.
- `prohibited`: submitting a real form; posting in Slack; editing Airtable
  values; capturing DMs.
