# Webflow Review Snippet (POC)

This snippet is inspired by the [WebMCP proposal](https://github.com/webmachinelearning/webmcp): it lets a published Webflow site expose "tool-like" JavaScript functions that an agent (or a review extension) can call to pull structured review data.

## Install (Creator)

1. Webflow: **Site Settings** -> **Custom Code**
2. Paste the contents of `webflow-review-snippet.js` into **Head Code**
   - Head is recommended so we can hook Webflow's Interactions init during bundle load.
3. Publish the site.

## Use (Reviewer / Agent)

### Option A: Console (manual)

Open DevTools on the published site and run:

```js
window.__wfReview.listTools()
```

Run an audit:

```js
window.__wfReview.auditAll()
```

### Option B: Extension bridge (automated)

The snippet listens for `window.postMessage` requests (for Chrome extension content scripts that cannot directly access `window.__wfReview`).

**Request**

```js
window.postMessage({
  __wf_review_snippet_v1: true,
  type: 'call_tool',
  id: 'unique-id',
  tool: 'audit_ix2',
  input: {}
}, '*')
```

**Response**

```js
// message event data
{
  __wf_review_snippet_v1: true,
  type: 'tool_result',
  id: 'unique-id',
  ok: true,
  result: { ... }
}
```

## Current Tools

- `get_site_info`
- `get_sitemap_urls`
- `audit_dom` (lightweight DOM checks)
- `audit_ix2` (Webflow Interactions v2 checks)
- `audit_ix3` (Webflow Interactions v3 checks)

## Notes / Limitations

- Interactions audits are page-scoped: some "missing selector" or "missing target" reports can be false positives if the published bundle contains interactions for other pages.
- This is a POC surface. Tighten security (origin allowlist / handshake token) before using it beyond controlled review workflows.

