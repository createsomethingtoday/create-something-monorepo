# Renewable authentication — CRE-2428 implementation checkpoint

The repository plugin requests `offline_access` in base and default consent,
retaining exactly `a2a:read` and `a2a:write` tool privileges. This does not modify
an installed plugin or the OAuth configuration of its backing ChatGPT App.
Existing grants need a once-only consent migration after the parent updates that
actual App through its supported interface. Preserve its private audience.

Resource metadata and challenges describe service authorization scopes, rather
than authorization-server token lifecycle scopes. They remain unchanged:
`offline_access` is requested at authorization, not required to call A2A tools.

## Unresolved resilience boundary — do not promote as complete

Identity currently consumes the refresh grant before token issuance. Reuse of
that grant revokes its family. A timeout can mean either no consumption or a
successful rotation whose response was lost. Malformed success and failed A2A
persistence have the same uncertainty. Simply retaining and retrying the old
refresh token is unsafe. Removing the blanket session deletion is insufficient.

A complete correction needs a durable, bounded replay/recovery contract at
Identity, bound to the same client, subject, resource and scope, with concurrent
issuance serialization and revocation checks. It must recover the identical
replacement after response loss without weakening family replay protection.
Then A2A must persist and validate replacements before using them, retain
availability failures without granting access, and retire terminal credentials.
This checkpoint intentionally does not change session or Identity behavior.
Successive rotation, concurrency, transient recovery and terminal revocation
behavior remain unimplemented and untested for the requested correction.

## Parent live acceptance and rollback

After independent review and completion of the resilience boundary, update the
actual backing App's OAuth consent scopes, preserving audience and approvals.
Reconsent once. Read tools from that actual host after access-token expiry and
after idle, with no fresh inbox messages; verify repeated rotation, concurrent
reads, temporary endpoint failure recovery, and denial after revocation. Fixture
tests do not establish any of those live host outcomes.

Rollback the repository consent change by reverting its commit. Reverting source
does not roll back host configuration or revoke previously issued credentials;
the parent owns that separate supported configuration/revocation workflow.
No deployment, merge, account-plugin changes or issue closeout is authorized here.
Worktree disposition: preserved on fix/cre-2428-renewable-auth for parent review.
