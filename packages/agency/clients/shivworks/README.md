# Shivworks Client Workspace

Shivworks is a partner-managed client routed through Outerfields. This directory keeps the current delivery context, client-facing answers, and operator notes in one place so the work does not depend on chat history or stale Auth0 assumptions.

## Current Posture

| Area | Current position |
| --- | --- |
| Relationship | Outerfields-managed sub-client |
| Delivered scope | Login and gated video access experience |
| Identity / authorization | Clerk is the first-class identity and authorization boundary |
| Delivered baseline repo | `createsomethingtoday/shivworks-network` |
| Client editing surface | Client-owned Replit import of the delivered package; frontend may now differ from GitHub |
| Production target in delivered repo | Cloudflare Pages + D1 unless intentionally migrated |
| Video storage | Do not store long-form source videos directly in Replit |
| Current delivered video model | Cloudflare Stream-backed direct upload flow, D1 media/episode/progress tables, signed playback routes |
| Current production app | `https://shivworks-network.pages.dev` |
| Replit secrets source | Infisical `CREATE SOMETHING` / `Development` / `/agency/shivworks-network/replit` |

## Working Rules

- Treat Clerk as the Shivworks identity and authorization baseline.
- Treat Auth0 references in the broader monorepo as legacy or agency-wide context, not Shivworks truth.
- Treat the GitHub repo as the delivered baseline, not guaranteed-current frontend truth.
- Check live Replit before making frontend changes because the client has edited the frontend there after delivery.
- Keep Replit focused on product editing, previewing, and client-side iteration unless migration is intentional.
- Put source video files in Cloudflare Stream through the app upload flow, not Replit storage.
- Route client communication through Outerfields unless relationship terms change.

## Immediate Client Question

The client asked where to upload a course module with multiple episodes and several 20-30 minute videos.

Recommended answer: do not upload those files straight to Replit. Clerk handles identity and access, while Cloudflare Stream stores and processes the source videos. The app stores course/module/episode metadata and signed playback references. Replit now has the required Stream secrets from Infisical for the upload flow.

See:

- [Content Upload Runbook](./docs/content-upload-runbook.md)
- [Client Reply Draft](./docs/client-reply-2026-05-20.md)
- [Source Evidence](./docs/source-evidence.md)

## Directory Layout

```text
packages/agency/clients/shivworks/
|-- README.md
`-- docs/
    |-- client-reply-2026-05-20.md
    |-- content-upload-runbook.md
    `-- source-evidence.md
```

## Open Decisions

1. Confirm live Replit frontend drift before overwriting or porting UI changes.
2. Choose the final video destination for this content batch.
3. Rotate the Cloudflare Stream token that was pasted into chat, then update Infisical/Replit with the replacement.
4. Configure `network.shivworks.com` DNS/custom domain and rerun Stream configuration with the custom domain when live.
5. Confirm whether Replit should keep using the Cloudflare Pages backend or run its own backend routes.
