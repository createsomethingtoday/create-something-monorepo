# Webflow App Review Runtime Dispatcher

This private Worker accepts authenticated dispatches from App Review Preflight and starts the reviewed runtime runner inside a short-lived E2B sandbox.

Required Worker secrets:

- `DISPATCH_TOKEN`: shared only with the App Review Preflight Worker.
- `E2B_API_KEY`: coordinator credential; never forwarded into the sandbox.

The one-time runtime observation capability is passed only to the sandbox process. It is not returned to the browser, written to Worker logs, or persisted by this dispatcher. The sandbox has a 15-minute hard timeout.
