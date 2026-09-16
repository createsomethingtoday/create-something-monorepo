# Remote support for client workflows

Use the shared RustDesk kit when a client needs help on their Mac. Keep each client's permission, devices, sessions and follow-up work in that client's Linear records. Sharing a server does not create a shared client workspace.

Owner: Micah. Current platform: Apple Silicon Mac. Confirm another platform separately before offering the kit. RustDesk provides screen access; the local agent, SaaS authentication and code review keep their existing approval rules.

## Shared kit

Build from the repository root:

```bash
python3 ops/rustdesk/package.py
```

The reusable ZIP is written to `~/.codex/artifacts/client-support/apple-silicon/CREATE-SOMETHING-Support-Apple-Silicon.zip`. It contains the official installer, guide, server configuration and checksums. The same kit can serve each approved client; it contains no client identity or password. Grant's original release remains a historical acceptance candidate, not the canonical package path.

The server address and public key are configuration, not permission to control a device. OSS does not provide Pro client groups, enrollment approval, cross-client access policies or a centralized support audit. Never describe our Linear records as server-enforced isolation.

## Onboard a client

1. Confirm that remote support fits the engagement. Record scope, support contact and any agreed response time in Linear.
2. Create an onboarding issue under the client's project. Use [the record fields](client-record.md); keep it pending until the client's own test passes.
3. Confirm the device owner authorizes access and the Mac uses Apple Silicon. Record a device label and architecture without collecting a password.
4. Deliver the shared kit directly to the named contact when sending is authorized. Do not put it on an automatic enrollment flow.
5. Have the client install RustDesk, grant macOS permissions and import `server-config.txt`. They approve local authentication themselves.
6. Confirm Ready after a restart. During the agreed session, verify screen display, pointer movement and typing in a blank document.
7. Have the client quit RustDesk. Confirm the session ends before marking that device's onboarding accepted.

Record the kit checksum, test date, operator, device label, result and any remaining issue. A working operator Mac does not establish client acceptance. Keep untested devices pending.

## Run each session

Read the latest health receipt using [the operations runbook](README.md#health-and-recovery). If it is stale or failed, run the check and resolve the failure before connecting.

Agree on the problem and permitted work with the client. Ask them to close unrelated private windows. They open RustDesk and share the current one-time password through the agreed private channel. Do not store that password in Linear, Git, logs or the shared kit.

Work within the agreed task. The client approves OAuth, account sign-ins and permission changes. Remote access does not authorize a purchase, deletion, production release or work for another client. Use a PR when code changes need review.

Test the result with the client. Record what changed, how it was checked, any rollback and the next owner in the session record. Have the client quit RustDesk and confirm the connection ends. Keep the app closed between sessions; do not configure a permanent password or startup service by default.

Use one intervention category to find repeated problems: agent instructions, OAuth/app setup, environment configuration, CLI installation, Git/repository, or OS/browser. These are categories to measure, not claims about observed frequency.

## End support or retire a device

Confirm the client has quit RustDesk and there is no active session. Have them remove RustDesk's macOS permissions or uninstall it if access is no longer needed. Record their confirmation and retire the device from the client's support inventory. Keep the issue's evidence under the client's normal retention policy.

Removing a Linear record or disconnecting once does not revoke future access. If a permanent password or startup service was configured outside this procedure, resolve it with the device owner before claiming offboarding complete. Revoke separate SaaS access through the owning service when that access is also ending.

## Limits and escalation

Support scope follows the client's agreement. This procedure adds no unlimited coverage, new price, response-time guarantee or unattended access. Use another approved support method when remote access is inappropriate. Keep support data separate from public Agency content.

The current server is a single Droplet. Encrypted off-host pulls and local health checks depend on the operator Mac being awake and online. There is no independent pager or high-availability guarantee. See the operations runbook for recovery and rollback.
