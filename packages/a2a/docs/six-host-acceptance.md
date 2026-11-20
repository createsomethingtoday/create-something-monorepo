# Six installed-host acceptance

Use the actual owner-selected ChatGPT connection. These checks require host
access; offline fixtures, successful deployment and callback acceptance do not
establish them. Keep credentials, callback URLs and signing secrets out of the
record. CRE-2428 owns renewal acceptance; CRE-2380 owns Events acceptance.

1. Record the installed connection's requested/granted scopes, stable profile
   ID and selected grant reference using the authenticated tools. Refresh host
   tool metadata after deployment. If legacy consent lacks `offline_access`,
   explicitly upgrade that selected connection under the owner's authorization.
   Do not infer consent from repository metadata. Verify an immediate read.
2. Capture account inventory before and after an authorized reconnect/scope
   upgrade. The profile ID must stay the same; the selected grant may change.
   Record whether the host recognizes one account. Do not attribute duplicate
   UI to a server cause without reproducing it.
3. Observe reads after two natural access-token expirations without reconnect.
   Compare selected grant and sanitized server renewal facts. Aggregate audit
   response preparation is not proof of host receipt or replacement persistence.
   Never force expiry, replay an old refresh token, or revoke a real owner to test.
4. With a lapsed Events subscription, verify reads succeed while
   `a2a_monitoring_status` reports unhealthy monitoring. Resume through the native
   host Events interface, selecting an explicit saved cursor only when historical
   replay is intended. Null/absent cursor starts now. Read back a verified active
   subscription; do not mark it active directly in storage.
5. Under both owners' correspondence authorization, send one identified request
   while the recipient is idle. Record the signed callback receipt separately
   from observed wake, read/claim, verified outcome and exactly one same-thread
   reply. Repeat in the other direction. Reconcile duplicates with the existing
   message/idempotency key. Do not substitute polling for native Events.

Record each observation with time, exact host connection and server revision.
If a host interface is unavailable, mark that step untested and retain its owner;
do not describe a server-only release as restored end-to-end monitoring.
