export const CANON_PROJECT_OVERLAY_MANIFEST = {
  "id": "overlay.goldin-coordination-test",
  "name": "goldin-coordination-test staff boundary",
  "owner": "goldin-coordination",
  "sourcePackage": "goldin-coordination-test",
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
    "staff",
    "coordination",
    "safety"
  ],
  "artifacts": [
    {
      "kind": "theme",
      "path": "theme.css",
      "description": "Reuse canonical tokens and styles for the staff web surface.",
      "registryItemIds": [
        "token.canon-core"
      ]
    },
    {
      "kind": "surface-policy",
      "path": "surface-policy.md",
      "description": "Keep identity and operational decisions in the authenticated staff surface across handoff modalities.",
      "registryItemIds": [
        "policy.signal-decision-proof"
      ]
    },
    {
      "kind": "tokens",
      "path": "tokens.json",
      "description": "Aliases of canonical performance surface and signal tokens; no new scale.",
      "registryItemIds": [
        "token.canon-core"
      ]
    },
    {
      "kind": "templates",
      "path": "templates",
      "description": "Operator handoff states the decision and its retained receipt without credentials or client data.",
      "registryItemIds": [
        "template.canon-project-overlay-manifest"
      ]
    },
    {
      "kind": "copy-rules",
      "path": "copy-rules.md",
      "description": "Use precise booking, verification and review language without implying external effects.",
      "registryItemIds": [
        "policy.signal-decision-proof"
      ]
    },
    {
      "kind": "registry",
      "path": "registry.json",
      "description": "Record project-local Canon dependencies without promoting a new primitive.",
      "registryItemIds": [
        "token.canon-core",
        "policy.signal-decision-proof"
      ]
    }
  ],
  "extensionIntakes": []
};
