# Shivworks Source Evidence

This file captures what is verified in the current monorepo and what came from historical repo context.

## Current Monorepo Branch

- Current branch has no checked-in Shivworks app source.
- Current branch previously only referenced SHIV Works from the Outerfields public components.
- `packages/agency/clients/outerfields/` contains the closest proven implementation pattern for a member-gated video platform.

## Delivered ShivWorks Repo

Source repo:

```text
https://github.com/createsomethingtoday/shivworks-network
```

Observed at `main` commit `8adcd883b754907aab9c14bb766d1634d5256d3a` (`Add ShivWorks video upload foundation`).

Verified posture from the delivered repo:

- Standalone SvelteKit + Vite ShivWorks member network.
- Cloudflare Pages deployment target.
- Cloudflare D1 production database.
- Clerk for auth.
- Stripe for Bronze / VIP upgrades.
- Resend for transactional email.
- Circle-backed community launch lane.
- Replit import support for product editing, previewing, and client-side iteration.
- Cloudflare Stream direct upload foundation for admin-managed course/module episodes.

Important caveat: the client has edited the frontend in Replit after delivery. Treat GitHub as the delivered baseline and architecture evidence, not guaranteed-current frontend truth.

## First-Class Clerk Context

Clerk is the identity boundary for Shivworks:

- `.env.example` requires `PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CLERK_JWT_KEY`, and `CLERK_WEBHOOK_SIGNING_SECRET`.
- `src/hooks.server.ts` authenticates each request through Clerk and hydrates `locals.user`.
- `src/lib/server/clerk.ts` creates the Clerk backend client, resolves authorized parties, verifies requests, and verifies Clerk webhooks.
- `src/routes/api/clerk/webhook/+server.ts` syncs Clerk user lifecycle events into ShivWorks members.

Auth0 is not the ShivWorks identity provider.

## Current Video Model In Delivered Repo

The delivered ShivWorks repo originally supported course module playback through stored media references:

- `migrations/0003_course_playback.sql` adds `video_kind`, `video_url`, and `duration_label` to `course_modules`.
- Seed data points demo modules at `/videos/shivworks-free-preview.mp4` and `/videos/shivworks-member-brief.mp4`.
- `src/routes/admin/+page.svelte` exposes module controls for `Video type`, `Video URL`, and duration.
- `src/routes/admin/+page.server.ts` saves `videoKind` and `videoUrl`.
- `src/routes/library/[slug]/+page.server.ts` gates course access with Clerk-backed entitlement state before loading modules.
- `src/routes/library/[slug]/+page.svelte` plays MP4 modules and saves progress to `/api/library/modules/:moduleId/progress`.

The current main branch now adds the direct upload foundation:

- `migrations/0008_media_assets_and_module_episodes.sql` adds `media_assets`, `course_module_episodes`, and `member_episode_progress`.
- `src/lib/server/stream.ts` wraps Cloudflare Stream direct uploads, signed playback tokens, HLS URL creation, and webhook signature checks.
- `src/routes/api/admin/media/uploads/init/+server.ts` creates a media/episode reservation and returns a Cloudflare Stream TUS upload URL.
- `src/routes/api/admin/media/uploads/complete/+server.ts` finalizes pending upload state after browser upload.
- `src/routes/api/webhooks/stream/+server.ts` accepts signed Cloudflare Stream lifecycle updates.
- `src/routes/api/library/episodes/[episodeId]/playback/+server.ts` returns signed/private or public HLS playback URLs after Clerk-backed access checks.
- `src/routes/api/library/episodes/[episodeId]/progress/+server.ts` tracks member episode progress.
- `src/routes/admin/+page.svelte` includes the admin upload flow.

Production Pages deployment:

```text
https://shivworks-network.pages.dev
```

Cloudflare Stream webhook target:

```text
https://shivworks-network.pages.dev/api/webhooks/stream
```

Infisical Replit secret source:

```text
CREATE SOMETHING / Development / /agency/shivworks-network/replit
```

## Historical Shivworks Context

Historical client documentation identified Shivworks as:

- Outerfields-managed sub-client.
- Login and gated video access deliverable.
- Clerk for auth/authorization.
- Replit for deployment.
- Thin SvelteKit/Next-style wrapper, pending live-project confirmation.

Relevant historical file:

```bash
git show 6b9fe5003:docs/commercial/clients/shivworks.md
```

Important lines in that historical file:

- Delivered scope: login via Clerk and gated video access.
- Tech baseline: Clerk, Replit, light SvelteKit/Next wrapper.
- Productization candidate: member-gated content platform starter.

## Outerfields Video Pattern For Future Work

Closest checked-in implementation:

- `packages/agency/clients/outerfields/src/routes/api/v1/uploads/init/+server.ts`
- `packages/agency/clients/outerfields/src/lib/server/stream.ts`
- `packages/agency/clients/outerfields/src/routes/admin/videos/+page.svelte`
- `packages/agency/clients/outerfields/migrations/0010_video_pipeline_and_series.sql`

Observed pattern:

- Admin-authenticated app route creates a draft video row.
- App requests a direct upload URL from the video provider.
- App stores provider identifiers such as Stream UID and ingest status.
- Playback is resolved through app routes so access can remain gated.

The ShivWorks implementation now follows this pattern.

## Known Drift

The broader `.agency` package still contains Auth0 docs and code paths. Those should not be treated as Shivworks-specific evidence. The Shivworks baseline is Clerk.

The live ShivWorks frontend may also drift from the delivered GitHub baseline because the client has edited it in Replit since handoff.

## Current Follow-ups

- Rotate the Cloudflare Stream token because it was pasted into chat during setup.
- Configure `network.shivworks.com`; it still was not live when the production Stream webhook was switched to the Pages URL.
- Decide whether Replit should continue calling the Cloudflare Pages backend or host its own backend routes.
