# Webflow App Review Runtime Template

This package builds the immutable E2B sandbox used by App Review Preflight runtime observations.

The template pins the Node base-image digest and Playwright version, installs Chromium and its OS dependencies during the E2B build, and copies the reviewed runner into `/app`. A prestarted one-shot HTTP service accepts only `POST /run` for the production Preflight origin. E2B's per-sandbox restricted-traffic token protects that route; the job capability is passed only to the runner process and is never returned or logged by the service.

No package install, browser download, runner upload, E2B credential, Webflow credential, or shared dispatcher token exists in the runtime launch path.

```bash
pnpm test
pnpm check
pnpm build

E2B_API_KEY=... pnpm build:e2b -- --receipt /absolute/path/to/receipt.json
```

Production must configure `E2B_RUNTIME_TEMPLATE_ID` with the receipt's exact `immutableTemplateRef` (`<template-name>:<build-id>`), never a name or mutable tag.
