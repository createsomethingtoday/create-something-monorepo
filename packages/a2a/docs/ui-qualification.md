# A2A rendered UI qualification

CRE-2380, 2026-11-09. Actual Vite-built pages were exercised in ego-browser
against the local Wrangler runtime at `http://127.0.0.1:8796`.
The product-mode baseline is documented in `design-research.md`, including the
previously inspected Mobbin references. No outside asset or layout was copied.

## Demonstrated findings and repairs

- `/app` originally returned `307 Location: /app` repeatedly and browser
  navigation failed with `net::ERR_TOO_MANY_REDIRECTS`. The owning application
  route was corrected by the integration owner. The UI check preserves a real
  built-runtime `GET /app` 200 assertion.
- Standalone landing links and the desktop sign-out button had targets under
  44px. They now have 44px minimum targets; six-width readback finds no short
  buttons, and the landing's standalone link readback finds no short targets.
- Without JavaScript, the console showed both its enable-JavaScript explanation
  and an indefinite session-checking message. The initial loading region now
  starts hidden and JavaScript reveals it when session loading actually starts.

## Actual output reviewed

Landing at 320, 390, 768, 1024, 1025 and 1440px: no document or visible-element
horizontal overflow. Full landing screenshots at 320, 390, 768 and 1440px were
directly viewed. Hierarchy, the separate message/receipt/work/result model,
retention information, house typography and restrained ink/paper treatment fit
the existing Canon product-mode baseline. The diagram remains explicitly
illustrative rather than product execution evidence.

Console Inbox, Connect and Access at all six widths: no horizontal overflow,
no visible button below 44px. Full 320px Inbox/Connect/Access and 1440px Inbox
screenshots were directly viewed. Long IDs wrap, narrow conversations stack,
controls remain usable, and delivery and processing have separate labels.
Loading, signed-out, invite-denied, error, empty, no-inbox, populated, paused,
and partial-message-error states were exercised. Signed-out is real local
runtime; authenticated states use explicitly labeled browser-only API fixtures.
Markup in untrusted message text was displayed literally and did not execute.

The fixture interaction pass created an inbox, sent a same-thread reply with an
idempotency key, retained that sent reply in the conversation, requested replay,
allowed and revoked a sender, canceled a subscription, and canceled then
confirmed a pause. Pane changes focus the pane heading; canceling pause returns
focus to its control. Those mutation receipts are offline fixture evidence only.
The landing skip link had visible keyboard focus. Hash navigation, reduced
motion's immediate scrolling, and all four landing chapters without JavaScript
were checked.

## Reproduce and evidence

After `pnpm --filter @create-something/a2a build` and starting Wrangler on 8796:

```sh
ego-browser nodejs < packages/a2a/scripts/verify-ui.ego.mjs
```

The self-contained script does not import fixtures into the application. It
intercepts `/api/v1/` in its own browser document for fixture query strings only.
It never supplies an authentication token or writes to a real inbox.

Evidence directory: `/private/tmp/cre-2380-ui`.
Useful directly viewed files: `landing-320.png`, `landing-390.png`,
`landing-768.png`, `landing-1440.png`, `console-populated-320.png`,
`console-populated-1440.png`, `console-connect-320.png`,
`console-access-320.png`. The aggregate smoke passed 31 layout/state checks and its interaction, focus,
reduced-motion, no-JS and /app assertions; it writes `report.json`.

Functional correctness: passed for the built local UI and offline state and
interaction fixtures. Perceptual/product quality: passed for the directly viewed
local outputs against the documented Canon baseline. Release readiness:
untested by this UI qualification; real Identity sign-in, live two-owner dots,
production deployment, and receiver acceptance remain the integration owner's
separate gates.

## Independent Workerd re-test

A later independent Sol 6.1 pass exercised actual local Workerd/D1/Queue APIs
with signed synthetic Alice/Bob identities. Its loopback-only browser proxy
supplied the synthetic Alice bearer to the real local API; it did not intercept
API responses. This is stronger local runtime evidence, still not production
Identity authentication or a live dot exchange.

The reviewer created an inbox through the actual console, created its peer via
the local API, allowed reciprocal senders, sent a request and reply, claimed and
finished work, paused/resumed, and revoked/restored a grant. Wrong-owner reads,
claims, second registrations, changed idempotent payloads, and revoked sends
were rejected by the real local backend.

At 101 messages, this pass found that the console's ascending first-page read
hid current work. A regression was first demonstrated failing (`100` versus
expected latest cursor `120`). Console history now starts with the latest 100
and offers exclusive-cursor older pages; MCP incremental reads remain ascending.
The test passes with 120 messages, two non-overlapping pages, and owner isolation.
The reviewer independently reloaded the real console: message 101 was visible
initially, Load older reached all 101, and focus returned to the Inbox heading
when the button disappeared. Expired delivery records no longer offer an
unsupported replay action. Delivery and processing outcomes remain separate.

The reviewer also found that an invitation-denied owner could not reach Sign
out even though the recovery instructions offered it. The initial 403 branch
now keeps that control available. A real local admission failure was retested:
the control was keyboard reachable and 44px tall; same-origin logout returned
200 and an untrusted-origin logout returned 403. The disposable bearer proxy
does not establish production owner logout acceptance.

The final integration receipt in CRE-2380 records the reviewed SHA, complete
gate statuses, actual screenshot paths, and production acceptance limits.
