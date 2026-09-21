# Attended creator support

PRIVATE coordinates requests between an approved creator and a buyer with an active asset entitlement, or an approved company partner and the owner of an active paid support workspace. Free acquired assets qualify too. Asset ownership does not purchase support time; the parties agree coverage separately.

Database: migration 0017 stores participant IDs, scope, usage budget, consent version, timestamps and an append-only status history. Automation: `/api/remote-sessions` validates the relationship again before acceptance; company access uses paidAccess and asset payments are refreshed against Stripe. Judgment: the buyer must explicitly consent, attend and approve native device access. Impersonation cannot initiate or accept sessions. Requests expire after 24 hours; accepted working windows after two hours. Either participant can end the record.

RustDesk defaults to the existing CREATE SOMETHING OSS endpoint and public key from `ops/rustdesk/AGENTS.md`. Zoom is a creator-owned alternative, with HTTPS zoom.us meeting links only. No credentials, device passwords, automatic enrollment, unattended access, camera recording, server-side remote control, provider-budget enforcement or tenant-isolation claims are introduced. PRIVATE expiry/termination does not terminate the native connection. The UI explicitly directs participants to disconnect/quit and remove permissions when support ends.

The server’s OSS relay does not enforce PRIVATE permissions. Verify actual buyer screen/control/disconnect on each device; a server health receipt or application test is not device acceptance. Review `ops/rustdesk/CLIENT-SUPPORT.md` before a real session. Third-party native clients and OS permission prompts remain part of setup.

Release: apply migrations after backup, deploy preview with PCN_REMOTE_SESSIONS_ENABLED=true, verify authorized buyer/creator and outsider paths, then promote through PR/CI. The default flag stays false until the workflow is verified. Disable the flag to stop new mutations; preserve audit records. No relay infrastructure changes are part of this release.
