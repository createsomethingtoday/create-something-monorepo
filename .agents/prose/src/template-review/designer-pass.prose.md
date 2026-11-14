---
name: designer-pass
kind: function
version: 0.1.0
---

# Designer Pass

> Read-only Designer checks through ego-browser, for the rubric items the
> published site cannot show: components and instance counts, variables and
> breakpoint modes, interactions, style selectors, and audits. The method
> comes from the 10/13 and 10/16 review rounds.

### Parameters

- `preview_url`: the version's Designer preview link.
- `checks`: the cited items to recheck, or empty for a full pass.

### Returns

- `result`: `{ components, variables, interactions, selectors, audits,
  screenshots, errors }`. Each panel entry lists what was read and a
  screenshot path. Each finding is labeled `Manual`.
- if the preview does not load or the panels are not found: `errors` names
  the step, and the caller treats every Designer item as unchecked.

### Invariants

- One task space per call, opened with `useOrCreateTaskSpace` and closed with
  `completeTaskSpace(id, { keep: false })`.
- Every `ego-browser nodejs` run is wrapped in a background watchdog that
  kills it after 180 seconds; macOS has no `timeout`.
- Panels open through their aria-label buttons: `Audits (U)`,
  `Components (⇧A)`, `Variables (V)`, `Style selectors (G)`,
  `Interactions (X)`. Panel text is read by climbing from
  `elementFromPoint(160, 260)` to the first ancestor under 420px wide.
- Variable modes are read from a screenshot of the collection header row,
  not by text regex, because canvas breakpoint labels match the regex.
- Nothing in the Designer is clicked except preview exit, the panel buttons,
  and list expanders.

### Shape

- `self`: open preview, enter Design, open panels, read, screenshot.
- `prohibited`: editing the site; publishing; changing settings; using
  Node `fetch()` inside an ego script.

### Skills

- ego-browser
