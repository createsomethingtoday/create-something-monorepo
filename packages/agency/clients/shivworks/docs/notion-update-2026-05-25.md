# Notion Update - 2026-05-25

## ShivWorks Video Upload / Replit Handoff

Status: Cloudflare Stream upload foundation is deployed and Replit has the required Stream secret names.

## What Changed

- ShivWorks now has a Cloudflare Stream-backed direct upload foundation.
- The production app is live at `https://shivworks-network.pages.dev`.
- Cloudflare Stream webhooks currently point to `https://shivworks-network.pages.dev/api/webhooks/stream`.
- Clerk remains the first-class auth and authorization provider.
- Replit should not store raw video files; browser uploads go directly to Cloudflare Stream.
- Infisical is the source of truth for the Replit Stream runtime secrets.

## Secret Location

```text
Infisical project: CREATE SOMETHING
Environment: Development
Path: /agency/shivworks-network/replit
```

Required Replit secret names:

```text
CLOUDFLARE_ACCOUNT_ID
CLOUDFLARE_STREAM_API_TOKEN
CLOUDFLARE_STREAM_WEBHOOK_SECRET
CLOUDFLARE_STREAM_ALLOWED_ORIGINS
VIDEO_STREAM_TOKEN_TTL_SECONDS
```

## Current Replit Agent Guidance

- Use Clerk, not Auth0.
- Use Cloudflare Stream for source video upload/storage/processing.
- Keep Replit as the edit/preview surface unless backend hosting is intentionally moved.
- If Replit hosts backend routes, it must use the Infisical-sourced Replit secrets.
- If Replit is only frontend/editing, prefer the existing Cloudflare Pages backend.
- Do not ask for or paste secrets in chat.

## Remaining Follow-ups

- Rotate the Cloudflare Stream token because it was pasted into chat during setup.
- Configure `network.shivworks.com` DNS/custom domain.
- After custom domain is live, rerun Stream configuration so allowed origins and webhook target include the final domain.
- Test a full admin upload and member playback pass with the current Replit frontend.
