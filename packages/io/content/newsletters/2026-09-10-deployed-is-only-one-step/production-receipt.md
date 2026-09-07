# September 10 newsletter production receipt

Linear: CRE-1953. User authorized “complete the recommended to production” after reviewing the revised news-and-image draft. Target: Thursday September 10, 2026 at 09:00 America/Chicago (14:00 UTC). The original September 3 candidate remains preserved.

## Audience and schedule

Strict canonical double-opt-in selector, freshly queried twice; one eligible subscriber. No legacy exception or subscriber mutation. No recipient address or unsubscribe token is stored here. Fingerprint locks the full selected record, including its unsubscribe token.

```json
{
  "created_at": "2026-09-07T19:09:41.333Z",
  "subject": "\u201cDeployed\u201d is only one step",
  "scheduled_at": "2026-09-10T14:00:00Z",
  "audience_count": 1,
  "audience_fingerprint": "1a84ac248bab9248f3fdabbfca51a6d56ae57714f6e6f1052d5b652847d7a0b7",
  "idempotency_key": "cre-1953-production-963485624b9a7df54dd5cb73",
  "html_sha256": "6c194315c487e9841b1cc22222c7bd1eacf06dd9b4acf7e29739bcfb0897595c",
  "text_sha256": "e17a10db96e9adfeb6ad3ee3e485dcd888342c5e3ab9aa6ae439a71126284a32",
  "image_sha256": "fe8bdf77136e4e52776028148ad0320654555d1852534dd82de55596193e9ee1",
  "state": "scheduled",
  "id": "aa9958b4-9e19-405f-b8c6-6a02f6c709e9",
  "verified_at": "2026-09-07T19:10:11.238Z",
  "provider_payload_hashes_match": true
}
```

Provider readback must match subject, scheduled time, HTML and text hashes, recipient count and scheduled state. Scheduled is not delivered. Per-recipient unsubscribe link is rendered directly from the selected record. No tracking pixel or provider click tracking change; first-party campaign attribution is registered separately.

## Operator test

```json
{
  "id": "8065cc02-cc2c-4182-ae10-db2c2a252743",
  "subject": "[TEST] \u201cDeployed\u201d is only one step",
  "sent_at": "2026-09-07T19:08:20.360Z",
  "idempotency_key": "cre-1953-test-bfc381d061fb87d4cd28",
  "html_sha256": "8f213f23a4d09d9c9f5dd07505e2aaf6e7862d010d12b632f763fc641cd4c4ac",
  "text_sha256": "7da74d46de5aa6baf05aebff5e3dbab3ee0a233be0af5b1d9bfc78327fbeb4ff",
  "image_sha256": "fe8bdf77136e4e52776028148ad0320654555d1852534dd82de55596193e9ee1"
}
```

Gmail message `1a07d4580914b5d6` reached INBOX. MIME inspection found text/plain, text/html, and image/png with Content-ID `thursday-proof-hero`; both text parts contained the title and news section. The HTML referenced the inline image. Provider delivered state was verified before scheduling. Test CTA carries traffic_class=test and a non-mutating operator-seed unsubscribe preview.

## Validation

Prose check: zero findings. Four newsletter analytics tests pass. IO Svelte check: zero errors and warnings. Full IO build and lint pass. Desktop 1280px and mobile 390px have matching viewport/document widths and a loaded 1536x1024 image. Text contains the whole lesson without relying on the image. This is browser layout and Gmail MIME proof, not an exhaustive email-client rendering matrix.

## Rollback and follow-up

Before send, cancel only provider message `aa9958b4-9e19-405f-b8c6-6a02f6c709e9` through POST https://api.resend.com/emails/aa9958b4-9e19-405f-b8c6-6a02f6c709e9/cancel using the existing Resend credential; read back canceled state. Use the last pre-send check at September 10 08:30 Central to revalidate consent and source availability. Cancel if consent is withdrawn or a material claim is contradicted; do not silently widen the audience or edit scheduled content.

After send, verify provider delivery and record the observed outcome. Keep web_status=draft until verified delivery; then publish the archive through the usual PR/deploy/live check. The public image may be deployed before send. Deployment rollback baseline is Pages 6c390e77-0f8f-4a7a-bbf2-54260c3bae87, source 861eedb2de6b89329152bd44ead57d8641fde8ea; use a reviewed revert/redeploy. Deployment rollback does not cancel email.

Worktree disposition: preserved at /var/folders/5v/bcpy60z558b1y2jctfx6108m0000gq/T/cre-1953-agent-worktree on codex/CRE-1953-agent-worktree until post-delivery closeout.
