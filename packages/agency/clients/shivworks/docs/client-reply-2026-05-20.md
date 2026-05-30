# Client Reply Draft - 2026-05-20

Context: Shivworks asked where to upload upcoming course content, including a module with multiple episodes and several 20-30 minute videos.

## Recommended Reply

```text
Good question. Don't upload the long-form videos directly into Replit.

Clerk is handling the login/member-gated access side. Replit is where the app can be edited and previewed, but the actual video files should upload directly to Cloudflare Stream through the app. That lets the platform handle larger files, streaming playback, and gated access without bloating the Replit project.

For now, organize the raw files by course/module/episode and use the admin upload flow once the Replit changes are applied. The platform should store the video metadata and playback references, not the raw video files inside Replit.
```

## Internal Notes

- Name Clerk directly as the auth and access provider.
- If the client asks for the upload destination today, direct them to the Cloudflare Stream-backed app upload flow, not Replit storage.
- If they need a publish workflow, use the admin upload/import pass instead of manual Replit file uploads.
- The client has edited the frontend in Replit since delivery, so confirm live Replit state before promising UI details from the GitHub repo.
