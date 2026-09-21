# Agent instructions for client remote support

Use this procedure when remote access is needed to finish an authorized client task. RustDesk supplies screen access; it does not replace the client's local agent, account approval, repository workflow or release checks.

Read [CLIENT-SUPPORT.md](CLIENT-SUPPORT.md) for the operating procedure and [README.md](README.md) for infrastructure health and recovery. This work serves Automation (installation and connection), Database (client records and evidence), and Judgment (scope and client consent).

## Establish the target before changing it

Identify the client, device owner, target Mac and agreed task. Distinguish the operator Mac from the client's Mac and the DigitalOcean server. Never install on the current machine merely because the client device is unavailable.

Inspect existing RustDesk installation and configuration first. Preserve another support provider's settings until the owner authorizes changing them. The shared kit supports Apple Silicon only; confirm architecture on the target with `uname -m` (`arm64`). Do not silently substitute an Intel installer or enable unattended access.

Find or create the client's onboarding issue using [client-record.md](client-record.md). Keep passwords, OAuth tokens, server private keys and recovery identities out of Git, Linear, screenshots and logs.

## Complete the available setup

From this repository's root, build the kit:

```bash
python3 ops/rustdesk/package.py
```

The script verifies the pinned official installer and writes the ZIP and checksum to `~/.codex/artifacts/client-support/apple-silicon/`. Record the checksum it actually produces. Do not embed a stale ZIP checksum in a new handoff. The guide and native import are committed under `ops/rustdesk/client/`; generated installers and archives stay outside Git.

When working on an authorized target Mac, follow [the shipped guide](client/START-HERE.html): install the verified app into Applications, open it and import [server-config.txt](client/server-config.txt) through RustDesk's Network settings. Use supported UI controls; do not overwrite opaque preferences or bypass macOS permissions. If an existing version differs from the pinned kit, inspect compatibility before replacing it.

The expected public settings are:

| Field | Value |
| --- | --- |
| ID server | `support.createsomething.io` |
| Relay server | `support.createsomething.io:21117` |
| API server | Empty |
| Public key | `7SYSc0h6a+0ibKDmAwDXwZo9dkvNOMMSvGtZbU2BT+Q=` |

The device owner grants Screen Recording and Accessibility, approves local authentication, and enables Input Monitoring only if requested. Explain the exact remaining click when their interaction is required; continue independent preparation. Do not collect their Mac password. Do not set a permanent RustDesk password or install its startup service under this procedure.

On the operator Mac, run the health check documented in README.md before a session. Client Macs do not need the operator's SSH key, backups or recovery tools. If those tools are absent, report that the health check needs the operator environment; do not provision replacement infrastructure as a workaround.

Building a kit does not deliver it. Send it only when the user has authorized delivery to the named recipient. If the target Mac is unavailable, leave the kit and exact next steps ready and mark device setup pending.

## Verify and record completion

Restart RustDesk and confirm Ready with the expected public settings. During the agreed attended session, verify the client's screen, pointer movement and typing in a blank document. The client shares the current one-time password privately and personally approves account sign-ins. Have the client quit RustDesk and verify the remote session ends.

Record the device label, kit checksum, date, operator, checks performed and remaining work in the client's issue. Separate built, delivered, installed, connected and accepted states. Only mark onboarding accepted after that client's device passes the session and quit checks. A successful operator test is not client acceptance.

## Grantbot handoff

Context: [Review Grantbot progress](codex://threads/01a0a0a8-6b39-7841-a701-d5e448427e27). Grant's attended support onboarding is tracked in [CRE-2016](https://linear.app/createsomething/issue/CRE-2016/grant-complete-attended-remote-support-onboarding). Read its current status before repeating setup; the initial platform decision is Apple Silicon.

Agents continuing Grantbot work should use this procedure when local setup or troubleshooting requires screen access. Read the Grantbot repository's own instructions before changing its app or environment. Remote support acceptance does not prove a Grantbot release, data migration, physical-device acceptance or production cutover. Keep those checks with their existing owners and evidence.
