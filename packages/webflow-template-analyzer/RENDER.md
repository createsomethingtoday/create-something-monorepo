# Render Deploy

This package can run on Render as a Docker web service using:

- Blueprint: `packages/webflow-template-analyzer/render.yaml`
- Dockerfile: `packages/webflow-template-analyzer/Dockerfile`

## Required environment variables

- `ANTHROPIC_API_KEY`

The Blueprint also sets:

- `PORT=8080`
- `ALLOW_VISIBLE_BROWSER=false`

That disables `/open-form` on Render, because Render cannot open a visible browser for the user.

## Expected service URL

The Blueprint uses the service name `create-something-template-analyzer-api`, which should produce:

`https://create-something-template-analyzer-api.onrender.com`

The extension frontend defaults to this URL outside local development, and still defaults to `http://localhost:7860` when served from `localhost`.

## Service plan

The initial Blueprint uses Render's `free` plan so the service can be created without adding payment info first. If cold starts become a problem, change the service to `starter` after the first deploy.

## Deploy steps

1. Upgrade the Render CLI if needed. Blueprint validation requires Render CLI `v2.7.0+`.
2. Validate the Blueprint:

   `render blueprints validate packages/webflow-template-analyzer/render.yaml`

3. Create or sync the service from Render using the Blueprint file.
   If you prefer direct CLI creation, use `packages/webflow-template-analyzer` as the Render root directory so Render picks up the package-root `Dockerfile`.
4. Set `ANTHROPIC_API_KEY` during service creation.
5. Confirm health:

   `curl https://create-something-template-analyzer-api.onrender.com/health`

## Extension override

The Designer extension now includes a `Backend settings` panel. If the final Render URL differs from the default URL above, paste the deployed API base URL there once and it will persist in local storage.
