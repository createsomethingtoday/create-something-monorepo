export const CANON_PROJECT_OVERLAY_MANIFEST = {
  "id": "overlay.webflow-dashboard-marketplace",
  "name": "Webflow Dashboard Marketplace Overlay",
  "owner": "webflow-dashboard-team",
  "sourcePackage": "@create-something/webflow-dashboard",
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
    "marketplace",
    "dashboard",
    "validation"
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
      "id": "overlay.webflow-dashboard-marketplace.surface-brief",
      "title": "Webflow marketplace dashboard surface",
      "summary": "A candidate Canon marketplace-operations template for dashboard state, marketplace insights, validation, asset receipts, and compact operator handoffs without promoting Webflow-specific data policy into Canon.",
      "requestedKind": "template",
      "requestedModalities": [
        "web",
        "chat",
        "app",
        "voice",
        "glasses"
      ],
      "owner": "webflow-dashboard-team",
      "sourcePackage": "@create-something/webflow-dashboard",
      "sourcePath": "src/routes/dashboard/+page.svelte",
      "tags": [
        "overlay",
        "webflow",
        "marketplace",
        "dashboard",
        "validation",
        "evidence"
      ],
      "surfaces": [
        {
          "surfaceId": "webflow-dashboard-home",
          "name": "Webflow dashboard home",
          "modality": "web",
          "sourcePath": "src/routes/+page.svelte",
          "proof": "The home route introduces the dashboard and routes operators toward marketplace and validation work."
        },
        {
          "surfaceId": "webflow-dashboard-insights",
          "name": "Marketplace insights data",
          "modality": "chat",
          "sourcePath": "src/lib/marketplace-insights.ts",
          "proof": "The marketplace insights module gives agents a structured source for summarizing dashboard state."
        },
        {
          "surfaceId": "webflow-dashboard-app",
          "name": "Operator dashboard",
          "modality": "app",
          "sourcePath": "src/routes/dashboard/+page.svelte",
          "proof": "The dashboard route is the main app surface for status, proof, and next operational action."
        },
        {
          "surfaceId": "webflow-dashboard-validation-voice",
          "name": "Validation voice handoff",
          "modality": "voice",
          "sourcePath": "src/routes/validation/+page.svelte",
          "proof": "The validation route supports concise spoken summaries of issue, status, proof, and next action."
        },
        {
          "surfaceId": "webflow-dashboard-glasses",
          "name": "Marketplace glasses state policy",
          "modality": "glasses",
          "sourcePath": "canon-overlay/surface-policy.md",
          "proof": "The surface policy keeps thin displays to template/app status, owner, proof, and next action."
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
