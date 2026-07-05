export const CANON_PROJECT_OVERLAY_MANIFEST = {
  "id": "overlay.webflow-apps-admin-audit",
  "name": "Webflow Apps Admin Audit Overlay",
  "owner": "webflow-apps-team",
  "sourcePackage": "@create-something/webflow-apps-audit-dashboard",
  "sourcePath": "manifest.ts",
  "targetModalities": [
    "web",
    "chat",
    "app",
    "voice",
    "glasses"
  ],
  "tags": [
    "canon",
    "overlay",
    "project",
    "webflow",
    "apps",
    "audit",
    "dashboard"
  ],
  "artifacts": [
    {
      "kind": "theme",
      "path": "theme.css",
      "description": "Project-local CSS aliases that point back to Canon tokens.",
      "registryItemIds": [
        "token.canon-core"
      ]
    },
    {
      "kind": "tokens",
      "path": "tokens.json",
      "description": "Design-token aliases for project-specific names without a new token scale.",
      "registryItemIds": [
        "token.canon-core"
      ]
    },
    {
      "kind": "templates",
      "path": "templates",
      "description": "Copyable briefs for surface-specific workflow overlays.",
      "registryItemIds": [
        "template.canon-project-overlay-manifest",
        "template.canon-extension-intake"
      ]
    },
    {
      "kind": "copy-rules",
      "path": "copy-rules.md",
      "description": "Project voice and terminology rules that keep Canon primitives stable.",
      "registryItemIds": [
        "policy.signal-decision-proof"
      ]
    },
    {
      "kind": "surface-policy",
      "path": "surface-policy.md",
      "description": "Modality policy for web, chat, app, voice, and glasses overlays.",
      "registryItemIds": [
        "policy.signal-decision-proof"
      ]
    },
    {
      "kind": "registry",
      "path": "registry.json",
      "description": "Project-local registry metadata and Canon dependency list.",
      "registryItemIds": [
        "component.clear-decision-panel",
        "component.clear-proof-strip",
        "template.canon-project-overlay-manifest"
      ]
    }
  ],
  "extensionIntakes": [
    {
      "id": "overlay.webflow-apps-admin-audit.surface-brief",
      "title": "Webflow app audit dashboard surface",
      "summary": "A candidate Canon audit-dashboard template for app review status, governance evidence, and compact reviewer handoffs without promoting Webflow-specific exception policy into Canon stable.",
      "requestedKind": "template",
      "requestedModalities": [
        "web",
        "chat",
        "app",
        "voice",
        "glasses"
      ],
      "owner": "webflow-apps-team",
      "sourcePackage": "@create-something/webflow-apps-audit-dashboard",
      "sourcePath": "src/routes/+page.svelte",
      "tags": [
        "overlay",
        "webflow",
        "apps",
        "audit",
        "dashboard",
        "evidence"
      ],
      "surfaces": [
        {
          "surfaceId": "webflow-apps-admin-dashboard",
          "name": "Webflow apps audit dashboard",
          "modality": "web",
          "sourcePath": "src/routes/+page.svelte",
          "proof": "The dashboard route renders app-review audit status and evidence for operators."
        },
        {
          "surfaceId": "webflow-apps-admin-summary",
          "name": "App audit chat summary policy",
          "modality": "chat",
          "sourcePath": "canon-overlay/copy-rules.md",
          "proof": "The copy rules constrain chat summaries to app, status, evidence, owner, and next action."
        },
        {
          "surfaceId": "webflow-apps-admin-review",
          "name": "App audit app surface",
          "modality": "app",
          "sourcePath": "src/routes/+page.svelte",
          "proof": "The same dashboard route acts as the app surface for repeated review and comparison work."
        },
        {
          "surfaceId": "webflow-apps-admin-voice",
          "name": "App audit voice policy",
          "modality": "voice",
          "sourcePath": "canon-overlay/copy-rules.md",
          "proof": "The copy rules constrain spoken review summaries to app, status, blocker, proof, and next action."
        },
        {
          "surfaceId": "webflow-apps-admin-glasses",
          "name": "App audit glasses policy",
          "modality": "glasses",
          "sourcePath": "canon-overlay/surface-policy.md",
          "proof": "The surface policy keeps thin displays to app status, owner, proof, and next action."
        }
      ],
      "dependencies": [
        "component.clear-decision-panel",
        "component.clear-proof-strip",
        "template.canon-project-overlay-manifest",
        "template.canon-extension-intake",
        "policy.signal-decision-proof"
      ]
    }
  ]
};
