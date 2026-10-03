# Task-scoped unsigned browser readback

Scope: Linear [CRE-2150](https://linear.app/createsomething/issue/CRE-2150/scope-paperclip-browser-environments-by-agent-role), create-something Paperclip CRE-121. This is an Automation tool with policy enforced in source. It does not change role access, grant signed-in access, or touch the client-agent-pilot instance.

`scripts/unsigned_browser_broker.py` is a **host-run candidate**, using the existing Python 3.14 Playwright installation. Do not launch it with a real rendering request from the Codex sandbox. The coordinator owns host verification; QA independently reviews and tests the exact candidate. Implementation and nonbrowser checks do not establish browser acceptance.

## Contract and coverage

One process serves one task on an ephemeral `127.0.0.1` port. Its only API is `POST /read`, authenticated by a generated 256-bit bearer capability and an exact task ID. The capability expires after 300 seconds by default (maximum 900). A mode-0600, exclusively created session file conveys it; it is removed on normal expiry, SIGINT, or SIGTERM. Do not put this file or token in issue comments, logs, or source control. The process ends on expiry; there is no renewal endpoint.

The body must contain exactly `task_id`, `url`, and boolean `screenshot`. The response includes rendered body text (up to 65,536 characters), title, HTTP status, final URL, blocked request count, initial/final cookie counts, and optionally a base64 800×600 PNG. There is no caller-supplied script, selector, click, form, upload, arbitrary-header, executable, or profile API.

**Dynamic readback design:** site JavaScript is enabled, including inline hydration code and GET-only scripts/fetch/XHR to exact allowlisted origins. This supersedes the first, static-only candidate. No agent-supplied JavaScript or interaction API was added. Capture occurs after `load` plus a fixed 500 ms settling window; there is no claim that every app has finished rendering. Apps needing POST/GraphQL, workers, WebSockets, eval, user interaction, credentials, or unlisted CDNs remain unsupported. The initial static candidate **failed the broader dynamic-UI acceptance gate**. This revised candidate is not accepted as general UI automation either: coordinator host proof and independent QA must verify real dynamic readback and adversarial isolation before qualification.

Public origins are exact scheme/host/port matches. Local previews require a separate `--allow-local-origin` with literal `127.0.0.1` or `[::1]` and an explicit port. No localhost aliases, LAN addresses, wildcards, or automatic subdomain/port expansion. Every navigation, redirect, stylesheet, image, font, script, fetch and XHR must pass the same origin and GET-only policy; unlisted CDNs will be absent. Only allow trusted preview services intended for unsigned read-only GET access: GET alone cannot guarantee that a server has no side effects.

Each request starts a new worker, new Chromium instance, and fresh nonpersistent context with empty storage, no permissions, extensions, inherited profile, provider credentials, or HTTP authentication. The worker receives a minimal environment and a temporary HOME/TMPDIR. Browser requests are fulfilled with bounded Python GET requests; no browser request is continued onto the network. DNS answers are checked for public routability (or the exact approved loopback literal), all answers must pass, and a socket connects to the selected numeric address without resolving it again. HTTPS still verifies the original hostname with the system trust store. IPv6 transition addresses are rejected.

The fetcher neither forwards browser headers nor retains response cookies. Site code may set cookies/storage in its disposable context, but these are never forwarded upstream or inherited by the next request; `initial_cookies` must be zero. Response headers are restricted; the site's original CSP is preserved in addition to the broker CSP. Broker CSP permits only allowlisted script/connect sources (inline scripts allowed, eval forbidden), and denies forms, workers, frames and objects. Original cross-origin GET permission (`Access-Control-Allow-Origin`) is preserved; preflight OPTIONS and credential forwarding remain denied.

The browser has a non-forwarding proxy, disabled DNS resolution/QUIC/background networking, and a policy disabling nonproxied WebRTC UDP. A fixed, broker-owned initialization script removes WebRTC, WebSocket, WebTransport, Worker and SharedWorker constructors from every document realm; it accepts no caller input. Service workers, socket routes, popups and downloads are also blocked. These are application containment controls, not a substitute for an OS boundary against browser vulnerabilities. Independent host QA must test actual transport denial and route/proxy behavior in the cached Chromium version before claiming safe dynamic coverage.

Limits: 4 KiB input; 2 MiB JSON output; 2 MiB per resource; 8 MiB aggregate downloaded bodies; 64 network requests per render; 100 accepted calls per session. Input has a three-second absolute deadline. Navigation has a ten-second timeout and the worker a 25-second wall-clock budget, shortened to the remaining session lifetime. Cleanup has bounded process-inspection and grace periods. Requests are serialized. Expiry is checked again before returning content.

Before Chromium execs, a private launcher records its PID, PGID and kernel process identity. It then execs the operator's exact cached binary, preserving PID/PGID and Playwright pipe descriptors. Cleanup always inspects the recorded browser group, even when the Python worker has exited and Chromium has been reparented. It verifies process identities, captures additional owned descendant groups, sends TERM/KILL only to eligible groups, and verifies no live owned members remain before removing temporary data. It never selects processes by executable name. The real detached-process regression must run on the host if sandbox policy denies process inspection. SIGKILL of the broker or a host crash cannot run finally blocks; the coordinator must reconcile that task's residual scratch directory and processes after such an event.

**V3 failure recovery:** a failed process inspection, signal, or teardown verification revokes the session and retains the request's mode-0700 directory, its mode-0600 `browser-owner.json` (or pending enrollment), launcher, and any residual browser profile. There is no automatic directory finalizer on this failure path. The API returns only `{"error":"cleanup_failed_session_closed"}` with HTTP 503; it never sends the residual path, profile data, exception text, or task credential. The host process emits one operator diagnostic on stderr containing only that error code and the exact `residual_path`. Successful cleanup, including cleanup following a render timeout, still removes the request directory. Directory-removal errors also close the session and report the residual location. This repairs the v2 loss-of-recovery-evidence finding; do not promote v2 on the strength of its successful-render receipts.

**V4 identity failure repair:** the exception fallback sends no signals. A worker PID retained by `Popen` is not proof that the current process group belongs to this request. If initial birth lookup is missing/empty or fails, or later inspection fails after excluding a reused PID, the broker preserves recovery evidence and revokes the capability without attempting TERM/KILL on that unverified group. Only the normal cleanup path with inspected ownership selects signal targets. This intentionally leaves uncertain processes for authorized host reconciliation; availability does not justify signaling an unrelated process. V3's successful host render and timeout receipts do not qualify this repair or authorize promoting v3.

**V5 R3 repair:** group identity mismatch or ambiguity is terminal for the entire cleanup attempt. A shared disqualification set prevents any later snapshot from authorizing that PGID, even if the replacement leader disappears or the table becomes empty. Cleanup immediately fails before signaling the rejected snapshot; it cannot return success and erase recovery evidence. A leaderless group additionally requires a previously observed member with the same kernel identity. A PGID alone, an unreadable identity, or a reused observed member is insufficient authority. The existing private retention and session-revocation paths apply. Do not promote v4 based on its successful host/agent receipts.

**Identity precision:** `ps lstart` has second-level precision and is not unique under rapid PID reuse. V5 removes it from enrollment and verification. On the assigned macOS host, standard-library `ctypes` reads `p_uniqueid` through `/usr/lib/libproc.dylib` and `proc_pidinfo` flavor 17. Apple defines this process identifier as changing on fork/spawn/vfork and remaining stable across exec. The private record retains the `birth` key with a `darwin-uniqueid:<integer>` value; old timestamp records are not accepted by v5. Require the full 56-byte result and a nonzero ID. Unsupported platforms, denied inspection, unavailable ABI, short results or missing identity fail closed with no timestamp fallback. No library is installed. The coordinator must verify this platform-specific API and the pre-exec enrollment/actual Chromium timeout path on the host. Process snapshots and later signals still are not an atomic kernel capability; this is bounded application cleanup, not a claim of isolation against hostile concurrent process manipulation.

Identity references: Apple's [proc identity ABI](https://github.com/apple-oss-distributions/xnu/blob/main/bsd/sys/proc_info_private.h) and [process ID lifecycle](https://github.com/apple-oss-distributions/xnu/blob/main/bsd/sys/proc_internal.h). The installed macOS SDK `libproc.h` also declares the `proc_pidinfo` signature used here.

**V6 launch/cleanup ordering (R5):** the worker exclusively creates a mode-0600 `browser-launch-intent` marker before starting the Playwright driver. The launcher refuses to enroll or exec without that marker. This separates a worker that never attempted browser launch from a launch whose enrollment may still be pending. Cleanup follows three ordered phases, sharing the same ownership, witnessed-member and terminal-disqualification state:

| Phase | Required evidence before advancing |
| --- | --- |
| Quiesce worker and observed descendants | Reap the worker and verify no live members of the observed owned groups. Do not decide browser enrollment from a record read before this phase. |
| Reconcile launch | With no intent and no owner record, the quiescent producer never crossed the launch boundary. With intent, require a complete valid owner record read now. Missing/pending/malformed enrollment is 503, never a clean timeout. A record without intent also fails closed. |
| Quiesce enrolled browser | Inspect and terminate only verified owned groups, including a late-published detached browser. Verify no live owned members before confirming cleanup and removing scratch. |

If a detached launcher publishes after the enrollment check, its intent already forces failure and retention, so its destination and future ownership record are not erased. No poll loop assumes that a missing record means no browser. Normal success or 504 is allowed only after all applicable phases confirm cleanup; uncertainty overrides rendered content or a navigation timeout with 503 and capability revocation. V5's single pre-quiescence record read could lose this enrollment; do not promote v5.

**Observed v5 timeout limitation:** coordinator testing of v5 source `b7346f94e28c5bf0bcd7b646e4fb73f040b48b2bcd71a3cf4233d71d7ea12f54` returned 503 `cleanup_failed_session_closed` on a controlled 1.5-second hung-script deadline. Persistent scratch retained a mode-0600 ownership record and exact residual path. The coordinator separately found zero group members and no new Chromium PID before removing that task-owned scratch. This is a fail-closed alert followed by manual reconciliation, not a clean automatic 504 timeout pass. The earlier outer-TemporaryDirectory probe erased its residual path and is not durable retention proof. V6 must be rechecked on host; neither an alert nor the later zero-process observation alone proves every inspect-then-signal interleaving safe.

## Coordinator host procedure

Use a dedicated existing task scratch directory, accessible only to the operator and intended task agent, and the exact reviewed files. The operator must retain this parent directory until any failed cleanup has been reconciled; an external automatic run-directory cleaner must not erase it first. No package installation, browser download, bootstrap, deployment, or credential expansion is required. Check disk first; this task's authorized proceed threshold is above 2 GiB free.

```sh
df -h .
/opt/homebrew/bin/python3.14 -B scripts/unsigned_browser_broker.py \
  --task-id CRE-121 \
  --allow-origin https://example.com \
  --executable /Users/micahjohnson/Library/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-mac-arm64/chrome-headless-shell \
  --scratch-dir "$PAPERCLIP_SCRATCH_DIR" \
  --session-file "$PAPERCLIP_SCRATCH_DIR/unsigned-browser-session.json" \
  --ttl 300
```

Run that command in the coordinator's host terminal, outside Codex sandboxing. It stays in the foreground and intentionally prints no capability. The cached executable was host-probed separately; the global Playwright CLI expects missing revision 1223 and must not be used to install or select a browser. To verify a local fixture, add only its exact origin, for example `--allow-local-origin http://127.0.0.1:8123`; do not allow Paperclip control-plane ports or other signed-in services.

The authorized task agent can read its session file and make a request without placing the token in argv or output:

```python
import json, os, urllib.request
from pathlib import Path
session = json.loads((Path(os.environ["PAPERCLIP_SCRATCH_DIR"]) /
                      "unsigned-browser-session.json").read_text())
request = urllib.request.Request(
    session["url"],
    data=json.dumps({"task_id": session["task_id"],
                     "url": "https://example.com/", "screenshot": True}).encode(),
    headers={"Authorization": "Bearer " + session["token"],
             "Content-Type": "application/json"}, method="POST")
# Do not inherit a proxy from the agent environment for the loopback API.
opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
with opener.open(request, timeout=30) as response:
    receipt = json.load(response)
print({k: receipt[k] for k in ("url", "status", "title", "cookies", "coverage")})
# Save receipt/screenshot only into the task's owned evidence directory.
```

Stop with Ctrl-C, SIGTERM, or TTL expiry. A `cleanup_failed_session_closed` response revokes the session and requires host reconciliation before restarting:

1. Read the exact `residual_path` from the host stderr diagnostic. Keep the private directory and its parent; do not upload or dump its profile, cookies, storage, raw worker output or task credential.
2. Inspect only the private ownership metadata and compare enrolled PID/PGID/kernel identities against current host processes. A changed identity is a reused PID, not authority to signal a new process. An absent leader does not by itself authorize signaling its old PGID. If identity or signaling authority is uncertain, preserve the directory and escalate to the owning coordinator; do not guess by executable name or second-resolution start time.
3. Reconcile and terminate only confirmed owned processes, including the detached browser group. Verify no live owned members remain. Only then remove that exact retained request directory. If file removal failed after verified process teardown, reconcile the remaining path before removing it.

The generic API error does not grant the caller filesystem or process authority. The record may not yet exist if failure preceded browser enrollment; retain the launch-intent marker, pending record, launcher and parent directory. A detached launcher may still publish there after the API returns 503. Let the coordinator reconcile and quiesce all confirmed task-owned launchers/browser processes before removing that exact directory. Do not treat a single absent record as proof that nothing launched. This broker does not automatically retry unsafe cleanup. Rollback follows the same reconciliation procedure before discarding the unpromoted candidate. No deployment or persistent service is installed.

## Focused checks and acceptance gap

```sh
df -h .
/opt/homebrew/bin/python3.14 -B -m unittest discover \
  -s scripts -p test_unsigned_browser_broker.py -v
git diff --check
```

Tests use a fake renderer, mocked Chromium objects, local nonbrowser HTTP, and a detached Python sleep process standing in for a browser. They never launch Chromium or contact a public site. They test credential/task/input/expiry rejection before renderer invocation, origin/DNS rejection, resource/output caps, pinned sockets, sanitized environments, fresh-context configuration, site-script routing, timeout group selection, exited-worker/reparented-browser cleanup, PID-reuse protection, session-file mode, idle expiry and listener removal. V3 regressions reproduce failed cleanup after both a timed-out and apparently successful render: private ownership/profile evidence must survive, the exact residual reference must be available to the operator, the API must remain generic, and verified successful cleanup must still remove the directory. The real detached-process test reports an explicit skip when process inspection is unavailable; it is a required host check, not a passing cleanup receipt.

V4 regressions exercise the actual cleanup path with a reused worker/browser PID followed by a process-inspection failure, as well as missing, empty and failed initial identity lookup. They require zero signals and retained private ownership evidence. Existing successful-cleanup and failed-cleanup/session-revocation checks remain required. PID-reuse scenarios use mocks; never signal an unrelated live process to test this condition.

V5 tests feed a mismatched leader, then its disappearance with a surviving PGID member, then an empty table through one shared cleanup state; every snapshot must fail. The integrated worker regression asserts no signal, no successful readback, and retained private evidence. Tests also cover leaderless groups with and without a previously verified member, reused members, distinct kernel IDs for the same PID and rejection of incomplete/zero identity results without a coarse-time fallback.

V7 repairs independent review R6 in the real detached-process test. Its finalizer calls the same identity-checked `stop_worker` only when cleanup has not been confirmed and a worker birth identity exists; it never signals saved PGID integers directly. It removes test scratch only after verified cleanup. If ownership is missing or cleanup remains uncertain, it retains the private directory for host reconciliation. Mock regressions require zero post-success fallback signals and retained evidence without verified identity or after rejected reuse.

V6 tests deterministically publish enrollment during the first worker-cleanup snapshot after worker/driver exit. A browser live in every snapshot must produce 503 with retained record/profile; a verified stopped browser may yield the original 504 with scratch removed. Another test publishes the record after cleanup has already returned 503 and verifies that its retained destination survives. Intent ordering/mode, exclusive creation before driver start, and launcher refusal without intent are also checked. All of these use mocked processes; no Chromium or unrelated process is signaled.

Coordinator and QA must retain an exact candidate hash, host command, agent API response, and real screenshot. First rerun the full nonbrowser suite on the host so the detached-process regression runs rather than skips. Earlier candidates' host/agent receipts remain historical evidence for those exact candidates; they do not qualify v6. Recheck actual failed/timeout Chromium cleanup against the replacement hash with persistent task scratch. Record the actual 503 versus 504 result without converting a conservative alert into an automatic-cleanup pass. Induce a controlled pending-enrollment/cleanup failure on task-owned processes, confirm capability revocation and private retained evidence, reconcile the exact owned launcher/browser groups, then remove only the reconciled residual directory. Browser checks also include actual DOM hydration from an allowlisted script and GET fetch/XHR; two separate fresh requests with zero initial cookies/storage; a local adversarial fixture attempting POST, private/unlisted redirects, GET/POST form submission, frames, workers, WebRTC, WebSocket, WebTransport and file URLs; no requests observed by denied TCP/UDP sinks; an exited worker leaving a detached browser with no residual owned processes/profile after successful cleanup; TTL/termination cleanup; and invalid credential, wrong task, expiry, oversized input, and disallowed origin through the agent API. The existing `host-probe.png` proves only direct host Playwright, not this broker. Broader UI acceptance remains pending those receipts and the documented dynamic-app limitations.

API references: [Playwright BrowserContext](https://playwright.dev/python/docs/api/class-browsercontext) and [BrowserType launch](https://playwright.dev/python/docs/api/class-browsertype#browser-type-launch). Signatures were also inspected from the installed Playwright 1.60.0 package.
