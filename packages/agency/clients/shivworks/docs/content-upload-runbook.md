# Shivworks Content Upload Runbook

Use this when Shivworks or Outerfields asks where new course or long-form video content should go.

## Short Answer

Do not upload long-form videos directly into Replit.

Clerk is the first-class identity and authorization boundary. Cloudflare Stream is the video storage/processing layer. The app stores course/module/episode metadata, permissions, media asset state, and signed playback references.

The delivered ShivWorks repo now includes a first-class Cloudflare Stream direct upload flow and has been deployed to Cloudflare Pages production at:

```text
https://shivworks-network.pages.dev
```

## Why

- 20-30 minute videos are large enough that app-hosted file storage becomes fragile.
- A video service or cloud storage layer can handle upload size, processing, streaming playback, and signed/private access better than the app runtime.
- This keeps Shivworks aligned with the delivered architecture: Clerk gates the member experience, and Cloudflare Stream handles video ingest/encoding/playback.
- The upload flow follows the proven Outerfields pattern: admin-authenticated API route, direct provider upload URL, provider webhook, and app-mediated playback.

## Temporary Intake

Until content is ready to upload through the admin flow, ask for the files in a shared folder.

Recommended folder structure:

```text
Shivworks Content Intake/
|-- Course Name/
|   |-- Module 01/
|   |   |-- 01-episode-title.mp4
|   |   |-- 02-episode-title.mp4
|   |   `-- metadata.csv
|   `-- Module 02/
`-- Long Form/
    |-- title-01.mp4
    `-- title-02.mp4
```

Recommended metadata columns:

```csv
course,module,episode_number,title,description,duration,tier,visibility,notes
```

## Final Upload Pattern

Current architecture:

1. Admin selects a course module and video file.
2. Admin UI calls `POST /api/admin/media/uploads/init`.
3. App creates `media_assets` and `course_module_episodes` rows.
4. App requests a Cloudflare Stream direct upload URL.
5. Browser uploads the file directly to Cloudflare Stream with TUS.
6. Admin UI calls `POST /api/admin/media/uploads/complete`.
7. Cloudflare Stream posts lifecycle updates to `/api/webhooks/stream`.
8. Members request playback through `GET /api/library/episodes/:episodeId/playback`.
9. Member progress saves to `POST /api/library/episodes/:episodeId/progress`.

## Provider Recommendation

Current recommendation for Shivworks:

- Use Cloudflare Stream for 20-30 minute streaming assets.
- Keep Replit as the client editing and preview surface unless the deployment strategy changes.
- Keep Clerk as the identity and authorization provider.
- Avoid raw public file links for gated content.
- Use Infisical as the source of truth for Replit/Stream secrets.

## Client-Facing Guidance

Tell the client:

- The upload path is Cloudflare Stream, connected through the ShivWorks app.
- Do not upload raw videos into Replit storage.
- Use clear module and episode filenames.
- Include a simple metadata sheet for course/module/episode order.
- Replit has the required Stream secret names; values are sourced from Infisical.

## Operator Checklist

- [x] Verify current Shivworks Replit project and owner.
- [ ] Verify current Clerk app/project.
- [x] Compare live Replit frontend against `createsomethingtoday/shivworks-network` before changing UI.
- [x] Confirm selected video provider.
- [x] Confirm whether the app needs a new admin upload surface.
- [x] Store Replit Stream secret names in Infisical.
- [x] Add Replit Stream secrets to Replit.
- [ ] Confirm expected content gates: public, free member, paid member, course-specific, or manual allowlist.
- [ ] Import metadata and upload files.
- [ ] Test playback as signed-out, free member, paid member, and admin.
- [ ] Send client publishing confirmation.

## Secrets

Infisical source:

```text
CREATE SOMETHING / Development / /agency/shivworks-network/replit
```

Required Replit secret names:

```text
CLOUDFLARE_ACCOUNT_ID
CLOUDFLARE_STREAM_API_TOKEN
CLOUDFLARE_STREAM_WEBHOOK_SECRET
CLOUDFLARE_STREAM_ALLOWED_ORIGINS
VIDEO_STREAM_TOKEN_TTL_SECONDS
```

Remaining security cleanup: rotate the Cloudflare Stream token that was pasted into chat, then update Infisical and Replit with the replacement.
