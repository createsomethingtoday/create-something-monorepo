export const CANON_PROJECT_OVERLAY_MANIFEST = {
  "id": "overlay.webflow-app-review-portal",
  "name": "Webflow App Review Portal",
  "owner": "webflow-marketplace",
  "sourcePackage": "@create-something/webflow-app-review-portal",
  "sourcePath": "manifest.ts",
  "targetModalities": [
    "web",
    "chat",
    "app",
    "voice",
    "glasses"
  ],
  "tags": [
    "project",
    "webflow",
    "review",
    "external-brand"
  ],
  "artifacts": [
    {
      "kind": "theme",
      "path": "theme.css",
      "description": "Imports the official Webflow light tokens used by the portal."
    },
    {
      "kind": "tokens",
      "path": "tokens.json",
      "description": "Webflow brand aliases; the runtime source is app/webflow-light.css."
    },
    {
      "kind": "templates",
      "path": "templates",
      "description": "Review handoff contract for evidence and untested behavior."
    },
    {
      "kind": "copy-rules",
      "path": "copy-rules.md",
      "description": "Reviewer language and provider-attribution boundaries."
    },
    {
      "kind": "surface-policy",
      "path": "surface-policy.md",
      "description": "Implemented web surface and constraints for future modalities."
    },
    {
      "kind": "registry",
      "path": "registry.json",
      "description": "Project-local registration; no shared Canon component promotion."
    }
  ],
  "extensionIntakes": []
};
