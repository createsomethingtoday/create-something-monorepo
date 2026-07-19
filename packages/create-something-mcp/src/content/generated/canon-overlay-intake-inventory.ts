/**
 * Generated Canon overlay intake inventory content — DO NOT EDIT MANUALLY.
 * Run: npm run build:content
 * Source: packages/canon/src/lib/mcp-snapshot/
 */

import type { CanonProjectOverlayInventory } from '../types.js';

export const CANON_OVERLAY_INTAKE_INVENTORY: CanonProjectOverlayInventory = {
  "schemaVersion": 1,
  "id": "canon-overlay-intake-inventory",
  "sourceOfTruth": "@create-something/canon/overlays/intake",
  "description": "Repo-level Canon overlay intake inventory for discovering project overlay manifests, reviewing evidence, and routing repeated-surface proposals back to Canon without forking primitives.",
  "rootDir": "<repo-root>",
  "searchRoots": [
    "apps",
    "packages"
  ],
  "entries": [
    {
      "manifestPath": "apps/atlas-studio-desktop/canon-overlay/manifest.ts",
      "manifest": {
        "id": "overlay.atlas-studio-desktop",
        "name": "Atlas Studio Desktop Overlay",
        "owner": "atlas-team",
        "sourcePackage": "@create-something/atlas-studio-desktop",
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
          "atlas",
          "desktop",
          "app",
          "governance"
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
            "id": "overlay.atlas-studio-desktop.surface-brief",
            "title": "Surface Brief Template",
            "summary": "A reusable project-overlay brief for documenting workflow state, Canon reuse, local artifacts, evidence, and extension-intake needs.",
            "requestedKind": "template",
            "requestedModalities": [
              "web",
              "chat",
              "app",
              "voice",
              "glasses"
            ],
            "owner": "atlas-team",
            "sourcePackage": "@create-something/atlas-studio-desktop",
            "sourcePath": "canon-overlay/templates/surface-brief.md",
            "tags": [
              "overlay",
              "brief",
              "surface",
              "evidence"
            ],
            "surfaces": [
              {
                "surfaceId": "web-atlas-studio-desktop-brief-1",
                "name": "Web project overlay brief",
                "modality": "web",
                "sourcePath": "canon-overlay/templates/surface-brief.md",
                "proof": "Copyable template names Canon reuse, local overlay artifacts, evidence, and extension intake."
              },
              {
                "surfaceId": "chat-atlas-studio-desktop-brief-2",
                "name": "Chat project overlay brief",
                "modality": "chat",
                "sourcePath": "canon-overlay/templates/surface-brief.md",
                "proof": "The same structure summarizes cleanly for agent/chat handoff."
              }
            ],
            "dependencies": [
              "template.canon-project-overlay-manifest",
              "template.canon-extension-intake",
              "policy.signal-decision-proof"
            ]
          }
        ]
      },
      "review": {
        "status": "ready",
        "requiredArtifacts": [
          "theme",
          "tokens",
          "templates",
          "copy-rules",
          "surface-policy",
          "registry"
        ],
        "presentArtifacts": [
          "theme",
          "tokens",
          "templates",
          "copy-rules",
          "surface-policy",
          "registry"
        ],
        "missingArtifacts": [],
        "integrityIssues": [],
        "extensionDecisions": [
          {
            "packet": {
              "id": "overlay.atlas-studio-desktop.surface-brief",
              "title": "Surface Brief Template",
              "summary": "A reusable project-overlay brief for documenting workflow state, Canon reuse, local artifacts, evidence, and extension-intake needs.",
              "requestedKind": "template",
              "requestedModalities": [
                "web",
                "chat",
                "app",
                "voice",
                "glasses"
              ],
              "owner": "atlas-team",
              "sourcePackage": "@create-something/atlas-studio-desktop",
              "sourcePath": "canon-overlay/templates/surface-brief.md",
              "tags": [
                "overlay",
                "brief",
                "surface",
                "evidence"
              ],
              "surfaces": [
                {
                  "surfaceId": "web-atlas-studio-desktop-brief-1",
                  "name": "Web project overlay brief",
                  "modality": "web",
                  "sourcePath": "canon-overlay/templates/surface-brief.md",
                  "proof": "Copyable template names Canon reuse, local overlay artifacts, evidence, and extension intake."
                },
                {
                  "surfaceId": "chat-atlas-studio-desktop-brief-2",
                  "name": "Chat project overlay brief",
                  "modality": "chat",
                  "sourcePath": "canon-overlay/templates/surface-brief.md",
                  "proof": "The same structure summarizes cleanly for agent/chat handoff."
                }
              ],
              "dependencies": [
                "template.canon-project-overlay-manifest",
                "template.canon-extension-intake",
                "policy.signal-decision-proof"
              ]
            },
            "decision": {
              "stage": "candidate",
              "action": "promote-candidate",
              "rationale": "The proposal has evidence from at least two surfaces, so Canon should evaluate it as a shared candidate instead of leaving it project-local.",
              "requiredEvidence": [
                "Source-adjacent implementation path.",
                "At least two surface proofs or client receipts.",
                "Accessibility, evidence, motion, and extension contract notes.",
                "Registry dependencies and modality list."
              ],
              "stopBeforeStable": [
                "Do not mark stable until Canon owns export path, docs, tests, and compatibility notes."
              ]
            }
          }
        ],
        "stopConditions": [
          "Do not mark stable until Canon owns export path, docs, tests, and compatibility notes.",
          "Do not promote project-local overlay primitives into Canon stable without repeated-surface evidence.",
          "Do not fork Canon primitives; keep local copy, policy, tokens, and templates in named overlay artifacts."
        ],
        "summary": "Atlas Studio Desktop Overlay declares the complete Canon overlay artifact set, valid source evidence, and known Canon registry dependencies."
      }
    },
    {
      "manifestPath": "apps/guard-performance-lab/canon-overlay/manifest.ts",
      "manifest": {
        "id": "overlay.guard-performance-lab",
        "name": "Guard Performance Lab Overlay",
        "owner": "performance-lab",
        "sourcePackage": "@create-something/guard-performance-lab",
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
          "performance",
          "basketball",
          "player-development",
          "ai-native",
          "mcp"
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
            "id": "overlay.guard-performance-lab.surface-brief",
            "title": "Surface Brief Template",
            "summary": "A reusable project-overlay brief for documenting workflow state, Canon reuse, local artifacts, evidence, and extension-intake needs.",
            "requestedKind": "template",
            "requestedModalities": [
              "web",
              "chat",
              "app",
              "voice",
              "glasses"
            ],
            "owner": "performance-lab",
            "sourcePackage": "@create-something/guard-performance-lab",
            "sourcePath": "canon-overlay/templates/surface-brief.md",
            "tags": [
              "overlay",
              "brief",
              "surface",
              "evidence"
            ],
            "surfaces": [
              {
                "surfaceId": "web-guard-performance-lab-brief-1",
                "name": "Web project overlay brief",
                "modality": "web",
                "sourcePath": "canon-overlay/templates/surface-brief.md",
                "proof": "Copyable template names Canon reuse, local overlay artifacts, evidence, and extension intake."
              },
              {
                "surfaceId": "chat-guard-performance-lab-brief-2",
                "name": "Chat project overlay brief",
                "modality": "chat",
                "sourcePath": "canon-overlay/templates/surface-brief.md",
                "proof": "The same structure summarizes cleanly for agent/chat handoff."
              }
            ],
            "dependencies": [
              "template.canon-project-overlay-manifest",
              "template.canon-extension-intake",
              "policy.signal-decision-proof"
            ]
          }
        ]
      },
      "review": {
        "status": "ready",
        "requiredArtifacts": [
          "theme",
          "tokens",
          "templates",
          "copy-rules",
          "surface-policy",
          "registry"
        ],
        "presentArtifacts": [
          "theme",
          "tokens",
          "templates",
          "copy-rules",
          "surface-policy",
          "registry"
        ],
        "missingArtifacts": [],
        "integrityIssues": [],
        "extensionDecisions": [
          {
            "packet": {
              "id": "overlay.guard-performance-lab.surface-brief",
              "title": "Surface Brief Template",
              "summary": "A reusable project-overlay brief for documenting workflow state, Canon reuse, local artifacts, evidence, and extension-intake needs.",
              "requestedKind": "template",
              "requestedModalities": [
                "web",
                "chat",
                "app",
                "voice",
                "glasses"
              ],
              "owner": "performance-lab",
              "sourcePackage": "@create-something/guard-performance-lab",
              "sourcePath": "canon-overlay/templates/surface-brief.md",
              "tags": [
                "overlay",
                "brief",
                "surface",
                "evidence"
              ],
              "surfaces": [
                {
                  "surfaceId": "web-guard-performance-lab-brief-1",
                  "name": "Web project overlay brief",
                  "modality": "web",
                  "sourcePath": "canon-overlay/templates/surface-brief.md",
                  "proof": "Copyable template names Canon reuse, local overlay artifacts, evidence, and extension intake."
                },
                {
                  "surfaceId": "chat-guard-performance-lab-brief-2",
                  "name": "Chat project overlay brief",
                  "modality": "chat",
                  "sourcePath": "canon-overlay/templates/surface-brief.md",
                  "proof": "The same structure summarizes cleanly for agent/chat handoff."
                }
              ],
              "dependencies": [
                "template.canon-project-overlay-manifest",
                "template.canon-extension-intake",
                "policy.signal-decision-proof"
              ]
            },
            "decision": {
              "stage": "candidate",
              "action": "promote-candidate",
              "rationale": "The proposal has evidence from at least two surfaces, so Canon should evaluate it as a shared candidate instead of leaving it project-local.",
              "requiredEvidence": [
                "Source-adjacent implementation path.",
                "At least two surface proofs or client receipts.",
                "Accessibility, evidence, motion, and extension contract notes.",
                "Registry dependencies and modality list."
              ],
              "stopBeforeStable": [
                "Do not mark stable until Canon owns export path, docs, tests, and compatibility notes."
              ]
            }
          }
        ],
        "stopConditions": [
          "Do not mark stable until Canon owns export path, docs, tests, and compatibility notes.",
          "Do not promote project-local overlay primitives into Canon stable without repeated-surface evidence.",
          "Do not fork Canon primitives; keep local copy, policy, tokens, and templates in named overlay artifacts."
        ],
        "summary": "Guard Performance Lab Overlay declares the complete Canon overlay artifact set, valid source evidence, and known Canon registry dependencies."
      }
    },
    {
      "manifestPath": "apps/marketplace-template-submission-cloud/canon-overlay/manifest.ts",
      "manifest": {
        "id": "overlay.marketplace-template-submission-cloud",
        "name": "Marketplace Template Submission Cloud Overlay",
        "owner": "webflow-marketplace-team",
        "sourcePackage": "@create-something/marketplace-template-submission-cloud",
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
          "submission",
          "next"
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
            "id": "overlay.marketplace-template-submission-cloud.surface-brief",
            "title": "Surface Brief Template",
            "summary": "A reusable project-overlay brief for documenting workflow state, Canon reuse, local artifacts, evidence, and extension-intake needs.",
            "requestedKind": "template",
            "requestedModalities": [
              "web",
              "chat",
              "app",
              "voice",
              "glasses"
            ],
            "owner": "webflow-marketplace-team",
            "sourcePackage": "@create-something/marketplace-template-submission-cloud",
            "sourcePath": "canon-overlay/templates/surface-brief.md",
            "tags": [
              "overlay",
              "brief",
              "surface",
              "evidence"
            ],
            "surfaces": [
              {
                "surfaceId": "web-marketplace-template-submission-cloud-brief-1",
                "name": "Web project overlay brief",
                "modality": "web",
                "sourcePath": "canon-overlay/templates/surface-brief.md",
                "proof": "Copyable template names Canon reuse, local overlay artifacts, evidence, and extension intake."
              },
              {
                "surfaceId": "chat-marketplace-template-submission-cloud-brief-2",
                "name": "Chat project overlay brief",
                "modality": "chat",
                "sourcePath": "canon-overlay/templates/surface-brief.md",
                "proof": "The same structure summarizes cleanly for agent/chat handoff."
              }
            ],
            "dependencies": [
              "template.canon-project-overlay-manifest",
              "template.canon-extension-intake",
              "policy.signal-decision-proof"
            ]
          }
        ]
      },
      "review": {
        "status": "ready",
        "requiredArtifacts": [
          "theme",
          "tokens",
          "templates",
          "copy-rules",
          "surface-policy",
          "registry"
        ],
        "presentArtifacts": [
          "theme",
          "tokens",
          "templates",
          "copy-rules",
          "surface-policy",
          "registry"
        ],
        "missingArtifacts": [],
        "integrityIssues": [],
        "extensionDecisions": [
          {
            "packet": {
              "id": "overlay.marketplace-template-submission-cloud.surface-brief",
              "title": "Surface Brief Template",
              "summary": "A reusable project-overlay brief for documenting workflow state, Canon reuse, local artifacts, evidence, and extension-intake needs.",
              "requestedKind": "template",
              "requestedModalities": [
                "web",
                "chat",
                "app",
                "voice",
                "glasses"
              ],
              "owner": "webflow-marketplace-team",
              "sourcePackage": "@create-something/marketplace-template-submission-cloud",
              "sourcePath": "canon-overlay/templates/surface-brief.md",
              "tags": [
                "overlay",
                "brief",
                "surface",
                "evidence"
              ],
              "surfaces": [
                {
                  "surfaceId": "web-marketplace-template-submission-cloud-brief-1",
                  "name": "Web project overlay brief",
                  "modality": "web",
                  "sourcePath": "canon-overlay/templates/surface-brief.md",
                  "proof": "Copyable template names Canon reuse, local overlay artifacts, evidence, and extension intake."
                },
                {
                  "surfaceId": "chat-marketplace-template-submission-cloud-brief-2",
                  "name": "Chat project overlay brief",
                  "modality": "chat",
                  "sourcePath": "canon-overlay/templates/surface-brief.md",
                  "proof": "The same structure summarizes cleanly for agent/chat handoff."
                }
              ],
              "dependencies": [
                "template.canon-project-overlay-manifest",
                "template.canon-extension-intake",
                "policy.signal-decision-proof"
              ]
            },
            "decision": {
              "stage": "candidate",
              "action": "promote-candidate",
              "rationale": "The proposal has evidence from at least two surfaces, so Canon should evaluate it as a shared candidate instead of leaving it project-local.",
              "requiredEvidence": [
                "Source-adjacent implementation path.",
                "At least two surface proofs or client receipts.",
                "Accessibility, evidence, motion, and extension contract notes.",
                "Registry dependencies and modality list."
              ],
              "stopBeforeStable": [
                "Do not mark stable until Canon owns export path, docs, tests, and compatibility notes."
              ]
            }
          }
        ],
        "stopConditions": [
          "Do not mark stable until Canon owns export path, docs, tests, and compatibility notes.",
          "Do not promote project-local overlay primitives into Canon stable without repeated-surface evidence.",
          "Do not fork Canon primitives; keep local copy, policy, tokens, and templates in named overlay artifacts."
        ],
        "summary": "Marketplace Template Submission Cloud Overlay declares the complete Canon overlay artifact set, valid source evidence, and known Canon registry dependencies."
      }
    },
    {
      "manifestPath": "apps/webflow-dashboard-cloud/canon-overlay/manifest.ts",
      "manifest": {
        "id": "overlay.webflow-dashboard-cloud",
        "name": "Webflow Dashboard Cloud Overlay",
        "owner": "webflow-dashboard-team",
        "sourcePackage": "@create-something/webflow-dashboard-cloud",
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
          "dashboard",
          "next",
          "operations"
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
            "id": "overlay.webflow-dashboard-cloud.surface-brief",
            "title": "Surface Brief Template",
            "summary": "A reusable project-overlay brief for documenting workflow state, Canon reuse, local artifacts, evidence, and extension-intake needs.",
            "requestedKind": "template",
            "requestedModalities": [
              "web",
              "chat",
              "app",
              "voice",
              "glasses"
            ],
            "owner": "webflow-dashboard-team",
            "sourcePackage": "@create-something/webflow-dashboard-cloud",
            "sourcePath": "canon-overlay/templates/surface-brief.md",
            "tags": [
              "overlay",
              "brief",
              "surface",
              "evidence"
            ],
            "surfaces": [
              {
                "surfaceId": "web-webflow-dashboard-cloud-brief-1",
                "name": "Web project overlay brief",
                "modality": "web",
                "sourcePath": "canon-overlay/templates/surface-brief.md",
                "proof": "Copyable template names Canon reuse, local overlay artifacts, evidence, and extension intake."
              },
              {
                "surfaceId": "chat-webflow-dashboard-cloud-brief-2",
                "name": "Chat project overlay brief",
                "modality": "chat",
                "sourcePath": "canon-overlay/templates/surface-brief.md",
                "proof": "The same structure summarizes cleanly for agent/chat handoff."
              }
            ],
            "dependencies": [
              "template.canon-project-overlay-manifest",
              "template.canon-extension-intake",
              "policy.signal-decision-proof"
            ]
          }
        ]
      },
      "review": {
        "status": "ready",
        "requiredArtifacts": [
          "theme",
          "tokens",
          "templates",
          "copy-rules",
          "surface-policy",
          "registry"
        ],
        "presentArtifacts": [
          "theme",
          "tokens",
          "templates",
          "copy-rules",
          "surface-policy",
          "registry"
        ],
        "missingArtifacts": [],
        "integrityIssues": [],
        "extensionDecisions": [
          {
            "packet": {
              "id": "overlay.webflow-dashboard-cloud.surface-brief",
              "title": "Surface Brief Template",
              "summary": "A reusable project-overlay brief for documenting workflow state, Canon reuse, local artifacts, evidence, and extension-intake needs.",
              "requestedKind": "template",
              "requestedModalities": [
                "web",
                "chat",
                "app",
                "voice",
                "glasses"
              ],
              "owner": "webflow-dashboard-team",
              "sourcePackage": "@create-something/webflow-dashboard-cloud",
              "sourcePath": "canon-overlay/templates/surface-brief.md",
              "tags": [
                "overlay",
                "brief",
                "surface",
                "evidence"
              ],
              "surfaces": [
                {
                  "surfaceId": "web-webflow-dashboard-cloud-brief-1",
                  "name": "Web project overlay brief",
                  "modality": "web",
                  "sourcePath": "canon-overlay/templates/surface-brief.md",
                  "proof": "Copyable template names Canon reuse, local overlay artifacts, evidence, and extension intake."
                },
                {
                  "surfaceId": "chat-webflow-dashboard-cloud-brief-2",
                  "name": "Chat project overlay brief",
                  "modality": "chat",
                  "sourcePath": "canon-overlay/templates/surface-brief.md",
                  "proof": "The same structure summarizes cleanly for agent/chat handoff."
                }
              ],
              "dependencies": [
                "template.canon-project-overlay-manifest",
                "template.canon-extension-intake",
                "policy.signal-decision-proof"
              ]
            },
            "decision": {
              "stage": "candidate",
              "action": "promote-candidate",
              "rationale": "The proposal has evidence from at least two surfaces, so Canon should evaluate it as a shared candidate instead of leaving it project-local.",
              "requiredEvidence": [
                "Source-adjacent implementation path.",
                "At least two surface proofs or client receipts.",
                "Accessibility, evidence, motion, and extension contract notes.",
                "Registry dependencies and modality list."
              ],
              "stopBeforeStable": [
                "Do not mark stable until Canon owns export path, docs, tests, and compatibility notes."
              ]
            }
          }
        ],
        "stopConditions": [
          "Do not mark stable until Canon owns export path, docs, tests, and compatibility notes.",
          "Do not promote project-local overlay primitives into Canon stable without repeated-surface evidence.",
          "Do not fork Canon primitives; keep local copy, policy, tokens, and templates in named overlay artifacts."
        ],
        "summary": "Webflow Dashboard Cloud Overlay declares the complete Canon overlay artifact set, valid source evidence, and known Canon registry dependencies."
      }
    },
    {
      "manifestPath": "apps/webflow-marketplace-category-cloud/canon-overlay/manifest.ts",
      "manifest": {
        "id": "overlay.webflow-marketplace-category-cloud",
        "name": "Webflow Marketplace Category Cloud Overlay",
        "owner": "webflow-marketplace-team",
        "sourcePackage": "@create-something/webflow-marketplace-category-cloud",
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
          "category",
          "next"
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
            "id": "overlay.webflow-marketplace-category-cloud.surface-brief",
            "title": "Surface Brief Template",
            "summary": "A reusable project-overlay brief for documenting workflow state, Canon reuse, local artifacts, evidence, and extension-intake needs.",
            "requestedKind": "template",
            "requestedModalities": [
              "web",
              "chat",
              "app",
              "voice",
              "glasses"
            ],
            "owner": "webflow-marketplace-team",
            "sourcePackage": "@create-something/webflow-marketplace-category-cloud",
            "sourcePath": "canon-overlay/templates/surface-brief.md",
            "tags": [
              "overlay",
              "brief",
              "surface",
              "evidence"
            ],
            "surfaces": [
              {
                "surfaceId": "web-webflow-marketplace-category-cloud-brief-1",
                "name": "Web project overlay brief",
                "modality": "web",
                "sourcePath": "canon-overlay/templates/surface-brief.md",
                "proof": "Copyable template names Canon reuse, local overlay artifacts, evidence, and extension intake."
              },
              {
                "surfaceId": "chat-webflow-marketplace-category-cloud-brief-2",
                "name": "Chat project overlay brief",
                "modality": "chat",
                "sourcePath": "canon-overlay/templates/surface-brief.md",
                "proof": "The same structure summarizes cleanly for agent/chat handoff."
              }
            ],
            "dependencies": [
              "template.canon-project-overlay-manifest",
              "template.canon-extension-intake",
              "policy.signal-decision-proof"
            ]
          }
        ]
      },
      "review": {
        "status": "ready",
        "requiredArtifacts": [
          "theme",
          "tokens",
          "templates",
          "copy-rules",
          "surface-policy",
          "registry"
        ],
        "presentArtifacts": [
          "theme",
          "tokens",
          "templates",
          "copy-rules",
          "surface-policy",
          "registry"
        ],
        "missingArtifacts": [],
        "integrityIssues": [],
        "extensionDecisions": [
          {
            "packet": {
              "id": "overlay.webflow-marketplace-category-cloud.surface-brief",
              "title": "Surface Brief Template",
              "summary": "A reusable project-overlay brief for documenting workflow state, Canon reuse, local artifacts, evidence, and extension-intake needs.",
              "requestedKind": "template",
              "requestedModalities": [
                "web",
                "chat",
                "app",
                "voice",
                "glasses"
              ],
              "owner": "webflow-marketplace-team",
              "sourcePackage": "@create-something/webflow-marketplace-category-cloud",
              "sourcePath": "canon-overlay/templates/surface-brief.md",
              "tags": [
                "overlay",
                "brief",
                "surface",
                "evidence"
              ],
              "surfaces": [
                {
                  "surfaceId": "web-webflow-marketplace-category-cloud-brief-1",
                  "name": "Web project overlay brief",
                  "modality": "web",
                  "sourcePath": "canon-overlay/templates/surface-brief.md",
                  "proof": "Copyable template names Canon reuse, local overlay artifacts, evidence, and extension intake."
                },
                {
                  "surfaceId": "chat-webflow-marketplace-category-cloud-brief-2",
                  "name": "Chat project overlay brief",
                  "modality": "chat",
                  "sourcePath": "canon-overlay/templates/surface-brief.md",
                  "proof": "The same structure summarizes cleanly for agent/chat handoff."
                }
              ],
              "dependencies": [
                "template.canon-project-overlay-manifest",
                "template.canon-extension-intake",
                "policy.signal-decision-proof"
              ]
            },
            "decision": {
              "stage": "candidate",
              "action": "promote-candidate",
              "rationale": "The proposal has evidence from at least two surfaces, so Canon should evaluate it as a shared candidate instead of leaving it project-local.",
              "requiredEvidence": [
                "Source-adjacent implementation path.",
                "At least two surface proofs or client receipts.",
                "Accessibility, evidence, motion, and extension contract notes.",
                "Registry dependencies and modality list."
              ],
              "stopBeforeStable": [
                "Do not mark stable until Canon owns export path, docs, tests, and compatibility notes."
              ]
            }
          }
        ],
        "stopConditions": [
          "Do not mark stable until Canon owns export path, docs, tests, and compatibility notes.",
          "Do not promote project-local overlay primitives into Canon stable without repeated-surface evidence.",
          "Do not fork Canon primitives; keep local copy, policy, tokens, and templates in named overlay artifacts."
        ],
        "summary": "Webflow Marketplace Category Cloud Overlay declares the complete Canon overlay artifact set, valid source evidence, and known Canon registry dependencies."
      }
    },
    {
      "manifestPath": "packages/agency/canon-overlay/manifest.ts",
      "manifest": {
        "id": "overlay.agency-atlas-public",
        "name": "Agency Map Public Overlay",
        "owner": "agency-team",
        "sourcePackage": "@create-something/agency",
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
          "agency",
          "atlas",
          "public-proof",
          "governance"
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
              "component.atlas-atlas-flow",
              "component.atlas-atlas-story-canvas",
              "adapter.atlas-graph-artifact",
              "template.canon-project-overlay-manifest"
            ]
          }
        ],
        "extensionIntakes": [
          {
            "id": "overlay.agency-atlas-public.workflow-proof-surface",
            "title": "Agency public Map workflow proof surface",
            "summary": "A candidate Canon pattern for turning a public Map route, chat-assisted canvas, and booking handoff into one reusable workflow-proof surface without forking internal Atlas primitives.",
            "requestedKind": "template",
            "requestedModalities": [
              "web",
              "chat",
              "app",
              "voice",
              "glasses"
            ],
            "owner": "agency-team",
            "sourcePackage": "@create-something/agency",
            "sourcePath": "src/routes/map/+page.svelte",
            "tags": [
              "overlay",
              "atlas",
              "workflow-proof",
              "booking-handoff",
              "evidence"
            ],
            "surfaces": [
              {
                "surfaceId": "agency-atlas-route",
                "name": "Public Map route",
                "modality": "web",
                "sourcePath": "src/routes/map/+page.svelte",
                "proof": "Route composes PerformancePageSection, PublicAtlasStoryCanvas, and PublicAtlasCanvas so the public page shows story, editable map, readiness, and booking context from one Canon Atlas graph contract."
              },
              {
                "surfaceId": "agency-atlas-agent-canvas",
                "name": "Public Map chat-assisted canvas",
                "modality": "chat",
                "sourcePath": "src/lib/components/PublicAtlasCanvas.svelte",
                "proof": "Canvas posts visitor prompts to /api/atlas/public-agent, enforces public Map intake limits, persists summary metadata, and keeps mutations bounded to the prospect map."
              },
              {
                "surfaceId": "agency-atlas-booking-context",
                "name": "Map booking handoff",
                "modality": "app",
                "sourcePath": "src/lib/components/PublicAtlasCanvas.svelte",
                "proof": "buildBookingUrl carries atlas_session_id, readiness, score, lane, intent, and message count into the booking flow as structured handoff context."
              },
              {
                "surfaceId": "agency-atlas-proof-routes",
                "name": "Agency proof route policy",
                "modality": "web",
                "sourcePath": "src/lib/atlas/surface-policy.ts",
                "proof": "AGENCY_ATLAS_PROOF_PATHS names /services, /map, /methodology, /stack, and product routes as public proof surfaces that share the overlay language."
              },
              {
                "surfaceId": "agency-atlas-voice-routing-summary",
                "name": "Agency Map voice routing summary",
                "modality": "voice",
                "sourcePath": "canon-overlay/copy-rules.md",
                "proof": "Voice copy is constrained to short declarative handoffs that name the owner, next step, proof, and durable record without exposing hidden reasoning or private system access."
              },
              {
                "surfaceId": "agency-atlas-glasses-routing-hud",
                "name": "Agency Map glasses routing HUD policy",
                "modality": "glasses",
                "sourcePath": "canon-overlay/surface-policy.md",
                "proof": "Glasses output is limited to glanceable state, owner, and next action while policy bodies, review history, and reasoning stay on larger Canon surfaces."
              }
            ],
            "dependencies": [
              "component.clear-page-section",
              "component.clear-proof-strip",
              "component.atlas-atlas-flow",
              "component.atlas-atlas-story-canvas",
              "adapter.atlas-graph-artifact",
              "template.atlas-development-handoff",
              "template.canon-project-overlay-manifest",
              "template.canon-extension-intake",
              "policy.signal-decision-proof"
            ]
          }
        ]
      },
      "review": {
        "status": "ready",
        "requiredArtifacts": [
          "theme",
          "tokens",
          "templates",
          "copy-rules",
          "surface-policy",
          "registry"
        ],
        "presentArtifacts": [
          "theme",
          "tokens",
          "templates",
          "copy-rules",
          "surface-policy",
          "registry"
        ],
        "missingArtifacts": [],
        "integrityIssues": [],
        "extensionDecisions": [
          {
            "packet": {
              "id": "overlay.agency-atlas-public.workflow-proof-surface",
              "title": "Agency public Map workflow proof surface",
              "summary": "A candidate Canon pattern for turning a public Map route, chat-assisted canvas, and booking handoff into one reusable workflow-proof surface without forking internal Atlas primitives.",
              "requestedKind": "template",
              "requestedModalities": [
                "web",
                "chat",
                "app",
                "voice",
                "glasses"
              ],
              "owner": "agency-team",
              "sourcePackage": "@create-something/agency",
              "sourcePath": "src/routes/map/+page.svelte",
              "tags": [
                "overlay",
                "atlas",
                "workflow-proof",
                "booking-handoff",
                "evidence"
              ],
              "surfaces": [
                {
                  "surfaceId": "agency-atlas-route",
                  "name": "Public Map route",
                  "modality": "web",
                  "sourcePath": "src/routes/map/+page.svelte",
                  "proof": "Route composes PerformancePageSection, PublicAtlasStoryCanvas, and PublicAtlasCanvas so the public page shows story, editable map, readiness, and booking context from one Canon Atlas graph contract."
                },
                {
                  "surfaceId": "agency-atlas-agent-canvas",
                  "name": "Public Map chat-assisted canvas",
                  "modality": "chat",
                  "sourcePath": "src/lib/components/PublicAtlasCanvas.svelte",
                  "proof": "Canvas posts visitor prompts to /api/atlas/public-agent, enforces public Map intake limits, persists summary metadata, and keeps mutations bounded to the prospect map."
                },
                {
                  "surfaceId": "agency-atlas-booking-context",
                  "name": "Map booking handoff",
                  "modality": "app",
                  "sourcePath": "src/lib/components/PublicAtlasCanvas.svelte",
                  "proof": "buildBookingUrl carries atlas_session_id, readiness, score, lane, intent, and message count into the booking flow as structured handoff context."
                },
                {
                  "surfaceId": "agency-atlas-proof-routes",
                  "name": "Agency proof route policy",
                  "modality": "web",
                  "sourcePath": "src/lib/atlas/surface-policy.ts",
                  "proof": "AGENCY_ATLAS_PROOF_PATHS names /services, /map, /methodology, /stack, and product routes as public proof surfaces that share the overlay language."
                },
                {
                  "surfaceId": "agency-atlas-voice-routing-summary",
                  "name": "Agency Map voice routing summary",
                  "modality": "voice",
                  "sourcePath": "canon-overlay/copy-rules.md",
                  "proof": "Voice copy is constrained to short declarative handoffs that name the owner, next step, proof, and durable record without exposing hidden reasoning or private system access."
                },
                {
                  "surfaceId": "agency-atlas-glasses-routing-hud",
                  "name": "Agency Map glasses routing HUD policy",
                  "modality": "glasses",
                  "sourcePath": "canon-overlay/surface-policy.md",
                  "proof": "Glasses output is limited to glanceable state, owner, and next action while policy bodies, review history, and reasoning stay on larger Canon surfaces."
                }
              ],
              "dependencies": [
                "component.clear-page-section",
                "component.clear-proof-strip",
                "component.atlas-atlas-flow",
                "component.atlas-atlas-story-canvas",
                "adapter.atlas-graph-artifact",
                "template.atlas-development-handoff",
                "template.canon-project-overlay-manifest",
                "template.canon-extension-intake",
                "policy.signal-decision-proof"
              ]
            },
            "decision": {
              "stage": "candidate",
              "action": "promote-candidate",
              "rationale": "The proposal has evidence from at least two surfaces, so Canon should evaluate it as a shared candidate instead of leaving it project-local.",
              "requiredEvidence": [
                "Source-adjacent implementation path.",
                "At least two surface proofs or client receipts.",
                "Accessibility, evidence, motion, and extension contract notes.",
                "Registry dependencies and modality list."
              ],
              "stopBeforeStable": [
                "Do not mark stable until Canon owns export path, docs, tests, and compatibility notes."
              ]
            }
          }
        ],
        "stopConditions": [
          "Do not mark stable until Canon owns export path, docs, tests, and compatibility notes.",
          "Do not promote project-local overlay primitives into Canon stable without repeated-surface evidence.",
          "Do not fork Canon primitives; keep local copy, policy, tokens, and templates in named overlay artifacts."
        ],
        "summary": "Agency Map Public Overlay declares the complete Canon overlay artifact set, valid source evidence, and known Canon registry dependencies."
      }
    },
    {
      "manifestPath": "packages/agency/clients/jandjhomehealth/canon-overlay/manifest.ts",
      "manifest": {
        "id": "overlay.jandjhomehealth",
        "name": "J&J Home Health Client Overlay",
        "owner": "agency-client-team",
        "sourcePackage": "@create-something/jandjhomehealth",
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
          "client",
          "healthcare",
          "agency",
          "sveltekit"
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
            "id": "overlay.jandjhomehealth.surface-brief",
            "title": "Surface Brief Template",
            "summary": "A reusable project-overlay brief for documenting workflow state, Canon reuse, local artifacts, evidence, and extension-intake needs.",
            "requestedKind": "template",
            "requestedModalities": [
              "web",
              "chat",
              "app",
              "voice",
              "glasses"
            ],
            "owner": "agency-client-team",
            "sourcePackage": "@create-something/jandjhomehealth",
            "sourcePath": "canon-overlay/templates/surface-brief.md",
            "tags": [
              "overlay",
              "brief",
              "surface",
              "evidence"
            ],
            "surfaces": [
              {
                "surfaceId": "web-jandjhomehealth-brief-1",
                "name": "Web project overlay brief",
                "modality": "web",
                "sourcePath": "canon-overlay/templates/surface-brief.md",
                "proof": "Copyable template names Canon reuse, local overlay artifacts, evidence, and extension intake."
              },
              {
                "surfaceId": "chat-jandjhomehealth-brief-2",
                "name": "Chat project overlay brief",
                "modality": "chat",
                "sourcePath": "canon-overlay/templates/surface-brief.md",
                "proof": "The same structure summarizes cleanly for agent/chat handoff."
              }
            ],
            "dependencies": [
              "template.canon-project-overlay-manifest",
              "template.canon-extension-intake",
              "policy.signal-decision-proof"
            ]
          }
        ]
      },
      "review": {
        "status": "ready",
        "requiredArtifacts": [
          "theme",
          "tokens",
          "templates",
          "copy-rules",
          "surface-policy",
          "registry"
        ],
        "presentArtifacts": [
          "theme",
          "tokens",
          "templates",
          "copy-rules",
          "surface-policy",
          "registry"
        ],
        "missingArtifacts": [],
        "integrityIssues": [],
        "extensionDecisions": [
          {
            "packet": {
              "id": "overlay.jandjhomehealth.surface-brief",
              "title": "Surface Brief Template",
              "summary": "A reusable project-overlay brief for documenting workflow state, Canon reuse, local artifacts, evidence, and extension-intake needs.",
              "requestedKind": "template",
              "requestedModalities": [
                "web",
                "chat",
                "app",
                "voice",
                "glasses"
              ],
              "owner": "agency-client-team",
              "sourcePackage": "@create-something/jandjhomehealth",
              "sourcePath": "canon-overlay/templates/surface-brief.md",
              "tags": [
                "overlay",
                "brief",
                "surface",
                "evidence"
              ],
              "surfaces": [
                {
                  "surfaceId": "web-jandjhomehealth-brief-1",
                  "name": "Web project overlay brief",
                  "modality": "web",
                  "sourcePath": "canon-overlay/templates/surface-brief.md",
                  "proof": "Copyable template names Canon reuse, local overlay artifacts, evidence, and extension intake."
                },
                {
                  "surfaceId": "chat-jandjhomehealth-brief-2",
                  "name": "Chat project overlay brief",
                  "modality": "chat",
                  "sourcePath": "canon-overlay/templates/surface-brief.md",
                  "proof": "The same structure summarizes cleanly for agent/chat handoff."
                }
              ],
              "dependencies": [
                "template.canon-project-overlay-manifest",
                "template.canon-extension-intake",
                "policy.signal-decision-proof"
              ]
            },
            "decision": {
              "stage": "candidate",
              "action": "promote-candidate",
              "rationale": "The proposal has evidence from at least two surfaces, so Canon should evaluate it as a shared candidate instead of leaving it project-local.",
              "requiredEvidence": [
                "Source-adjacent implementation path.",
                "At least two surface proofs or client receipts.",
                "Accessibility, evidence, motion, and extension contract notes.",
                "Registry dependencies and modality list."
              ],
              "stopBeforeStable": [
                "Do not mark stable until Canon owns export path, docs, tests, and compatibility notes."
              ]
            }
          }
        ],
        "stopConditions": [
          "Do not mark stable until Canon owns export path, docs, tests, and compatibility notes.",
          "Do not promote project-local overlay primitives into Canon stable without repeated-surface evidence.",
          "Do not fork Canon primitives; keep local copy, policy, tokens, and templates in named overlay artifacts."
        ],
        "summary": "J&J Home Health Client Overlay declares the complete Canon overlay artifact set, valid source evidence, and known Canon registry dependencies."
      }
    },
    {
      "manifestPath": "packages/agency/clients/outerfields/canon-overlay/manifest.ts",
      "manifest": {
        "id": "overlay.outerfields",
        "name": "Outerfields Client Overlay",
        "owner": "agency-client-team",
        "sourcePackage": "@create-something/outerfields",
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
          "client",
          "outerfields",
          "agency",
          "sveltekit"
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
            "id": "overlay.outerfields.surface-brief",
            "title": "Surface Brief Template",
            "summary": "A reusable project-overlay brief for documenting workflow state, Canon reuse, local artifacts, evidence, and extension-intake needs.",
            "requestedKind": "template",
            "requestedModalities": [
              "web",
              "chat",
              "app",
              "voice",
              "glasses"
            ],
            "owner": "agency-client-team",
            "sourcePackage": "@create-something/outerfields",
            "sourcePath": "canon-overlay/templates/surface-brief.md",
            "tags": [
              "overlay",
              "brief",
              "surface",
              "evidence"
            ],
            "surfaces": [
              {
                "surfaceId": "web-outerfields-brief-1",
                "name": "Web project overlay brief",
                "modality": "web",
                "sourcePath": "canon-overlay/templates/surface-brief.md",
                "proof": "Copyable template names Canon reuse, local overlay artifacts, evidence, and extension intake."
              },
              {
                "surfaceId": "chat-outerfields-brief-2",
                "name": "Chat project overlay brief",
                "modality": "chat",
                "sourcePath": "canon-overlay/templates/surface-brief.md",
                "proof": "The same structure summarizes cleanly for agent/chat handoff."
              }
            ],
            "dependencies": [
              "template.canon-project-overlay-manifest",
              "template.canon-extension-intake",
              "policy.signal-decision-proof"
            ]
          }
        ]
      },
      "review": {
        "status": "ready",
        "requiredArtifacts": [
          "theme",
          "tokens",
          "templates",
          "copy-rules",
          "surface-policy",
          "registry"
        ],
        "presentArtifacts": [
          "theme",
          "tokens",
          "templates",
          "copy-rules",
          "surface-policy",
          "registry"
        ],
        "missingArtifacts": [],
        "integrityIssues": [],
        "extensionDecisions": [
          {
            "packet": {
              "id": "overlay.outerfields.surface-brief",
              "title": "Surface Brief Template",
              "summary": "A reusable project-overlay brief for documenting workflow state, Canon reuse, local artifacts, evidence, and extension-intake needs.",
              "requestedKind": "template",
              "requestedModalities": [
                "web",
                "chat",
                "app",
                "voice",
                "glasses"
              ],
              "owner": "agency-client-team",
              "sourcePackage": "@create-something/outerfields",
              "sourcePath": "canon-overlay/templates/surface-brief.md",
              "tags": [
                "overlay",
                "brief",
                "surface",
                "evidence"
              ],
              "surfaces": [
                {
                  "surfaceId": "web-outerfields-brief-1",
                  "name": "Web project overlay brief",
                  "modality": "web",
                  "sourcePath": "canon-overlay/templates/surface-brief.md",
                  "proof": "Copyable template names Canon reuse, local overlay artifacts, evidence, and extension intake."
                },
                {
                  "surfaceId": "chat-outerfields-brief-2",
                  "name": "Chat project overlay brief",
                  "modality": "chat",
                  "sourcePath": "canon-overlay/templates/surface-brief.md",
                  "proof": "The same structure summarizes cleanly for agent/chat handoff."
                }
              ],
              "dependencies": [
                "template.canon-project-overlay-manifest",
                "template.canon-extension-intake",
                "policy.signal-decision-proof"
              ]
            },
            "decision": {
              "stage": "candidate",
              "action": "promote-candidate",
              "rationale": "The proposal has evidence from at least two surfaces, so Canon should evaluate it as a shared candidate instead of leaving it project-local.",
              "requiredEvidence": [
                "Source-adjacent implementation path.",
                "At least two surface proofs or client receipts.",
                "Accessibility, evidence, motion, and extension contract notes.",
                "Registry dependencies and modality list."
              ],
              "stopBeforeStable": [
                "Do not mark stable until Canon owns export path, docs, tests, and compatibility notes."
              ]
            }
          }
        ],
        "stopConditions": [
          "Do not mark stable until Canon owns export path, docs, tests, and compatibility notes.",
          "Do not promote project-local overlay primitives into Canon stable without repeated-surface evidence.",
          "Do not fork Canon primitives; keep local copy, policy, tokens, and templates in named overlay artifacts."
        ],
        "summary": "Outerfields Client Overlay declares the complete Canon overlay artifact set, valid source evidence, and known Canon registry dependencies."
      }
    },
    {
      "manifestPath": "packages/agency/clients/the-stack/canon-overlay/manifest.ts",
      "manifest": {
        "id": "overlay.the-stack",
        "name": "The Stack Client Overlay",
        "owner": "agency-client-team",
        "sourcePackage": "@create-something/the-stack",
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
          "client",
          "stack",
          "agency",
          "sveltekit"
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
            "id": "overlay.the-stack.surface-brief",
            "title": "Surface Brief Template",
            "summary": "A reusable project-overlay brief for documenting workflow state, Canon reuse, local artifacts, evidence, and extension-intake needs.",
            "requestedKind": "template",
            "requestedModalities": [
              "web",
              "chat",
              "app",
              "voice",
              "glasses"
            ],
            "owner": "agency-client-team",
            "sourcePackage": "@create-something/the-stack",
            "sourcePath": "canon-overlay/templates/surface-brief.md",
            "tags": [
              "overlay",
              "brief",
              "surface",
              "evidence"
            ],
            "surfaces": [
              {
                "surfaceId": "web-the-stack-brief-1",
                "name": "Web project overlay brief",
                "modality": "web",
                "sourcePath": "canon-overlay/templates/surface-brief.md",
                "proof": "Copyable template names Canon reuse, local overlay artifacts, evidence, and extension intake."
              },
              {
                "surfaceId": "chat-the-stack-brief-2",
                "name": "Chat project overlay brief",
                "modality": "chat",
                "sourcePath": "canon-overlay/templates/surface-brief.md",
                "proof": "The same structure summarizes cleanly for agent/chat handoff."
              }
            ],
            "dependencies": [
              "template.canon-project-overlay-manifest",
              "template.canon-extension-intake",
              "policy.signal-decision-proof"
            ]
          }
        ]
      },
      "review": {
        "status": "ready",
        "requiredArtifacts": [
          "theme",
          "tokens",
          "templates",
          "copy-rules",
          "surface-policy",
          "registry"
        ],
        "presentArtifacts": [
          "theme",
          "tokens",
          "templates",
          "copy-rules",
          "surface-policy",
          "registry"
        ],
        "missingArtifacts": [],
        "integrityIssues": [],
        "extensionDecisions": [
          {
            "packet": {
              "id": "overlay.the-stack.surface-brief",
              "title": "Surface Brief Template",
              "summary": "A reusable project-overlay brief for documenting workflow state, Canon reuse, local artifacts, evidence, and extension-intake needs.",
              "requestedKind": "template",
              "requestedModalities": [
                "web",
                "chat",
                "app",
                "voice",
                "glasses"
              ],
              "owner": "agency-client-team",
              "sourcePackage": "@create-something/the-stack",
              "sourcePath": "canon-overlay/templates/surface-brief.md",
              "tags": [
                "overlay",
                "brief",
                "surface",
                "evidence"
              ],
              "surfaces": [
                {
                  "surfaceId": "web-the-stack-brief-1",
                  "name": "Web project overlay brief",
                  "modality": "web",
                  "sourcePath": "canon-overlay/templates/surface-brief.md",
                  "proof": "Copyable template names Canon reuse, local overlay artifacts, evidence, and extension intake."
                },
                {
                  "surfaceId": "chat-the-stack-brief-2",
                  "name": "Chat project overlay brief",
                  "modality": "chat",
                  "sourcePath": "canon-overlay/templates/surface-brief.md",
                  "proof": "The same structure summarizes cleanly for agent/chat handoff."
                }
              ],
              "dependencies": [
                "template.canon-project-overlay-manifest",
                "template.canon-extension-intake",
                "policy.signal-decision-proof"
              ]
            },
            "decision": {
              "stage": "candidate",
              "action": "promote-candidate",
              "rationale": "The proposal has evidence from at least two surfaces, so Canon should evaluate it as a shared candidate instead of leaving it project-local.",
              "requiredEvidence": [
                "Source-adjacent implementation path.",
                "At least two surface proofs or client receipts.",
                "Accessibility, evidence, motion, and extension contract notes.",
                "Registry dependencies and modality list."
              ],
              "stopBeforeStable": [
                "Do not mark stable until Canon owns export path, docs, tests, and compatibility notes."
              ]
            }
          }
        ],
        "stopConditions": [
          "Do not mark stable until Canon owns export path, docs, tests, and compatibility notes.",
          "Do not promote project-local overlay primitives into Canon stable without repeated-surface evidence.",
          "Do not fork Canon primitives; keep local copy, policy, tokens, and templates in named overlay artifacts."
        ],
        "summary": "The Stack Client Overlay declares the complete Canon overlay artifact set, valid source evidence, and known Canon registry dependencies."
      }
    },
    {
      "manifestPath": "packages/app-governance-db/dashboard/canon-overlay/manifest.ts",
      "manifest": {
        "id": "overlay.app-governance-dashboard",
        "name": "App Governance Dashboard Overlay",
        "owner": "app-governance-team",
        "sourcePackage": "app-governance-dashboard",
        "sourcePath": "manifest.ts",
        "targetModalities": [
          "web",
          "chat",
          "app",
          "voice",
          "glasses"
        ],
        "tags": [
          "governance",
          "dashboard",
          "atlas",
          "evidence"
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
            "id": "overlay.app-governance-dashboard.surface-brief",
            "title": "Surface Brief Template",
            "summary": "A reusable project-overlay brief for documenting workflow state, Canon reuse, local artifacts, evidence, and extension-intake needs.",
            "requestedKind": "template",
            "requestedModalities": [
              "web",
              "chat",
              "app",
              "voice",
              "glasses"
            ],
            "owner": "app-governance-team",
            "sourcePackage": "app-governance-dashboard",
            "sourcePath": "canon-overlay/templates/surface-brief.md",
            "tags": [
              "overlay",
              "brief",
              "surface",
              "evidence"
            ],
            "surfaces": [
              {
                "surfaceId": "web-app-governance-dashboard-brief-1",
                "name": "Web project overlay brief",
                "modality": "web",
                "sourcePath": "canon-overlay/templates/surface-brief.md",
                "proof": "Copyable template names Canon reuse, local overlay artifacts, evidence, and extension intake."
              },
              {
                "surfaceId": "chat-app-governance-dashboard-brief-2",
                "name": "Chat project overlay brief",
                "modality": "chat",
                "sourcePath": "canon-overlay/templates/surface-brief.md",
                "proof": "The same structure summarizes cleanly for agent/chat handoff."
              }
            ],
            "dependencies": [
              "template.canon-project-overlay-manifest",
              "template.canon-extension-intake",
              "policy.signal-decision-proof"
            ]
          }
        ]
      },
      "review": {
        "status": "ready",
        "requiredArtifacts": [
          "theme",
          "tokens",
          "templates",
          "copy-rules",
          "surface-policy",
          "registry"
        ],
        "presentArtifacts": [
          "theme",
          "tokens",
          "templates",
          "copy-rules",
          "surface-policy",
          "registry"
        ],
        "missingArtifacts": [],
        "integrityIssues": [],
        "extensionDecisions": [
          {
            "packet": {
              "id": "overlay.app-governance-dashboard.surface-brief",
              "title": "Surface Brief Template",
              "summary": "A reusable project-overlay brief for documenting workflow state, Canon reuse, local artifacts, evidence, and extension-intake needs.",
              "requestedKind": "template",
              "requestedModalities": [
                "web",
                "chat",
                "app",
                "voice",
                "glasses"
              ],
              "owner": "app-governance-team",
              "sourcePackage": "app-governance-dashboard",
              "sourcePath": "canon-overlay/templates/surface-brief.md",
              "tags": [
                "overlay",
                "brief",
                "surface",
                "evidence"
              ],
              "surfaces": [
                {
                  "surfaceId": "web-app-governance-dashboard-brief-1",
                  "name": "Web project overlay brief",
                  "modality": "web",
                  "sourcePath": "canon-overlay/templates/surface-brief.md",
                  "proof": "Copyable template names Canon reuse, local overlay artifacts, evidence, and extension intake."
                },
                {
                  "surfaceId": "chat-app-governance-dashboard-brief-2",
                  "name": "Chat project overlay brief",
                  "modality": "chat",
                  "sourcePath": "canon-overlay/templates/surface-brief.md",
                  "proof": "The same structure summarizes cleanly for agent/chat handoff."
                }
              ],
              "dependencies": [
                "template.canon-project-overlay-manifest",
                "template.canon-extension-intake",
                "policy.signal-decision-proof"
              ]
            },
            "decision": {
              "stage": "candidate",
              "action": "promote-candidate",
              "rationale": "The proposal has evidence from at least two surfaces, so Canon should evaluate it as a shared candidate instead of leaving it project-local.",
              "requiredEvidence": [
                "Source-adjacent implementation path.",
                "At least two surface proofs or client receipts.",
                "Accessibility, evidence, motion, and extension contract notes.",
                "Registry dependencies and modality list."
              ],
              "stopBeforeStable": [
                "Do not mark stable until Canon owns export path, docs, tests, and compatibility notes."
              ]
            }
          }
        ],
        "stopConditions": [
          "Do not mark stable until Canon owns export path, docs, tests, and compatibility notes.",
          "Do not promote project-local overlay primitives into Canon stable without repeated-surface evidence.",
          "Do not fork Canon primitives; keep local copy, policy, tokens, and templates in named overlay artifacts."
        ],
        "summary": "App Governance Dashboard Overlay declares the complete Canon overlay artifact set, valid source evidence, and known Canon registry dependencies."
      }
    },
    {
      "manifestPath": "packages/app-governance-desktop/canon-overlay/manifest.ts",
      "manifest": {
        "id": "overlay.app-governance-desktop",
        "name": "App Governance Desktop Overlay",
        "owner": "app-governance-team",
        "sourcePackage": "app-governance-desktop",
        "sourcePath": "manifest.ts",
        "targetModalities": [
          "web",
          "chat",
          "app",
          "voice",
          "glasses"
        ],
        "tags": [
          "governance",
          "desktop",
          "atlas",
          "evidence"
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
            "id": "overlay.app-governance-desktop.surface-brief",
            "title": "Surface Brief Template",
            "summary": "A reusable project-overlay brief for documenting workflow state, Canon reuse, local artifacts, evidence, and extension-intake needs.",
            "requestedKind": "template",
            "requestedModalities": [
              "web",
              "chat",
              "app",
              "voice",
              "glasses"
            ],
            "owner": "app-governance-team",
            "sourcePackage": "app-governance-desktop",
            "sourcePath": "canon-overlay/templates/surface-brief.md",
            "tags": [
              "overlay",
              "brief",
              "surface",
              "evidence"
            ],
            "surfaces": [
              {
                "surfaceId": "web-app-governance-desktop-brief-1",
                "name": "Web project overlay brief",
                "modality": "web",
                "sourcePath": "canon-overlay/templates/surface-brief.md",
                "proof": "Copyable template names Canon reuse, local overlay artifacts, evidence, and extension intake."
              },
              {
                "surfaceId": "chat-app-governance-desktop-brief-2",
                "name": "Chat project overlay brief",
                "modality": "chat",
                "sourcePath": "canon-overlay/templates/surface-brief.md",
                "proof": "The same structure summarizes cleanly for agent/chat handoff."
              }
            ],
            "dependencies": [
              "template.canon-project-overlay-manifest",
              "template.canon-extension-intake",
              "policy.signal-decision-proof"
            ]
          }
        ]
      },
      "review": {
        "status": "ready",
        "requiredArtifacts": [
          "theme",
          "tokens",
          "templates",
          "copy-rules",
          "surface-policy",
          "registry"
        ],
        "presentArtifacts": [
          "theme",
          "tokens",
          "templates",
          "copy-rules",
          "surface-policy",
          "registry"
        ],
        "missingArtifacts": [],
        "integrityIssues": [],
        "extensionDecisions": [
          {
            "packet": {
              "id": "overlay.app-governance-desktop.surface-brief",
              "title": "Surface Brief Template",
              "summary": "A reusable project-overlay brief for documenting workflow state, Canon reuse, local artifacts, evidence, and extension-intake needs.",
              "requestedKind": "template",
              "requestedModalities": [
                "web",
                "chat",
                "app",
                "voice",
                "glasses"
              ],
              "owner": "app-governance-team",
              "sourcePackage": "app-governance-desktop",
              "sourcePath": "canon-overlay/templates/surface-brief.md",
              "tags": [
                "overlay",
                "brief",
                "surface",
                "evidence"
              ],
              "surfaces": [
                {
                  "surfaceId": "web-app-governance-desktop-brief-1",
                  "name": "Web project overlay brief",
                  "modality": "web",
                  "sourcePath": "canon-overlay/templates/surface-brief.md",
                  "proof": "Copyable template names Canon reuse, local overlay artifacts, evidence, and extension intake."
                },
                {
                  "surfaceId": "chat-app-governance-desktop-brief-2",
                  "name": "Chat project overlay brief",
                  "modality": "chat",
                  "sourcePath": "canon-overlay/templates/surface-brief.md",
                  "proof": "The same structure summarizes cleanly for agent/chat handoff."
                }
              ],
              "dependencies": [
                "template.canon-project-overlay-manifest",
                "template.canon-extension-intake",
                "policy.signal-decision-proof"
              ]
            },
            "decision": {
              "stage": "candidate",
              "action": "promote-candidate",
              "rationale": "The proposal has evidence from at least two surfaces, so Canon should evaluate it as a shared candidate instead of leaving it project-local.",
              "requiredEvidence": [
                "Source-adjacent implementation path.",
                "At least two surface proofs or client receipts.",
                "Accessibility, evidence, motion, and extension contract notes.",
                "Registry dependencies and modality list."
              ],
              "stopBeforeStable": [
                "Do not mark stable until Canon owns export path, docs, tests, and compatibility notes."
              ]
            }
          }
        ],
        "stopConditions": [
          "Do not mark stable until Canon owns export path, docs, tests, and compatibility notes.",
          "Do not promote project-local overlay primitives into Canon stable without repeated-surface evidence.",
          "Do not fork Canon primitives; keep local copy, policy, tokens, and templates in named overlay artifacts."
        ],
        "summary": "App Governance Desktop Overlay declares the complete Canon overlay artifact set, valid source evidence, and known Canon registry dependencies."
      }
    },
    {
      "manifestPath": "packages/clearway/canon-overlay/manifest.ts",
      "manifest": {
        "id": "overlay.clearway-conversion",
        "name": "Clearway Conversion Overlay",
        "owner": "clearway-team",
        "sourcePackage": "@create-something/clearway",
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
          "clearway",
          "conversion",
          "booking",
          "docs"
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
            "id": "overlay.clearway-conversion.surface-brief",
            "title": "Conversion booking and embed surface",
            "summary": "A candidate Canon conversion template for booking flows, developer embeds, admin receipts, and concise operator handoffs without turning Clearway-specific scheduling copy into Canon primitives.",
            "requestedKind": "template",
            "requestedModalities": [
              "web",
              "chat",
              "app",
              "voice",
              "glasses"
            ],
            "owner": "clearway-team",
            "sourcePackage": "@create-something/clearway",
            "sourcePath": "src/routes/+page.svelte",
            "tags": [
              "overlay",
              "clearway",
              "conversion",
              "booking",
              "docs",
              "evidence"
            ],
            "surfaces": [
              {
                "surfaceId": "clearway-home",
                "name": "Clearway conversion home",
                "modality": "web",
                "sourcePath": "src/routes/+page.svelte",
                "proof": "The home route frames the conversion flow, proof, pricing, and next action for public visitors."
              },
              {
                "surfaceId": "clearway-embed",
                "name": "Developer embed surface",
                "modality": "chat",
                "sourcePath": "src/routes/embed/+page.svelte",
                "proof": "The embed route gives agents and implementers a durable widget target for summarizing integration state without scraping marketing copy."
              },
              {
                "surfaceId": "clearway-admin",
                "name": "Admin booking receipt surface",
                "modality": "app",
                "sourcePath": "src/routes/admin/+page.svelte",
                "proof": "The admin route is the operator-facing app surface for booking state, evidence, and follow-up work."
              },
              {
                "surfaceId": "clearway-booking-voice",
                "name": "Booking voice handoff policy",
                "modality": "voice",
                "sourcePath": "src/routes/book/+page.svelte",
                "proof": "The booking route supplies the short spoken conversion handoff: intent, available action, proof, owner, and next step."
              },
              {
                "surfaceId": "clearway-glance-state",
                "name": "Clearway glasses state policy",
                "modality": "glasses",
                "sourcePath": "canon-overlay/surface-policy.md",
                "proof": "The overlay policy keeps thin displays to booking state, owner, proof, and next action while controls stay on web/app."
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
      },
      "review": {
        "status": "ready",
        "requiredArtifacts": [
          "theme",
          "tokens",
          "templates",
          "copy-rules",
          "surface-policy",
          "registry"
        ],
        "presentArtifacts": [
          "theme",
          "tokens",
          "templates",
          "copy-rules",
          "surface-policy",
          "registry"
        ],
        "missingArtifacts": [],
        "integrityIssues": [],
        "extensionDecisions": [
          {
            "packet": {
              "id": "overlay.clearway-conversion.surface-brief",
              "title": "Conversion booking and embed surface",
              "summary": "A candidate Canon conversion template for booking flows, developer embeds, admin receipts, and concise operator handoffs without turning Clearway-specific scheduling copy into Canon primitives.",
              "requestedKind": "template",
              "requestedModalities": [
                "web",
                "chat",
                "app",
                "voice",
                "glasses"
              ],
              "owner": "clearway-team",
              "sourcePackage": "@create-something/clearway",
              "sourcePath": "src/routes/+page.svelte",
              "tags": [
                "overlay",
                "clearway",
                "conversion",
                "booking",
                "docs",
                "evidence"
              ],
              "surfaces": [
                {
                  "surfaceId": "clearway-home",
                  "name": "Clearway conversion home",
                  "modality": "web",
                  "sourcePath": "src/routes/+page.svelte",
                  "proof": "The home route frames the conversion flow, proof, pricing, and next action for public visitors."
                },
                {
                  "surfaceId": "clearway-embed",
                  "name": "Developer embed surface",
                  "modality": "chat",
                  "sourcePath": "src/routes/embed/+page.svelte",
                  "proof": "The embed route gives agents and implementers a durable widget target for summarizing integration state without scraping marketing copy."
                },
                {
                  "surfaceId": "clearway-admin",
                  "name": "Admin booking receipt surface",
                  "modality": "app",
                  "sourcePath": "src/routes/admin/+page.svelte",
                  "proof": "The admin route is the operator-facing app surface for booking state, evidence, and follow-up work."
                },
                {
                  "surfaceId": "clearway-booking-voice",
                  "name": "Booking voice handoff policy",
                  "modality": "voice",
                  "sourcePath": "src/routes/book/+page.svelte",
                  "proof": "The booking route supplies the short spoken conversion handoff: intent, available action, proof, owner, and next step."
                },
                {
                  "surfaceId": "clearway-glance-state",
                  "name": "Clearway glasses state policy",
                  "modality": "glasses",
                  "sourcePath": "canon-overlay/surface-policy.md",
                  "proof": "The overlay policy keeps thin displays to booking state, owner, proof, and next action while controls stay on web/app."
                }
              ],
              "dependencies": [
                "component.clear-decision-panel",
                "component.clear-proof-strip",
                "template.canon-project-overlay-manifest",
                "template.canon-extension-intake",
                "policy.signal-decision-proof"
              ]
            },
            "decision": {
              "stage": "candidate",
              "action": "promote-candidate",
              "rationale": "The proposal has evidence from at least two surfaces, so Canon should evaluate it as a shared candidate instead of leaving it project-local.",
              "requiredEvidence": [
                "Source-adjacent implementation path.",
                "At least two surface proofs or client receipts.",
                "Accessibility, evidence, motion, and extension contract notes.",
                "Registry dependencies and modality list."
              ],
              "stopBeforeStable": [
                "Do not mark stable until Canon owns export path, docs, tests, and compatibility notes."
              ]
            }
          }
        ],
        "stopConditions": [
          "Do not mark stable until Canon owns export path, docs, tests, and compatibility notes.",
          "Do not promote project-local overlay primitives into Canon stable without repeated-surface evidence.",
          "Do not fork Canon primitives; keep local copy, policy, tokens, and templates in named overlay artifacts."
        ],
        "summary": "Clearway Conversion Overlay declares the complete Canon overlay artifact set, valid source evidence, and known Canon registry dependencies."
      }
    },
    {
      "manifestPath": "packages/client-workspace/canon-overlay/manifest.ts",
      "manifest": {
        "id": "overlay.client-workspace",
        "name": "Governed Client Workspace Overlay",
        "owner": "client-workspace-operator",
        "sourcePackage": "@create-something/client-workspace",
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
          "client-workspace",
          "governance",
          "multimodal"
        ],
        "artifacts": [
          {
            "kind": "theme",
            "path": "theme.css",
            "description": "Project-local CSS aliases that point back to Canon tokens.",
            "registryItemIds": [
              "token.performance-core"
            ]
          },
          {
            "kind": "tokens",
            "path": "tokens.json",
            "description": "Design-token aliases for project-specific names without a new token scale.",
            "registryItemIds": [
              "token.performance-core"
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
            "id": "overlay.client-workspace.surface-brief",
            "title": "Surface Brief Template",
            "summary": "A reusable project-overlay brief for documenting workflow state, Canon reuse, local artifacts, evidence, and extension-intake needs.",
            "requestedKind": "template",
            "requestedModalities": [
              "web",
              "chat",
              "app",
              "voice",
              "glasses"
            ],
            "owner": "client-workspace-operator",
            "sourcePackage": "@create-something/client-workspace",
            "sourcePath": "canon-overlay/templates/surface-brief.md",
            "tags": [
              "overlay",
              "brief",
              "surface",
              "evidence"
            ],
            "surfaces": [
              {
                "surfaceId": "web-client-workspace-brief-1",
                "name": "Web project overlay brief",
                "modality": "web",
                "sourcePath": "canon-overlay/templates/surface-brief.md",
                "proof": "Copyable template names Canon reuse, local overlay artifacts, evidence, and extension intake."
              },
              {
                "surfaceId": "chat-client-workspace-brief-2",
                "name": "Chat project overlay brief",
                "modality": "chat",
                "sourcePath": "canon-overlay/templates/surface-brief.md",
                "proof": "The same structure summarizes cleanly for agent/chat handoff."
              }
            ],
            "dependencies": [
              "template.canon-project-overlay-manifest",
              "template.canon-extension-intake",
              "policy.signal-decision-proof"
            ]
          }
        ]
      },
      "review": {
        "status": "ready",
        "requiredArtifacts": [
          "theme",
          "tokens",
          "templates",
          "copy-rules",
          "surface-policy",
          "registry"
        ],
        "presentArtifacts": [
          "theme",
          "tokens",
          "templates",
          "copy-rules",
          "surface-policy",
          "registry"
        ],
        "missingArtifacts": [],
        "integrityIssues": [],
        "extensionDecisions": [
          {
            "packet": {
              "id": "overlay.client-workspace.surface-brief",
              "title": "Surface Brief Template",
              "summary": "A reusable project-overlay brief for documenting workflow state, Canon reuse, local artifacts, evidence, and extension-intake needs.",
              "requestedKind": "template",
              "requestedModalities": [
                "web",
                "chat",
                "app",
                "voice",
                "glasses"
              ],
              "owner": "client-workspace-operator",
              "sourcePackage": "@create-something/client-workspace",
              "sourcePath": "canon-overlay/templates/surface-brief.md",
              "tags": [
                "overlay",
                "brief",
                "surface",
                "evidence"
              ],
              "surfaces": [
                {
                  "surfaceId": "web-client-workspace-brief-1",
                  "name": "Web project overlay brief",
                  "modality": "web",
                  "sourcePath": "canon-overlay/templates/surface-brief.md",
                  "proof": "Copyable template names Canon reuse, local overlay artifacts, evidence, and extension intake."
                },
                {
                  "surfaceId": "chat-client-workspace-brief-2",
                  "name": "Chat project overlay brief",
                  "modality": "chat",
                  "sourcePath": "canon-overlay/templates/surface-brief.md",
                  "proof": "The same structure summarizes cleanly for agent/chat handoff."
                }
              ],
              "dependencies": [
                "template.canon-project-overlay-manifest",
                "template.canon-extension-intake",
                "policy.signal-decision-proof"
              ]
            },
            "decision": {
              "stage": "candidate",
              "action": "promote-candidate",
              "rationale": "The proposal has evidence from at least two surfaces, so Canon should evaluate it as a shared candidate instead of leaving it project-local.",
              "requiredEvidence": [
                "Source-adjacent implementation path.",
                "At least two surface proofs or client receipts.",
                "Accessibility, evidence, motion, and extension contract notes.",
                "Registry dependencies and modality list."
              ],
              "stopBeforeStable": [
                "Do not mark stable until Canon owns export path, docs, tests, and compatibility notes."
              ]
            }
          }
        ],
        "stopConditions": [
          "Do not mark stable until Canon owns export path, docs, tests, and compatibility notes.",
          "Do not promote project-local overlay primitives into Canon stable without repeated-surface evidence.",
          "Do not fork Canon primitives; keep local copy, policy, tokens, and templates in named overlay artifacts."
        ],
        "summary": "Governed Client Workspace Overlay declares the complete Canon overlay artifact set, valid source evidence, and known Canon registry dependencies."
      }
    },
    {
      "manifestPath": "packages/client-workspace/clients/demo-frontend/canon-overlay/manifest.ts",
      "manifest": {
        "id": "overlay.client-workspace-demo",
        "name": "Client Workspace Demo Overlay",
        "owner": "client-workspace-operator",
        "sourcePackage": "@create-something/client-workspace-demo",
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
          "client-workspace",
          "demo",
          "frontend"
        ],
        "artifacts": [
          {
            "kind": "theme",
            "path": "theme.css",
            "description": "Project-local CSS aliases that point back to Canon tokens.",
            "registryItemIds": [
              "token.performance-core"
            ]
          },
          {
            "kind": "tokens",
            "path": "tokens.json",
            "description": "Design-token aliases for project-specific names without a new token scale.",
            "registryItemIds": [
              "token.performance-core"
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
            "id": "overlay.client-workspace-demo.surface-brief",
            "title": "Surface Brief Template",
            "summary": "A reusable project-overlay brief for documenting workflow state, Canon reuse, local artifacts, evidence, and extension-intake needs.",
            "requestedKind": "template",
            "requestedModalities": [
              "web",
              "chat",
              "app",
              "voice",
              "glasses"
            ],
            "owner": "client-workspace-operator",
            "sourcePackage": "@create-something/client-workspace-demo",
            "sourcePath": "canon-overlay/templates/surface-brief.md",
            "tags": [
              "overlay",
              "brief",
              "surface",
              "evidence"
            ],
            "surfaces": [
              {
                "surfaceId": "web-client-workspace-demo-brief-1",
                "name": "Web project overlay brief",
                "modality": "web",
                "sourcePath": "canon-overlay/templates/surface-brief.md",
                "proof": "Copyable template names Canon reuse, local overlay artifacts, evidence, and extension intake."
              },
              {
                "surfaceId": "chat-client-workspace-demo-brief-2",
                "name": "Chat project overlay brief",
                "modality": "chat",
                "sourcePath": "canon-overlay/templates/surface-brief.md",
                "proof": "The same structure summarizes cleanly for agent/chat handoff."
              }
            ],
            "dependencies": [
              "template.canon-project-overlay-manifest",
              "template.canon-extension-intake",
              "policy.signal-decision-proof"
            ]
          }
        ]
      },
      "review": {
        "status": "ready",
        "requiredArtifacts": [
          "theme",
          "tokens",
          "templates",
          "copy-rules",
          "surface-policy",
          "registry"
        ],
        "presentArtifacts": [
          "theme",
          "tokens",
          "templates",
          "copy-rules",
          "surface-policy",
          "registry"
        ],
        "missingArtifacts": [],
        "integrityIssues": [],
        "extensionDecisions": [
          {
            "packet": {
              "id": "overlay.client-workspace-demo.surface-brief",
              "title": "Surface Brief Template",
              "summary": "A reusable project-overlay brief for documenting workflow state, Canon reuse, local artifacts, evidence, and extension-intake needs.",
              "requestedKind": "template",
              "requestedModalities": [
                "web",
                "chat",
                "app",
                "voice",
                "glasses"
              ],
              "owner": "client-workspace-operator",
              "sourcePackage": "@create-something/client-workspace-demo",
              "sourcePath": "canon-overlay/templates/surface-brief.md",
              "tags": [
                "overlay",
                "brief",
                "surface",
                "evidence"
              ],
              "surfaces": [
                {
                  "surfaceId": "web-client-workspace-demo-brief-1",
                  "name": "Web project overlay brief",
                  "modality": "web",
                  "sourcePath": "canon-overlay/templates/surface-brief.md",
                  "proof": "Copyable template names Canon reuse, local overlay artifacts, evidence, and extension intake."
                },
                {
                  "surfaceId": "chat-client-workspace-demo-brief-2",
                  "name": "Chat project overlay brief",
                  "modality": "chat",
                  "sourcePath": "canon-overlay/templates/surface-brief.md",
                  "proof": "The same structure summarizes cleanly for agent/chat handoff."
                }
              ],
              "dependencies": [
                "template.canon-project-overlay-manifest",
                "template.canon-extension-intake",
                "policy.signal-decision-proof"
              ]
            },
            "decision": {
              "stage": "candidate",
              "action": "promote-candidate",
              "rationale": "The proposal has evidence from at least two surfaces, so Canon should evaluate it as a shared candidate instead of leaving it project-local.",
              "requiredEvidence": [
                "Source-adjacent implementation path.",
                "At least two surface proofs or client receipts.",
                "Accessibility, evidence, motion, and extension contract notes.",
                "Registry dependencies and modality list."
              ],
              "stopBeforeStable": [
                "Do not mark stable until Canon owns export path, docs, tests, and compatibility notes."
              ]
            }
          }
        ],
        "stopConditions": [
          "Do not mark stable until Canon owns export path, docs, tests, and compatibility notes.",
          "Do not promote project-local overlay primitives into Canon stable without repeated-surface evidence.",
          "Do not fork Canon primitives; keep local copy, policy, tokens, and templates in named overlay artifacts."
        ],
        "summary": "Client Workspace Demo Overlay declares the complete Canon overlay artifact set, valid source evidence, and known Canon registry dependencies."
      }
    },
    {
      "manifestPath": "packages/concierge-chat/canon-overlay/manifest.ts",
      "manifest": {
        "id": "overlay.concierge-chat-staffing",
        "name": "Concierge Chat Staffing Overlay",
        "owner": "concierge-team",
        "sourcePackage": "@create-something/concierge-chat",
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
          "concierge",
          "staffing",
          "chat",
          "jobs"
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
            "id": "overlay.concierge-chat-staffing.surface-brief",
            "title": "Staffing concierge chat surface",
            "summary": "A candidate Canon concierge template for governed chat, staffing intake, job matching, profile receipts, and operator settings without promoting one staffing vertical into Canon stable.",
            "requestedKind": "template",
            "requestedModalities": [
              "web",
              "chat",
              "app",
              "voice",
              "glasses"
            ],
            "owner": "concierge-team",
            "sourcePackage": "@create-something/concierge-chat",
            "sourcePath": "src/routes/chat/+page.svelte",
            "tags": [
              "overlay",
              "concierge",
              "staffing",
              "chat",
              "jobs",
              "evidence"
            ],
            "surfaces": [
              {
                "surfaceId": "concierge-home",
                "name": "Concierge staffing home",
                "modality": "web",
                "sourcePath": "src/routes/+page.svelte",
                "proof": "The home route introduces the staffing concierge surface and routes visitors to jobs, nurses, facilities, or chat."
              },
              {
                "surfaceId": "concierge-chat",
                "name": "Governed chat surface",
                "modality": "chat",
                "sourcePath": "src/routes/chat/+page.svelte",
                "proof": "The chat route is the primary conversation surface for progressive profiling, handoff cards, and proof-backed next steps."
              },
              {
                "surfaceId": "concierge-settings",
                "name": "Operator settings surface",
                "modality": "app",
                "sourcePath": "src/routes/settings/+page.svelte",
                "proof": "The settings route gives operators a local app surface for reviewing configuration and handoff state."
              },
              {
                "surfaceId": "concierge-jobs-voice",
                "name": "Jobs voice summary policy",
                "modality": "voice",
                "sourcePath": "src/routes/jobs/+page.svelte",
                "proof": "The jobs route supports short spoken summaries of role, location, fit, proof, and next action."
              },
              {
                "surfaceId": "concierge-glasses-handoff",
                "name": "Concierge glasses handoff policy",
                "modality": "glasses",
                "sourcePath": "canon-overlay/surface-policy.md",
                "proof": "The overlay policy keeps thin displays to candidate/facility state, owner, proof, and next action."
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
      },
      "review": {
        "status": "ready",
        "requiredArtifacts": [
          "theme",
          "tokens",
          "templates",
          "copy-rules",
          "surface-policy",
          "registry"
        ],
        "presentArtifacts": [
          "theme",
          "tokens",
          "templates",
          "copy-rules",
          "surface-policy",
          "registry"
        ],
        "missingArtifacts": [],
        "integrityIssues": [],
        "extensionDecisions": [
          {
            "packet": {
              "id": "overlay.concierge-chat-staffing.surface-brief",
              "title": "Staffing concierge chat surface",
              "summary": "A candidate Canon concierge template for governed chat, staffing intake, job matching, profile receipts, and operator settings without promoting one staffing vertical into Canon stable.",
              "requestedKind": "template",
              "requestedModalities": [
                "web",
                "chat",
                "app",
                "voice",
                "glasses"
              ],
              "owner": "concierge-team",
              "sourcePackage": "@create-something/concierge-chat",
              "sourcePath": "src/routes/chat/+page.svelte",
              "tags": [
                "overlay",
                "concierge",
                "staffing",
                "chat",
                "jobs",
                "evidence"
              ],
              "surfaces": [
                {
                  "surfaceId": "concierge-home",
                  "name": "Concierge staffing home",
                  "modality": "web",
                  "sourcePath": "src/routes/+page.svelte",
                  "proof": "The home route introduces the staffing concierge surface and routes visitors to jobs, nurses, facilities, or chat."
                },
                {
                  "surfaceId": "concierge-chat",
                  "name": "Governed chat surface",
                  "modality": "chat",
                  "sourcePath": "src/routes/chat/+page.svelte",
                  "proof": "The chat route is the primary conversation surface for progressive profiling, handoff cards, and proof-backed next steps."
                },
                {
                  "surfaceId": "concierge-settings",
                  "name": "Operator settings surface",
                  "modality": "app",
                  "sourcePath": "src/routes/settings/+page.svelte",
                  "proof": "The settings route gives operators a local app surface for reviewing configuration and handoff state."
                },
                {
                  "surfaceId": "concierge-jobs-voice",
                  "name": "Jobs voice summary policy",
                  "modality": "voice",
                  "sourcePath": "src/routes/jobs/+page.svelte",
                  "proof": "The jobs route supports short spoken summaries of role, location, fit, proof, and next action."
                },
                {
                  "surfaceId": "concierge-glasses-handoff",
                  "name": "Concierge glasses handoff policy",
                  "modality": "glasses",
                  "sourcePath": "canon-overlay/surface-policy.md",
                  "proof": "The overlay policy keeps thin displays to candidate/facility state, owner, proof, and next action."
                }
              ],
              "dependencies": [
                "component.clear-decision-panel",
                "component.clear-proof-strip",
                "template.canon-project-overlay-manifest",
                "template.canon-extension-intake",
                "policy.signal-decision-proof"
              ]
            },
            "decision": {
              "stage": "candidate",
              "action": "promote-candidate",
              "rationale": "The proposal has evidence from at least two surfaces, so Canon should evaluate it as a shared candidate instead of leaving it project-local.",
              "requiredEvidence": [
                "Source-adjacent implementation path.",
                "At least two surface proofs or client receipts.",
                "Accessibility, evidence, motion, and extension contract notes.",
                "Registry dependencies and modality list."
              ],
              "stopBeforeStable": [
                "Do not mark stable until Canon owns export path, docs, tests, and compatibility notes."
              ]
            }
          }
        ],
        "stopConditions": [
          "Do not mark stable until Canon owns export path, docs, tests, and compatibility notes.",
          "Do not promote project-local overlay primitives into Canon stable without repeated-surface evidence.",
          "Do not fork Canon primitives; keep local copy, policy, tokens, and templates in named overlay artifacts."
        ],
        "summary": "Concierge Chat Staffing Overlay declares the complete Canon overlay artifact set, valid source evidence, and known Canon registry dependencies."
      }
    },
    {
      "manifestPath": "packages/io/canon-overlay/manifest.ts",
      "manifest": {
        "id": "overlay.io-research-artifact",
        "name": "IO Research Artifact Overlay",
        "owner": "research-team",
        "sourcePackage": "@create-something/io",
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
          "io",
          "research",
          "mcp",
          "artifacts"
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
            "id": "overlay.io-research-artifact.surface-brief",
            "title": "Research artifact proof surface",
            "summary": "A candidate Canon research-artifact template for publishing MCP papers, plugin references, visual summaries, and agent-readable source metadata without promoting one article's content into Canon stable.",
            "requestedKind": "template",
            "requestedModalities": [
              "web",
              "chat",
              "app",
              "voice",
              "glasses"
            ],
            "owner": "research-team",
            "sourcePackage": "@create-something/io",
            "sourcePath": "src/lib/config/fileBasedPapers.ts",
            "tags": [
              "overlay",
              "research",
              "mcp",
              "artifact",
              "evidence"
            ],
            "surfaces": [
              {
                "surfaceId": "io-papers-index",
                "name": "Research papers index",
                "modality": "web",
                "sourcePath": "src/routes/papers/+page.svelte",
                "proof": "The papers index exposes file-backed research artifacts through the shared property shell, Canon navigation, and artifact catalog metadata."
              },
              {
                "surfaceId": "io-paper-catalog",
                "name": "File-backed paper catalog",
                "modality": "chat",
                "sourcePath": "src/lib/config/fileBasedPapers.ts",
                "proof": "Checked-in paper metadata gives agents a durable source for title, summary, publication state, and routing without depending on rendered HTML."
              },
              {
                "surfaceId": "io-visual-communication-contract",
                "name": "Research visual communication contract",
                "modality": "app",
                "sourcePath": "src/lib/config/visualCommunication.ts",
                "proof": "The visual communication config binds ASCII, visual summaries, and generated image specs to research artifacts as operator-reviewable evidence."
              },
              {
                "surfaceId": "io-research-voice-summary",
                "name": "Research voice summary policy",
                "modality": "voice",
                "sourcePath": "canon-overlay/copy-rules.md",
                "proof": "The overlay copy rules constrain spoken research summaries to claim, source artifact, proof, and next reading/action rather than long paper bodies."
              },
              {
                "surfaceId": "io-research-glasses-brief",
                "name": "Research glasses brief policy",
                "modality": "glasses",
                "sourcePath": "canon-overlay/surface-policy.md",
                "proof": "The overlay surface policy keeps thin displays to artifact title, status, source, and next action while full papers and diagrams stay on web/app surfaces."
              }
            ],
            "dependencies": [
              "component.clear-proof-strip",
              "template.canon-project-overlay-manifest",
              "template.canon-extension-intake",
              "policy.signal-decision-proof"
            ]
          }
        ]
      },
      "review": {
        "status": "ready",
        "requiredArtifacts": [
          "theme",
          "tokens",
          "templates",
          "copy-rules",
          "surface-policy",
          "registry"
        ],
        "presentArtifacts": [
          "theme",
          "tokens",
          "templates",
          "copy-rules",
          "surface-policy",
          "registry"
        ],
        "missingArtifacts": [],
        "integrityIssues": [],
        "extensionDecisions": [
          {
            "packet": {
              "id": "overlay.io-research-artifact.surface-brief",
              "title": "Research artifact proof surface",
              "summary": "A candidate Canon research-artifact template for publishing MCP papers, plugin references, visual summaries, and agent-readable source metadata without promoting one article's content into Canon stable.",
              "requestedKind": "template",
              "requestedModalities": [
                "web",
                "chat",
                "app",
                "voice",
                "glasses"
              ],
              "owner": "research-team",
              "sourcePackage": "@create-something/io",
              "sourcePath": "src/lib/config/fileBasedPapers.ts",
              "tags": [
                "overlay",
                "research",
                "mcp",
                "artifact",
                "evidence"
              ],
              "surfaces": [
                {
                  "surfaceId": "io-papers-index",
                  "name": "Research papers index",
                  "modality": "web",
                  "sourcePath": "src/routes/papers/+page.svelte",
                  "proof": "The papers index exposes file-backed research artifacts through the shared property shell, Canon navigation, and artifact catalog metadata."
                },
                {
                  "surfaceId": "io-paper-catalog",
                  "name": "File-backed paper catalog",
                  "modality": "chat",
                  "sourcePath": "src/lib/config/fileBasedPapers.ts",
                  "proof": "Checked-in paper metadata gives agents a durable source for title, summary, publication state, and routing without depending on rendered HTML."
                },
                {
                  "surfaceId": "io-visual-communication-contract",
                  "name": "Research visual communication contract",
                  "modality": "app",
                  "sourcePath": "src/lib/config/visualCommunication.ts",
                  "proof": "The visual communication config binds ASCII, visual summaries, and generated image specs to research artifacts as operator-reviewable evidence."
                },
                {
                  "surfaceId": "io-research-voice-summary",
                  "name": "Research voice summary policy",
                  "modality": "voice",
                  "sourcePath": "canon-overlay/copy-rules.md",
                  "proof": "The overlay copy rules constrain spoken research summaries to claim, source artifact, proof, and next reading/action rather than long paper bodies."
                },
                {
                  "surfaceId": "io-research-glasses-brief",
                  "name": "Research glasses brief policy",
                  "modality": "glasses",
                  "sourcePath": "canon-overlay/surface-policy.md",
                  "proof": "The overlay surface policy keeps thin displays to artifact title, status, source, and next action while full papers and diagrams stay on web/app surfaces."
                }
              ],
              "dependencies": [
                "component.clear-proof-strip",
                "template.canon-project-overlay-manifest",
                "template.canon-extension-intake",
                "policy.signal-decision-proof"
              ]
            },
            "decision": {
              "stage": "candidate",
              "action": "promote-candidate",
              "rationale": "The proposal has evidence from at least two surfaces, so Canon should evaluate it as a shared candidate instead of leaving it project-local.",
              "requiredEvidence": [
                "Source-adjacent implementation path.",
                "At least two surface proofs or client receipts.",
                "Accessibility, evidence, motion, and extension contract notes.",
                "Registry dependencies and modality list."
              ],
              "stopBeforeStable": [
                "Do not mark stable until Canon owns export path, docs, tests, and compatibility notes."
              ]
            }
          }
        ],
        "stopConditions": [
          "Do not mark stable until Canon owns export path, docs, tests, and compatibility notes.",
          "Do not promote project-local overlay primitives into Canon stable without repeated-surface evidence.",
          "Do not fork Canon primitives; keep local copy, policy, tokens, and templates in named overlay artifacts."
        ],
        "summary": "IO Research Artifact Overlay declares the complete Canon overlay artifact set, valid source evidence, and known Canon registry dependencies."
      }
    },
    {
      "manifestPath": "packages/lms/canon-overlay/manifest.ts",
      "manifest": {
        "id": "overlay.lms-workflow-learning",
        "name": "LMS Workflow Learning Overlay",
        "owner": "learning-team",
        "sourcePackage": "@create-something/lms",
        "sourcePath": "manifest.ts",
        "targetModalities": [
          "web",
          "app",
          "chat",
          "voice",
          "glasses"
        ],
        "tags": [
          "canon",
          "overlay",
          "project",
          "learning",
          "workflow-proof",
          "canon-training",
          "governance"
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
              "template.canon-project-overlay-template-pack",
              "template.canon-project-overlay-manifest"
            ]
          }
        ],
        "extensionIntakes": [
          {
            "id": "overlay.lms-workflow-learning.lesson-proof-surface",
            "title": "Workflow learning proof surface",
            "summary": "A candidate Canon learning template for teaching workflow proof across lesson content, path navigation, progress receipts, and event telemetry without promoting one course's copy into Canon stable.",
            "requestedKind": "template",
            "requestedModalities": [
              "web",
              "app",
              "chat",
              "voice",
              "glasses"
            ],
            "owner": "learning-team",
            "sourcePackage": "@create-something/lms",
            "sourcePath": "src/lib/content/lessons/make-your-workflow-visible/what-images-prove.md",
            "tags": [
              "overlay",
              "learning",
              "workflow-proof",
              "receipt",
              "evidence"
            ],
            "surfaces": [
              {
                "surfaceId": "lms-workflow-proof-lesson",
                "name": "Workflow proof lesson content",
                "modality": "web",
                "sourcePath": "src/lib/content/lessons/make-your-workflow-visible/what-images-prove.md",
                "proof": "Lesson teaches the Canon image rule and asks operators to name object, state, proof, and owner before using a workflow image."
              },
              {
                "surfaceId": "lms-workflow-path-page",
                "name": "Make Your Workflow Visible path page",
                "modality": "web",
                "sourcePath": "src/routes/paths/[id]/+page.svelte",
                "proof": "Path page renders the Canon workflow-visibility lesson sequence from PATHS, linking each lesson into a reusable operator learning flow."
              },
              {
                "surfaceId": "lms-progress-receipt",
                "name": "Learning progress receipt",
                "modality": "app",
                "sourcePath": "src/routes/progress/+page.svelte",
                "proof": "Progress surface shows paths completed, lessons completed, overall progress, and time learning so the workflow-learning overlay has an operational receipt."
              },
              {
                "surfaceId": "lms-learning-event-api",
                "name": "Learning event handoff API",
                "modality": "chat",
                "sourcePath": "src/routes/api/events/+server.ts",
                "proof": "Authenticated event API records property, event type, and metadata from CREATE SOMETHING properties, giving chat/agent handoffs a durable learning event channel."
              },
              {
                "surfaceId": "lms-learning-voice-coach",
                "name": "Learning voice coach policy",
                "modality": "voice",
                "sourcePath": "canon-overlay/copy-rules.md",
                "proof": "Overlay copy rules constrain spoken learning guidance to path, lesson, object, state, proof, owner, and next exercise instead of reading full lesson content."
              },
              {
                "surfaceId": "lms-learning-glasses-progress",
                "name": "Learning glasses progress policy",
                "modality": "glasses",
                "sourcePath": "canon-overlay/surface-policy.md",
                "proof": "Overlay surface policy keeps thin displays to current path, lesson state, progress receipt, owner, and next action while lesson bodies stay on web/app surfaces."
              }
            ],
            "dependencies": [
              "component.clear-proof-strip",
              "template.canon-project-overlay-manifest",
              "template.canon-project-overlay-template-pack",
              "template.canon-extension-intake",
              "policy.signal-decision-proof"
            ]
          }
        ]
      },
      "review": {
        "status": "ready",
        "requiredArtifacts": [
          "theme",
          "tokens",
          "templates",
          "copy-rules",
          "surface-policy",
          "registry"
        ],
        "presentArtifacts": [
          "theme",
          "tokens",
          "templates",
          "copy-rules",
          "surface-policy",
          "registry"
        ],
        "missingArtifacts": [],
        "integrityIssues": [],
        "extensionDecisions": [
          {
            "packet": {
              "id": "overlay.lms-workflow-learning.lesson-proof-surface",
              "title": "Workflow learning proof surface",
              "summary": "A candidate Canon learning template for teaching workflow proof across lesson content, path navigation, progress receipts, and event telemetry without promoting one course's copy into Canon stable.",
              "requestedKind": "template",
              "requestedModalities": [
                "web",
                "app",
                "chat",
                "voice",
                "glasses"
              ],
              "owner": "learning-team",
              "sourcePackage": "@create-something/lms",
              "sourcePath": "src/lib/content/lessons/make-your-workflow-visible/what-images-prove.md",
              "tags": [
                "overlay",
                "learning",
                "workflow-proof",
                "receipt",
                "evidence"
              ],
              "surfaces": [
                {
                  "surfaceId": "lms-workflow-proof-lesson",
                  "name": "Workflow proof lesson content",
                  "modality": "web",
                  "sourcePath": "src/lib/content/lessons/make-your-workflow-visible/what-images-prove.md",
                  "proof": "Lesson teaches the Canon image rule and asks operators to name object, state, proof, and owner before using a workflow image."
                },
                {
                  "surfaceId": "lms-workflow-path-page",
                  "name": "Make Your Workflow Visible path page",
                  "modality": "web",
                  "sourcePath": "src/routes/paths/[id]/+page.svelte",
                  "proof": "Path page renders the Canon workflow-visibility lesson sequence from PATHS, linking each lesson into a reusable operator learning flow."
                },
                {
                  "surfaceId": "lms-progress-receipt",
                  "name": "Learning progress receipt",
                  "modality": "app",
                  "sourcePath": "src/routes/progress/+page.svelte",
                  "proof": "Progress surface shows paths completed, lessons completed, overall progress, and time learning so the workflow-learning overlay has an operational receipt."
                },
                {
                  "surfaceId": "lms-learning-event-api",
                  "name": "Learning event handoff API",
                  "modality": "chat",
                  "sourcePath": "src/routes/api/events/+server.ts",
                  "proof": "Authenticated event API records property, event type, and metadata from CREATE SOMETHING properties, giving chat/agent handoffs a durable learning event channel."
                },
                {
                  "surfaceId": "lms-learning-voice-coach",
                  "name": "Learning voice coach policy",
                  "modality": "voice",
                  "sourcePath": "canon-overlay/copy-rules.md",
                  "proof": "Overlay copy rules constrain spoken learning guidance to path, lesson, object, state, proof, owner, and next exercise instead of reading full lesson content."
                },
                {
                  "surfaceId": "lms-learning-glasses-progress",
                  "name": "Learning glasses progress policy",
                  "modality": "glasses",
                  "sourcePath": "canon-overlay/surface-policy.md",
                  "proof": "Overlay surface policy keeps thin displays to current path, lesson state, progress receipt, owner, and next action while lesson bodies stay on web/app surfaces."
                }
              ],
              "dependencies": [
                "component.clear-proof-strip",
                "template.canon-project-overlay-manifest",
                "template.canon-project-overlay-template-pack",
                "template.canon-extension-intake",
                "policy.signal-decision-proof"
              ]
            },
            "decision": {
              "stage": "candidate",
              "action": "promote-candidate",
              "rationale": "The proposal has evidence from at least two surfaces, so Canon should evaluate it as a shared candidate instead of leaving it project-local.",
              "requiredEvidence": [
                "Source-adjacent implementation path.",
                "At least two surface proofs or client receipts.",
                "Accessibility, evidence, motion, and extension contract notes.",
                "Registry dependencies and modality list."
              ],
              "stopBeforeStable": [
                "Do not mark stable until Canon owns export path, docs, tests, and compatibility notes."
              ]
            }
          }
        ],
        "stopConditions": [
          "Do not mark stable until Canon owns export path, docs, tests, and compatibility notes.",
          "Do not promote project-local overlay primitives into Canon stable without repeated-surface evidence.",
          "Do not fork Canon primitives; keep local copy, policy, tokens, and templates in named overlay artifacts."
        ],
        "summary": "LMS Workflow Learning Overlay declares the complete Canon overlay artifact set, valid source evidence, and known Canon registry dependencies."
      }
    },
    {
      "manifestPath": "packages/ltd/canon-overlay/manifest.ts",
      "manifest": {
        "id": "overlay.ltd-canon-philosophy",
        "name": "LTD Canon Philosophy Overlay",
        "owner": "ltd-team",
        "sourcePackage": "@create-something/ltd",
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
          "ltd",
          "philosophy",
          "standards",
          "governance"
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
            "id": "overlay.ltd-canon-philosophy.surface-brief",
            "title": "Canon philosophy documentation surface",
            "summary": "A candidate Canon documentation template for turning philosophy, standards, voice, and live Canon docs into one reusable cross-property foundation surface without forking Canon primitives.",
            "requestedKind": "template",
            "requestedModalities": [
              "web",
              "chat",
              "app",
              "voice",
              "glasses"
            ],
            "owner": "ltd-team",
            "sourcePackage": "@create-something/ltd",
            "sourcePath": "src/routes/canon/+page.svelte",
            "tags": [
              "overlay",
              "canon-docs",
              "philosophy",
              "standards",
              "evidence"
            ],
            "surfaces": [
              {
                "surfaceId": "ltd-canon-docs-route",
                "name": "Canon documentation route",
                "modality": "web",
                "sourcePath": "src/routes/canon/+page.svelte",
                "proof": "The Canon route publishes foundations, components, patterns, resources, and contribution paths from the property-owned Canon documentation tree."
              },
              {
                "surfaceId": "ltd-canon-content-loader",
                "name": "Canon content loader",
                "modality": "chat",
                "sourcePath": "src/lib/content-loader.ts",
                "proof": "The content loader turns checked-in Canon markdown into structured page metadata that agents can summarize without scraping route markup."
              },
              {
                "surfaceId": "ltd-standards-checklist",
                "name": "Canon standards checklist",
                "modality": "app",
                "sourcePath": "src/routes/standards/+page.svelte",
                "proof": "The standards route gives operators a usable decision surface for Clear Communication UI, token usage, spacing, motion, accessibility, and proof before shipping."
              },
              {
                "surfaceId": "ltd-voice-guidance",
                "name": "Canon voice guidance",
                "modality": "voice",
                "sourcePath": "src/routes/voice/+page.svelte",
                "proof": "The voice route defines the words, phrases, and forbidden patterns that keep spoken or summarized Canon guidance concise and consistent."
              },
              {
                "surfaceId": "ltd-thin-canon-navigation-policy",
                "name": "Thin Canon navigation policy",
                "modality": "glasses",
                "sourcePath": "canon-overlay/surface-policy.md",
                "proof": "The overlay policy keeps thin displays to route, state, owner, and next action while full philosophy and standards stay in the Canon docs route."
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
      },
      "review": {
        "status": "ready",
        "requiredArtifacts": [
          "theme",
          "tokens",
          "templates",
          "copy-rules",
          "surface-policy",
          "registry"
        ],
        "presentArtifacts": [
          "theme",
          "tokens",
          "templates",
          "copy-rules",
          "surface-policy",
          "registry"
        ],
        "missingArtifacts": [],
        "integrityIssues": [],
        "extensionDecisions": [
          {
            "packet": {
              "id": "overlay.ltd-canon-philosophy.surface-brief",
              "title": "Canon philosophy documentation surface",
              "summary": "A candidate Canon documentation template for turning philosophy, standards, voice, and live Canon docs into one reusable cross-property foundation surface without forking Canon primitives.",
              "requestedKind": "template",
              "requestedModalities": [
                "web",
                "chat",
                "app",
                "voice",
                "glasses"
              ],
              "owner": "ltd-team",
              "sourcePackage": "@create-something/ltd",
              "sourcePath": "src/routes/canon/+page.svelte",
              "tags": [
                "overlay",
                "canon-docs",
                "philosophy",
                "standards",
                "evidence"
              ],
              "surfaces": [
                {
                  "surfaceId": "ltd-canon-docs-route",
                  "name": "Canon documentation route",
                  "modality": "web",
                  "sourcePath": "src/routes/canon/+page.svelte",
                  "proof": "The Canon route publishes foundations, components, patterns, resources, and contribution paths from the property-owned Canon documentation tree."
                },
                {
                  "surfaceId": "ltd-canon-content-loader",
                  "name": "Canon content loader",
                  "modality": "chat",
                  "sourcePath": "src/lib/content-loader.ts",
                  "proof": "The content loader turns checked-in Canon markdown into structured page metadata that agents can summarize without scraping route markup."
                },
                {
                  "surfaceId": "ltd-standards-checklist",
                  "name": "Canon standards checklist",
                  "modality": "app",
                  "sourcePath": "src/routes/standards/+page.svelte",
                  "proof": "The standards route gives operators a usable decision surface for Clear Communication UI, token usage, spacing, motion, accessibility, and proof before shipping."
                },
                {
                  "surfaceId": "ltd-voice-guidance",
                  "name": "Canon voice guidance",
                  "modality": "voice",
                  "sourcePath": "src/routes/voice/+page.svelte",
                  "proof": "The voice route defines the words, phrases, and forbidden patterns that keep spoken or summarized Canon guidance concise and consistent."
                },
                {
                  "surfaceId": "ltd-thin-canon-navigation-policy",
                  "name": "Thin Canon navigation policy",
                  "modality": "glasses",
                  "sourcePath": "canon-overlay/surface-policy.md",
                  "proof": "The overlay policy keeps thin displays to route, state, owner, and next action while full philosophy and standards stay in the Canon docs route."
                }
              ],
              "dependencies": [
                "component.clear-decision-panel",
                "component.clear-proof-strip",
                "template.canon-project-overlay-manifest",
                "template.canon-extension-intake",
                "policy.signal-decision-proof"
              ]
            },
            "decision": {
              "stage": "candidate",
              "action": "promote-candidate",
              "rationale": "The proposal has evidence from at least two surfaces, so Canon should evaluate it as a shared candidate instead of leaving it project-local.",
              "requiredEvidence": [
                "Source-adjacent implementation path.",
                "At least two surface proofs or client receipts.",
                "Accessibility, evidence, motion, and extension contract notes.",
                "Registry dependencies and modality list."
              ],
              "stopBeforeStable": [
                "Do not mark stable until Canon owns export path, docs, tests, and compatibility notes."
              ]
            }
          }
        ],
        "stopConditions": [
          "Do not mark stable until Canon owns export path, docs, tests, and compatibility notes.",
          "Do not promote project-local overlay primitives into Canon stable without repeated-surface evidence.",
          "Do not fork Canon primitives; keep local copy, policy, tokens, and templates in named overlay artifacts."
        ],
        "summary": "LTD Canon Philosophy Overlay declares the complete Canon overlay artifact set, valid source evidence, and known Canon registry dependencies."
      }
    },
    {
      "manifestPath": "packages/maverick-admin/canon-overlay/manifest.ts",
      "manifest": {
        "id": "overlay.maverick-admin",
        "name": "Maverick Admin Overlay",
        "owner": "maverick-team",
        "sourcePackage": "@create-something/maverick-admin",
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
          "maverick",
          "admin",
          "sveltekit"
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
            "id": "overlay.maverick-admin.surface-brief",
            "title": "Surface Brief Template",
            "summary": "A reusable project-overlay brief for documenting workflow state, Canon reuse, local artifacts, evidence, and extension-intake needs.",
            "requestedKind": "template",
            "requestedModalities": [
              "web",
              "chat",
              "app",
              "voice",
              "glasses"
            ],
            "owner": "maverick-team",
            "sourcePackage": "@create-something/maverick-admin",
            "sourcePath": "canon-overlay/templates/surface-brief.md",
            "tags": [
              "overlay",
              "brief",
              "surface",
              "evidence"
            ],
            "surfaces": [
              {
                "surfaceId": "web-maverick-admin-brief-1",
                "name": "Web project overlay brief",
                "modality": "web",
                "sourcePath": "canon-overlay/templates/surface-brief.md",
                "proof": "Copyable template names Canon reuse, local overlay artifacts, evidence, and extension intake."
              },
              {
                "surfaceId": "chat-maverick-admin-brief-2",
                "name": "Chat project overlay brief",
                "modality": "chat",
                "sourcePath": "canon-overlay/templates/surface-brief.md",
                "proof": "The same structure summarizes cleanly for agent/chat handoff."
              }
            ],
            "dependencies": [
              "template.canon-project-overlay-manifest",
              "template.canon-extension-intake",
              "policy.signal-decision-proof"
            ]
          }
        ]
      },
      "review": {
        "status": "ready",
        "requiredArtifacts": [
          "theme",
          "tokens",
          "templates",
          "copy-rules",
          "surface-policy",
          "registry"
        ],
        "presentArtifacts": [
          "theme",
          "tokens",
          "templates",
          "copy-rules",
          "surface-policy",
          "registry"
        ],
        "missingArtifacts": [],
        "integrityIssues": [],
        "extensionDecisions": [
          {
            "packet": {
              "id": "overlay.maverick-admin.surface-brief",
              "title": "Surface Brief Template",
              "summary": "A reusable project-overlay brief for documenting workflow state, Canon reuse, local artifacts, evidence, and extension-intake needs.",
              "requestedKind": "template",
              "requestedModalities": [
                "web",
                "chat",
                "app",
                "voice",
                "glasses"
              ],
              "owner": "maverick-team",
              "sourcePackage": "@create-something/maverick-admin",
              "sourcePath": "canon-overlay/templates/surface-brief.md",
              "tags": [
                "overlay",
                "brief",
                "surface",
                "evidence"
              ],
              "surfaces": [
                {
                  "surfaceId": "web-maverick-admin-brief-1",
                  "name": "Web project overlay brief",
                  "modality": "web",
                  "sourcePath": "canon-overlay/templates/surface-brief.md",
                  "proof": "Copyable template names Canon reuse, local overlay artifacts, evidence, and extension intake."
                },
                {
                  "surfaceId": "chat-maverick-admin-brief-2",
                  "name": "Chat project overlay brief",
                  "modality": "chat",
                  "sourcePath": "canon-overlay/templates/surface-brief.md",
                  "proof": "The same structure summarizes cleanly for agent/chat handoff."
                }
              ],
              "dependencies": [
                "template.canon-project-overlay-manifest",
                "template.canon-extension-intake",
                "policy.signal-decision-proof"
              ]
            },
            "decision": {
              "stage": "candidate",
              "action": "promote-candidate",
              "rationale": "The proposal has evidence from at least two surfaces, so Canon should evaluate it as a shared candidate instead of leaving it project-local.",
              "requiredEvidence": [
                "Source-adjacent implementation path.",
                "At least two surface proofs or client receipts.",
                "Accessibility, evidence, motion, and extension contract notes.",
                "Registry dependencies and modality list."
              ],
              "stopBeforeStable": [
                "Do not mark stable until Canon owns export path, docs, tests, and compatibility notes."
              ]
            }
          }
        ],
        "stopConditions": [
          "Do not mark stable until Canon owns export path, docs, tests, and compatibility notes.",
          "Do not promote project-local overlay primitives into Canon stable without repeated-surface evidence.",
          "Do not fork Canon primitives; keep local copy, policy, tokens, and templates in named overlay artifacts."
        ],
        "summary": "Maverick Admin Overlay declares the complete Canon overlay artifact set, valid source evidence, and known Canon registry dependencies."
      }
    },
    {
      "manifestPath": "packages/maverick/canon-overlay/manifest.ts",
      "manifest": {
        "id": "overlay.maverick-industry",
        "name": "Maverick Industry Overlay",
        "owner": "maverick-team",
        "sourcePackage": "@create-something/maverick",
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
          "maverick",
          "industry",
          "energy",
          "services"
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
            "id": "overlay.maverick-industry.surface-brief",
            "title": "Industry service proof surface",
            "summary": "A candidate Canon industry-service template for public sector pages, product proof, news context, and concise sales handoffs without promoting Maverick-specific claims into Canon.",
            "requestedKind": "template",
            "requestedModalities": [
              "web",
              "chat",
              "app",
              "voice",
              "glasses"
            ],
            "owner": "maverick-team",
            "sourcePackage": "@create-something/maverick",
            "sourcePath": "src/routes/+page.svelte",
            "tags": [
              "overlay",
              "maverick",
              "industry",
              "energy",
              "services",
              "evidence"
            ],
            "surfaces": [
              {
                "surfaceId": "maverick-home",
                "name": "Maverick public home",
                "modality": "web",
                "sourcePath": "src/routes/+page.svelte",
                "proof": "The home route presents the public industry story and routes visitors to sector-specific proof."
              },
              {
                "surfaceId": "maverick-news",
                "name": "Industry news context",
                "modality": "chat",
                "sourcePath": "src/routes/news/+page.svelte",
                "proof": "The news route gives agents a bounded source for current context and public claims."
              },
              {
                "surfaceId": "maverick-oil-gas",
                "name": "Oil and gas service surface",
                "modality": "app",
                "sourcePath": "src/routes/oil-gas/+page.svelte",
                "proof": "The oil and gas route acts as a focused service surface with offer, proof, and next action."
              },
              {
                "surfaceId": "maverick-water-voice",
                "name": "Water treatment voice handoff",
                "modality": "voice",
                "sourcePath": "src/routes/water-treatment/+page.svelte",
                "proof": "The water-treatment route supports concise spoken summaries of sector, problem, proof, and next action."
              },
              {
                "surfaceId": "maverick-glasses-proof",
                "name": "Maverick glasses proof policy",
                "modality": "glasses",
                "sourcePath": "canon-overlay/surface-policy.md",
                "proof": "The overlay policy keeps thin displays to sector, status, proof, owner, and next action."
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
      },
      "review": {
        "status": "ready",
        "requiredArtifacts": [
          "theme",
          "tokens",
          "templates",
          "copy-rules",
          "surface-policy",
          "registry"
        ],
        "presentArtifacts": [
          "theme",
          "tokens",
          "templates",
          "copy-rules",
          "surface-policy",
          "registry"
        ],
        "missingArtifacts": [],
        "integrityIssues": [],
        "extensionDecisions": [
          {
            "packet": {
              "id": "overlay.maverick-industry.surface-brief",
              "title": "Industry service proof surface",
              "summary": "A candidate Canon industry-service template for public sector pages, product proof, news context, and concise sales handoffs without promoting Maverick-specific claims into Canon.",
              "requestedKind": "template",
              "requestedModalities": [
                "web",
                "chat",
                "app",
                "voice",
                "glasses"
              ],
              "owner": "maverick-team",
              "sourcePackage": "@create-something/maverick",
              "sourcePath": "src/routes/+page.svelte",
              "tags": [
                "overlay",
                "maverick",
                "industry",
                "energy",
                "services",
                "evidence"
              ],
              "surfaces": [
                {
                  "surfaceId": "maverick-home",
                  "name": "Maverick public home",
                  "modality": "web",
                  "sourcePath": "src/routes/+page.svelte",
                  "proof": "The home route presents the public industry story and routes visitors to sector-specific proof."
                },
                {
                  "surfaceId": "maverick-news",
                  "name": "Industry news context",
                  "modality": "chat",
                  "sourcePath": "src/routes/news/+page.svelte",
                  "proof": "The news route gives agents a bounded source for current context and public claims."
                },
                {
                  "surfaceId": "maverick-oil-gas",
                  "name": "Oil and gas service surface",
                  "modality": "app",
                  "sourcePath": "src/routes/oil-gas/+page.svelte",
                  "proof": "The oil and gas route acts as a focused service surface with offer, proof, and next action."
                },
                {
                  "surfaceId": "maverick-water-voice",
                  "name": "Water treatment voice handoff",
                  "modality": "voice",
                  "sourcePath": "src/routes/water-treatment/+page.svelte",
                  "proof": "The water-treatment route supports concise spoken summaries of sector, problem, proof, and next action."
                },
                {
                  "surfaceId": "maverick-glasses-proof",
                  "name": "Maverick glasses proof policy",
                  "modality": "glasses",
                  "sourcePath": "canon-overlay/surface-policy.md",
                  "proof": "The overlay policy keeps thin displays to sector, status, proof, owner, and next action."
                }
              ],
              "dependencies": [
                "component.clear-decision-panel",
                "component.clear-proof-strip",
                "template.canon-project-overlay-manifest",
                "template.canon-extension-intake",
                "policy.signal-decision-proof"
              ]
            },
            "decision": {
              "stage": "candidate",
              "action": "promote-candidate",
              "rationale": "The proposal has evidence from at least two surfaces, so Canon should evaluate it as a shared candidate instead of leaving it project-local.",
              "requiredEvidence": [
                "Source-adjacent implementation path.",
                "At least two surface proofs or client receipts.",
                "Accessibility, evidence, motion, and extension contract notes.",
                "Registry dependencies and modality list."
              ],
              "stopBeforeStable": [
                "Do not mark stable until Canon owns export path, docs, tests, and compatibility notes."
              ]
            }
          }
        ],
        "stopConditions": [
          "Do not mark stable until Canon owns export path, docs, tests, and compatibility notes.",
          "Do not promote project-local overlay primitives into Canon stable without repeated-surface evidence.",
          "Do not fork Canon primitives; keep local copy, policy, tokens, and templates in named overlay artifacts."
        ],
        "summary": "Maverick Industry Overlay declares the complete Canon overlay artifact set, valid source evidence, and known Canon registry dependencies."
      }
    },
    {
      "manifestPath": "packages/notion-agent/canon-overlay/manifest.ts",
      "manifest": {
        "id": "overlay.notion-agent-workspace",
        "name": "Notion Agent Workspace Overlay",
        "owner": "notion-agent-team",
        "sourcePackage": "@create-something/notion-agent",
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
          "notion",
          "agents",
          "workspace",
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
            "id": "overlay.notion-agent-workspace.surface-brief",
            "title": "Notion agent workspace surface",
            "summary": "A candidate Canon workspace-agent template for OAuth entry, dashboard review, execution APIs, and compact operator handoffs without promoting Notion-specific tool details into Canon.",
            "requestedKind": "template",
            "requestedModalities": [
              "web",
              "chat",
              "app",
              "voice",
              "glasses"
            ],
            "owner": "notion-agent-team",
            "sourcePackage": "@create-something/notion-agent",
            "sourcePath": "src/routes/dashboard/+page.svelte",
            "tags": [
              "overlay",
              "notion",
              "agents",
              "workspace",
              "dashboard",
              "evidence"
            ],
            "surfaces": [
              {
                "surfaceId": "notion-agent-home",
                "name": "Notion agent public home",
                "modality": "web",
                "sourcePath": "src/routes/+page.svelte",
                "proof": "The home route explains the Notion agent offer and directs operators toward the authenticated workspace flow."
              },
              {
                "surfaceId": "notion-agent-execute-api",
                "name": "Agent execution handoff API",
                "modality": "chat",
                "sourcePath": "src/routes/api/execute/+server.ts",
                "proof": "The execution API gives chat/agent handoffs a durable source for action, result, and receipt state."
              },
              {
                "surfaceId": "notion-agent-dashboard",
                "name": "Workspace dashboard",
                "modality": "app",
                "sourcePath": "src/routes/dashboard/+page.svelte",
                "proof": "The dashboard route is the operator-facing app surface for agent state and workspace receipts."
              },
              {
                "surfaceId": "notion-agent-voice-policy",
                "name": "Workspace voice handoff policy",
                "modality": "voice",
                "sourcePath": "canon-overlay/copy-rules.md",
                "proof": "The copy rules constrain spoken summaries to workspace, action, proof, owner, and next step."
              },
              {
                "surfaceId": "notion-agent-glasses-policy",
                "name": "Workspace glasses state policy",
                "modality": "glasses",
                "sourcePath": "canon-overlay/surface-policy.md",
                "proof": "The surface policy keeps glasses output to workspace state, owner, proof, and next action."
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
      },
      "review": {
        "status": "ready",
        "requiredArtifacts": [
          "theme",
          "tokens",
          "templates",
          "copy-rules",
          "surface-policy",
          "registry"
        ],
        "presentArtifacts": [
          "theme",
          "tokens",
          "templates",
          "copy-rules",
          "surface-policy",
          "registry"
        ],
        "missingArtifacts": [],
        "integrityIssues": [],
        "extensionDecisions": [
          {
            "packet": {
              "id": "overlay.notion-agent-workspace.surface-brief",
              "title": "Notion agent workspace surface",
              "summary": "A candidate Canon workspace-agent template for OAuth entry, dashboard review, execution APIs, and compact operator handoffs without promoting Notion-specific tool details into Canon.",
              "requestedKind": "template",
              "requestedModalities": [
                "web",
                "chat",
                "app",
                "voice",
                "glasses"
              ],
              "owner": "notion-agent-team",
              "sourcePackage": "@create-something/notion-agent",
              "sourcePath": "src/routes/dashboard/+page.svelte",
              "tags": [
                "overlay",
                "notion",
                "agents",
                "workspace",
                "dashboard",
                "evidence"
              ],
              "surfaces": [
                {
                  "surfaceId": "notion-agent-home",
                  "name": "Notion agent public home",
                  "modality": "web",
                  "sourcePath": "src/routes/+page.svelte",
                  "proof": "The home route explains the Notion agent offer and directs operators toward the authenticated workspace flow."
                },
                {
                  "surfaceId": "notion-agent-execute-api",
                  "name": "Agent execution handoff API",
                  "modality": "chat",
                  "sourcePath": "src/routes/api/execute/+server.ts",
                  "proof": "The execution API gives chat/agent handoffs a durable source for action, result, and receipt state."
                },
                {
                  "surfaceId": "notion-agent-dashboard",
                  "name": "Workspace dashboard",
                  "modality": "app",
                  "sourcePath": "src/routes/dashboard/+page.svelte",
                  "proof": "The dashboard route is the operator-facing app surface for agent state and workspace receipts."
                },
                {
                  "surfaceId": "notion-agent-voice-policy",
                  "name": "Workspace voice handoff policy",
                  "modality": "voice",
                  "sourcePath": "canon-overlay/copy-rules.md",
                  "proof": "The copy rules constrain spoken summaries to workspace, action, proof, owner, and next step."
                },
                {
                  "surfaceId": "notion-agent-glasses-policy",
                  "name": "Workspace glasses state policy",
                  "modality": "glasses",
                  "sourcePath": "canon-overlay/surface-policy.md",
                  "proof": "The surface policy keeps glasses output to workspace state, owner, proof, and next action."
                }
              ],
              "dependencies": [
                "component.clear-decision-panel",
                "component.clear-proof-strip",
                "template.canon-project-overlay-manifest",
                "template.canon-extension-intake",
                "policy.signal-decision-proof"
              ]
            },
            "decision": {
              "stage": "candidate",
              "action": "promote-candidate",
              "rationale": "The proposal has evidence from at least two surfaces, so Canon should evaluate it as a shared candidate instead of leaving it project-local.",
              "requiredEvidence": [
                "Source-adjacent implementation path.",
                "At least two surface proofs or client receipts.",
                "Accessibility, evidence, motion, and extension contract notes.",
                "Registry dependencies and modality list."
              ],
              "stopBeforeStable": [
                "Do not mark stable until Canon owns export path, docs, tests, and compatibility notes."
              ]
            }
          }
        ],
        "stopConditions": [
          "Do not mark stable until Canon owns export path, docs, tests, and compatibility notes.",
          "Do not promote project-local overlay primitives into Canon stable without repeated-surface evidence.",
          "Do not fork Canon primitives; keep local copy, policy, tokens, and templates in named overlay artifacts."
        ],
        "summary": "Notion Agent Workspace Overlay declares the complete Canon overlay artifact set, valid source evidence, and known Canon registry dependencies."
      }
    },
    {
      "manifestPath": "packages/ona-agents/canon-overlay/manifest.ts",
      "manifest": {
        "id": "overlay.ona-agents",
        "name": "Performance Agents Overlay",
        "owner": "performance-lab",
        "sourcePackage": "@create-something/ona-agents",
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
          "performance",
          "safety",
          "agents",
          "chat",
          "sveltekit"
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
            "id": "overlay.ona-agents.surface-brief",
            "title": "Surface Brief Template",
            "summary": "A reusable project-overlay brief for documenting workflow state, Canon reuse, local artifacts, evidence, and extension-intake needs.",
            "requestedKind": "template",
            "requestedModalities": [
              "web",
              "chat",
              "app",
              "voice",
              "glasses"
            ],
            "owner": "performance-lab",
            "sourcePackage": "@create-something/ona-agents",
            "sourcePath": "canon-overlay/templates/surface-brief.md",
            "tags": [
              "overlay",
              "brief",
              "surface",
              "evidence"
            ],
            "surfaces": [
              {
                "surfaceId": "web-ona-agents-brief-1",
                "name": "Web project overlay brief",
                "modality": "web",
                "sourcePath": "canon-overlay/templates/surface-brief.md",
                "proof": "Copyable template names Canon reuse, local overlay artifacts, evidence, and extension intake."
              },
              {
                "surfaceId": "chat-ona-agents-brief-2",
                "name": "Chat project overlay brief",
                "modality": "chat",
                "sourcePath": "canon-overlay/templates/surface-brief.md",
                "proof": "The same structure summarizes cleanly for agent/chat handoff."
              }
            ],
            "dependencies": [
              "template.canon-project-overlay-manifest",
              "template.canon-extension-intake",
              "policy.signal-decision-proof"
            ]
          }
        ]
      },
      "review": {
        "status": "ready",
        "requiredArtifacts": [
          "theme",
          "tokens",
          "templates",
          "copy-rules",
          "surface-policy",
          "registry"
        ],
        "presentArtifacts": [
          "theme",
          "tokens",
          "templates",
          "copy-rules",
          "surface-policy",
          "registry"
        ],
        "missingArtifacts": [],
        "integrityIssues": [],
        "extensionDecisions": [
          {
            "packet": {
              "id": "overlay.ona-agents.surface-brief",
              "title": "Surface Brief Template",
              "summary": "A reusable project-overlay brief for documenting workflow state, Canon reuse, local artifacts, evidence, and extension-intake needs.",
              "requestedKind": "template",
              "requestedModalities": [
                "web",
                "chat",
                "app",
                "voice",
                "glasses"
              ],
              "owner": "performance-lab",
              "sourcePackage": "@create-something/ona-agents",
              "sourcePath": "canon-overlay/templates/surface-brief.md",
              "tags": [
                "overlay",
                "brief",
                "surface",
                "evidence"
              ],
              "surfaces": [
                {
                  "surfaceId": "web-ona-agents-brief-1",
                  "name": "Web project overlay brief",
                  "modality": "web",
                  "sourcePath": "canon-overlay/templates/surface-brief.md",
                  "proof": "Copyable template names Canon reuse, local overlay artifacts, evidence, and extension intake."
                },
                {
                  "surfaceId": "chat-ona-agents-brief-2",
                  "name": "Chat project overlay brief",
                  "modality": "chat",
                  "sourcePath": "canon-overlay/templates/surface-brief.md",
                  "proof": "The same structure summarizes cleanly for agent/chat handoff."
                }
              ],
              "dependencies": [
                "template.canon-project-overlay-manifest",
                "template.canon-extension-intake",
                "policy.signal-decision-proof"
              ]
            },
            "decision": {
              "stage": "candidate",
              "action": "promote-candidate",
              "rationale": "The proposal has evidence from at least two surfaces, so Canon should evaluate it as a shared candidate instead of leaving it project-local.",
              "requiredEvidence": [
                "Source-adjacent implementation path.",
                "At least two surface proofs or client receipts.",
                "Accessibility, evidence, motion, and extension contract notes.",
                "Registry dependencies and modality list."
              ],
              "stopBeforeStable": [
                "Do not mark stable until Canon owns export path, docs, tests, and compatibility notes."
              ]
            }
          }
        ],
        "stopConditions": [
          "Do not mark stable until Canon owns export path, docs, tests, and compatibility notes.",
          "Do not promote project-local overlay primitives into Canon stable without repeated-surface evidence.",
          "Do not fork Canon primitives; keep local copy, policy, tokens, and templates in named overlay artifacts."
        ],
        "summary": "Performance Agents Overlay declares the complete Canon overlay artifact set, valid source evidence, and known Canon registry dependencies."
      }
    },
    {
      "manifestPath": "packages/relay/canon-overlay/manifest.ts",
      "manifest": {
        "id": "overlay.relay",
        "name": "Relay Control UI Overlay",
        "owner": "relay-team",
        "sourcePackage": "@create-something/relay",
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
          "relay",
          "control-ui",
          "react"
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
            "id": "overlay.relay.surface-brief",
            "title": "Surface Brief Template",
            "summary": "A reusable project-overlay brief for documenting workflow state, Canon reuse, local artifacts, evidence, and extension-intake needs.",
            "requestedKind": "template",
            "requestedModalities": [
              "web",
              "chat",
              "app",
              "voice",
              "glasses"
            ],
            "owner": "relay-team",
            "sourcePackage": "@create-something/relay",
            "sourcePath": "canon-overlay/templates/surface-brief.md",
            "tags": [
              "overlay",
              "brief",
              "surface",
              "evidence"
            ],
            "surfaces": [
              {
                "surfaceId": "web-relay-brief-1",
                "name": "Web project overlay brief",
                "modality": "web",
                "sourcePath": "canon-overlay/templates/surface-brief.md",
                "proof": "Copyable template names Canon reuse, local overlay artifacts, evidence, and extension intake."
              },
              {
                "surfaceId": "chat-relay-brief-2",
                "name": "Chat project overlay brief",
                "modality": "chat",
                "sourcePath": "canon-overlay/templates/surface-brief.md",
                "proof": "The same structure summarizes cleanly for agent/chat handoff."
              }
            ],
            "dependencies": [
              "template.canon-project-overlay-manifest",
              "template.canon-extension-intake",
              "policy.signal-decision-proof"
            ]
          }
        ]
      },
      "review": {
        "status": "ready",
        "requiredArtifacts": [
          "theme",
          "tokens",
          "templates",
          "copy-rules",
          "surface-policy",
          "registry"
        ],
        "presentArtifacts": [
          "theme",
          "tokens",
          "templates",
          "copy-rules",
          "surface-policy",
          "registry"
        ],
        "missingArtifacts": [],
        "integrityIssues": [],
        "extensionDecisions": [
          {
            "packet": {
              "id": "overlay.relay.surface-brief",
              "title": "Surface Brief Template",
              "summary": "A reusable project-overlay brief for documenting workflow state, Canon reuse, local artifacts, evidence, and extension-intake needs.",
              "requestedKind": "template",
              "requestedModalities": [
                "web",
                "chat",
                "app",
                "voice",
                "glasses"
              ],
              "owner": "relay-team",
              "sourcePackage": "@create-something/relay",
              "sourcePath": "canon-overlay/templates/surface-brief.md",
              "tags": [
                "overlay",
                "brief",
                "surface",
                "evidence"
              ],
              "surfaces": [
                {
                  "surfaceId": "web-relay-brief-1",
                  "name": "Web project overlay brief",
                  "modality": "web",
                  "sourcePath": "canon-overlay/templates/surface-brief.md",
                  "proof": "Copyable template names Canon reuse, local overlay artifacts, evidence, and extension intake."
                },
                {
                  "surfaceId": "chat-relay-brief-2",
                  "name": "Chat project overlay brief",
                  "modality": "chat",
                  "sourcePath": "canon-overlay/templates/surface-brief.md",
                  "proof": "The same structure summarizes cleanly for agent/chat handoff."
                }
              ],
              "dependencies": [
                "template.canon-project-overlay-manifest",
                "template.canon-extension-intake",
                "policy.signal-decision-proof"
              ]
            },
            "decision": {
              "stage": "candidate",
              "action": "promote-candidate",
              "rationale": "The proposal has evidence from at least two surfaces, so Canon should evaluate it as a shared candidate instead of leaving it project-local.",
              "requiredEvidence": [
                "Source-adjacent implementation path.",
                "At least two surface proofs or client receipts.",
                "Accessibility, evidence, motion, and extension contract notes.",
                "Registry dependencies and modality list."
              ],
              "stopBeforeStable": [
                "Do not mark stable until Canon owns export path, docs, tests, and compatibility notes."
              ]
            }
          }
        ],
        "stopConditions": [
          "Do not mark stable until Canon owns export path, docs, tests, and compatibility notes.",
          "Do not promote project-local overlay primitives into Canon stable without repeated-surface evidence.",
          "Do not fork Canon primitives; keep local copy, policy, tokens, and templates in named overlay artifacts."
        ],
        "summary": "Relay Control UI Overlay declares the complete Canon overlay artifact set, valid source evidence, and known Canon registry dependencies."
      }
    },
    {
      "manifestPath": "packages/space/canon-overlay/manifest.ts",
      "manifest": {
        "id": "overlay.space-workbench",
        "name": "Space Workbench Overlay",
        "owner": "space-team",
        "sourcePackage": "@create-something/space",
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
          "space",
          "workbench",
          "tools",
          "governance"
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
            "id": "overlay.space-workbench.surface-brief",
            "title": "Workbench tool proof surface",
            "summary": "A candidate Canon workbench template for turning live tools, playgrounds, data dashboards, and operator receipts into reusable proof surfaces without forking Canon components.",
            "requestedKind": "template",
            "requestedModalities": [
              "web",
              "chat",
              "app",
              "voice",
              "glasses"
            ],
            "owner": "space-team",
            "sourcePackage": "@create-something/space",
            "sourcePath": "src/routes/+page.svelte",
            "tags": [
              "overlay",
              "workbench",
              "tool",
              "proof",
              "evidence"
            ],
            "surfaces": [
              {
                "surfaceId": "space-workbench-home",
                "name": "Workbench home",
                "modality": "web",
                "sourcePath": "src/routes/+page.svelte",
                "proof": "The home route composes PerformancePageSection, PerformanceCardGrid, PerformanceProofStrip, PerformanceDecisionPanel, and PerformanceCtaBand into a live tool directory with proof and handoff states."
              },
              {
                "surfaceId": "space-tool-routing-data",
                "name": "Workbench routing data",
                "modality": "chat",
                "sourcePath": "src/lib/data/routing-experiments.json",
                "proof": "Routing experiment data gives agents structured tool state, notes, and evidence for summarizing live workbench choices."
              },
              {
                "surfaceId": "space-live-data-dashboard",
                "name": "Live data dashboard",
                "modality": "app",
                "sourcePath": "src/routes/data/+page.svelte",
                "proof": "The data route turns live datasets into an operator-facing app surface backed by Canon cards and route-level proof."
              },
              {
                "surfaceId": "space-workbench-voice-handoff",
                "name": "Workbench voice handoff policy",
                "modality": "voice",
                "sourcePath": "canon-overlay/copy-rules.md",
                "proof": "The overlay copy rules constrain spoken tool handoffs to tool, state, required input, proof, and next action."
              },
              {
                "surfaceId": "space-workbench-glasses-state",
                "name": "Workbench glasses state policy",
                "modality": "glasses",
                "sourcePath": "canon-overlay/surface-policy.md",
                "proof": "The overlay surface policy keeps glasses output to tool status, owner, next action, and receipt while live controls stay on larger workbench surfaces."
              }
            ],
            "dependencies": [
              "component.clear-decision-panel",
              "template.canon-project-overlay-manifest",
              "template.canon-extension-intake",
              "policy.signal-decision-proof"
            ]
          }
        ]
      },
      "review": {
        "status": "ready",
        "requiredArtifacts": [
          "theme",
          "tokens",
          "templates",
          "copy-rules",
          "surface-policy",
          "registry"
        ],
        "presentArtifacts": [
          "theme",
          "tokens",
          "templates",
          "copy-rules",
          "surface-policy",
          "registry"
        ],
        "missingArtifacts": [],
        "integrityIssues": [],
        "extensionDecisions": [
          {
            "packet": {
              "id": "overlay.space-workbench.surface-brief",
              "title": "Workbench tool proof surface",
              "summary": "A candidate Canon workbench template for turning live tools, playgrounds, data dashboards, and operator receipts into reusable proof surfaces without forking Canon components.",
              "requestedKind": "template",
              "requestedModalities": [
                "web",
                "chat",
                "app",
                "voice",
                "glasses"
              ],
              "owner": "space-team",
              "sourcePackage": "@create-something/space",
              "sourcePath": "src/routes/+page.svelte",
              "tags": [
                "overlay",
                "workbench",
                "tool",
                "proof",
                "evidence"
              ],
              "surfaces": [
                {
                  "surfaceId": "space-workbench-home",
                  "name": "Workbench home",
                  "modality": "web",
                  "sourcePath": "src/routes/+page.svelte",
                  "proof": "The home route composes PerformancePageSection, PerformanceCardGrid, PerformanceProofStrip, PerformanceDecisionPanel, and PerformanceCtaBand into a live tool directory with proof and handoff states."
                },
                {
                  "surfaceId": "space-tool-routing-data",
                  "name": "Workbench routing data",
                  "modality": "chat",
                  "sourcePath": "src/lib/data/routing-experiments.json",
                  "proof": "Routing experiment data gives agents structured tool state, notes, and evidence for summarizing live workbench choices."
                },
                {
                  "surfaceId": "space-live-data-dashboard",
                  "name": "Live data dashboard",
                  "modality": "app",
                  "sourcePath": "src/routes/data/+page.svelte",
                  "proof": "The data route turns live datasets into an operator-facing app surface backed by Canon cards and route-level proof."
                },
                {
                  "surfaceId": "space-workbench-voice-handoff",
                  "name": "Workbench voice handoff policy",
                  "modality": "voice",
                  "sourcePath": "canon-overlay/copy-rules.md",
                  "proof": "The overlay copy rules constrain spoken tool handoffs to tool, state, required input, proof, and next action."
                },
                {
                  "surfaceId": "space-workbench-glasses-state",
                  "name": "Workbench glasses state policy",
                  "modality": "glasses",
                  "sourcePath": "canon-overlay/surface-policy.md",
                  "proof": "The overlay surface policy keeps glasses output to tool status, owner, next action, and receipt while live controls stay on larger workbench surfaces."
                }
              ],
              "dependencies": [
                "component.clear-decision-panel",
                "template.canon-project-overlay-manifest",
                "template.canon-extension-intake",
                "policy.signal-decision-proof"
              ]
            },
            "decision": {
              "stage": "candidate",
              "action": "promote-candidate",
              "rationale": "The proposal has evidence from at least two surfaces, so Canon should evaluate it as a shared candidate instead of leaving it project-local.",
              "requiredEvidence": [
                "Source-adjacent implementation path.",
                "At least two surface proofs or client receipts.",
                "Accessibility, evidence, motion, and extension contract notes.",
                "Registry dependencies and modality list."
              ],
              "stopBeforeStable": [
                "Do not mark stable until Canon owns export path, docs, tests, and compatibility notes."
              ]
            }
          }
        ],
        "stopConditions": [
          "Do not mark stable until Canon owns export path, docs, tests, and compatibility notes.",
          "Do not promote project-local overlay primitives into Canon stable without repeated-surface evidence.",
          "Do not fork Canon primitives; keep local copy, policy, tokens, and templates in named overlay artifacts."
        ],
        "summary": "Space Workbench Overlay declares the complete Canon overlay artifact set, valid source evidence, and known Canon registry dependencies."
      }
    },
    {
      "manifestPath": "packages/spritz/canon-overlay/manifest.ts",
      "manifest": {
        "id": "overlay.spritz-reading",
        "name": "Spritz Reading Overlay",
        "owner": "spritz-team",
        "sourcePackage": "@create-something/spritz",
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
          "spritz",
          "reading",
          "component",
          "demo"
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
            "id": "overlay.spritz-reading.surface-brief",
            "title": "Reading component proof surface",
            "summary": "A candidate Canon component-demo template for interactive reading controls, component API evidence, and compact preview handoffs without making Spritz behavior a Canon primitive.",
            "requestedKind": "template",
            "requestedModalities": [
              "web",
              "chat",
              "app",
              "voice",
              "glasses"
            ],
            "owner": "spritz-team",
            "sourcePackage": "@create-something/spritz",
            "sourcePath": "src/routes/+page.svelte",
            "tags": [
              "overlay",
              "spritz",
              "reading",
              "component",
              "demo",
              "evidence"
            ],
            "surfaces": [
              {
                "surfaceId": "spritz-demo",
                "name": "Spritz demo route",
                "modality": "web",
                "sourcePath": "src/routes/+page.svelte",
                "proof": "The demo route renders the interactive reading component and its visitor-facing proof."
              },
              {
                "surfaceId": "spritz-component-api",
                "name": "Spritz component API",
                "modality": "chat",
                "sourcePath": "src/lib/index.ts",
                "proof": "The library entry gives agents a stable source for exports and integration summaries."
              },
              {
                "surfaceId": "spritz-component",
                "name": "Spritz component implementation",
                "modality": "app",
                "sourcePath": "src/lib/Spritz.svelte",
                "proof": "The component implementation is the app-level control surface for reading state and interaction behavior."
              },
              {
                "surfaceId": "spritz-voice-policy",
                "name": "Spritz voice preview policy",
                "modality": "voice",
                "sourcePath": "canon-overlay/copy-rules.md",
                "proof": "The copy rules constrain spoken previews to reading state, speed, proof, and next action."
              },
              {
                "surfaceId": "spritz-glasses-policy",
                "name": "Spritz glasses preview policy",
                "modality": "glasses",
                "sourcePath": "canon-overlay/surface-policy.md",
                "proof": "The surface policy keeps thin displays to current word/state, speed, and next action."
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
      },
      "review": {
        "status": "ready",
        "requiredArtifacts": [
          "theme",
          "tokens",
          "templates",
          "copy-rules",
          "surface-policy",
          "registry"
        ],
        "presentArtifacts": [
          "theme",
          "tokens",
          "templates",
          "copy-rules",
          "surface-policy",
          "registry"
        ],
        "missingArtifacts": [],
        "integrityIssues": [],
        "extensionDecisions": [
          {
            "packet": {
              "id": "overlay.spritz-reading.surface-brief",
              "title": "Reading component proof surface",
              "summary": "A candidate Canon component-demo template for interactive reading controls, component API evidence, and compact preview handoffs without making Spritz behavior a Canon primitive.",
              "requestedKind": "template",
              "requestedModalities": [
                "web",
                "chat",
                "app",
                "voice",
                "glasses"
              ],
              "owner": "spritz-team",
              "sourcePackage": "@create-something/spritz",
              "sourcePath": "src/routes/+page.svelte",
              "tags": [
                "overlay",
                "spritz",
                "reading",
                "component",
                "demo",
                "evidence"
              ],
              "surfaces": [
                {
                  "surfaceId": "spritz-demo",
                  "name": "Spritz demo route",
                  "modality": "web",
                  "sourcePath": "src/routes/+page.svelte",
                  "proof": "The demo route renders the interactive reading component and its visitor-facing proof."
                },
                {
                  "surfaceId": "spritz-component-api",
                  "name": "Spritz component API",
                  "modality": "chat",
                  "sourcePath": "src/lib/index.ts",
                  "proof": "The library entry gives agents a stable source for exports and integration summaries."
                },
                {
                  "surfaceId": "spritz-component",
                  "name": "Spritz component implementation",
                  "modality": "app",
                  "sourcePath": "src/lib/Spritz.svelte",
                  "proof": "The component implementation is the app-level control surface for reading state and interaction behavior."
                },
                {
                  "surfaceId": "spritz-voice-policy",
                  "name": "Spritz voice preview policy",
                  "modality": "voice",
                  "sourcePath": "canon-overlay/copy-rules.md",
                  "proof": "The copy rules constrain spoken previews to reading state, speed, proof, and next action."
                },
                {
                  "surfaceId": "spritz-glasses-policy",
                  "name": "Spritz glasses preview policy",
                  "modality": "glasses",
                  "sourcePath": "canon-overlay/surface-policy.md",
                  "proof": "The surface policy keeps thin displays to current word/state, speed, and next action."
                }
              ],
              "dependencies": [
                "component.clear-decision-panel",
                "component.clear-proof-strip",
                "template.canon-project-overlay-manifest",
                "template.canon-extension-intake",
                "policy.signal-decision-proof"
              ]
            },
            "decision": {
              "stage": "candidate",
              "action": "promote-candidate",
              "rationale": "The proposal has evidence from at least two surfaces, so Canon should evaluate it as a shared candidate instead of leaving it project-local.",
              "requiredEvidence": [
                "Source-adjacent implementation path.",
                "At least two surface proofs or client receipts.",
                "Accessibility, evidence, motion, and extension contract notes.",
                "Registry dependencies and modality list."
              ],
              "stopBeforeStable": [
                "Do not mark stable until Canon owns export path, docs, tests, and compatibility notes."
              ]
            }
          }
        ],
        "stopConditions": [
          "Do not mark stable until Canon owns export path, docs, tests, and compatibility notes.",
          "Do not promote project-local overlay primitives into Canon stable without repeated-surface evidence.",
          "Do not fork Canon primitives; keep local copy, policy, tokens, and templates in named overlay artifacts."
        ],
        "summary": "Spritz Reading Overlay declares the complete Canon overlay artifact set, valid source evidence, and known Canon registry dependencies."
      }
    },
    {
      "manifestPath": "packages/tend/canon-overlay/manifest.ts",
      "manifest": {
        "id": "overlay.tend-database",
        "name": "Tend Database Overlay",
        "owner": "tend-team",
        "sourcePackage": "@create-something/tend",
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
          "tend",
          "database",
          "sources",
          "settings"
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
            "id": "overlay.tend-database.surface-brief",
            "title": "Database source management surface",
            "summary": "A candidate Canon database-service template for source setup, settings, agent automation, and receipt handoffs without promoting Tend-specific vertical schemas into Canon.",
            "requestedKind": "template",
            "requestedModalities": [
              "web",
              "chat",
              "app",
              "voice",
              "glasses"
            ],
            "owner": "tend-team",
            "sourcePackage": "@create-something/tend",
            "sourcePath": "src/routes/+page.svelte",
            "tags": [
              "overlay",
              "tend",
              "database",
              "sources",
              "settings",
              "evidence"
            ],
            "surfaces": [
              {
                "surfaceId": "tend-home",
                "name": "Tend public home",
                "modality": "web",
                "sourcePath": "src/routes/+page.svelte",
                "proof": "The home route introduces the database service, automation model, and next action."
              },
              {
                "surfaceId": "tend-agent-sdk",
                "name": "Agent SDK handoff",
                "modality": "chat",
                "sourcePath": "src/lib/sdk/agent.ts",
                "proof": "The SDK agent module gives agents a source for summarizing automation capabilities without relying on rendered copy."
              },
              {
                "surfaceId": "tend-sources",
                "name": "Source management route",
                "modality": "app",
                "sourcePath": "src/routes/sources/+page.svelte",
                "proof": "The sources route is the app surface for database inputs, state, and receipts."
              },
              {
                "surfaceId": "tend-settings-voice",
                "name": "Settings voice handoff",
                "modality": "voice",
                "sourcePath": "src/routes/settings/+page.svelte",
                "proof": "The settings route supports concise spoken summaries of configuration, state, owner, and next action."
              },
              {
                "surfaceId": "tend-glasses-state",
                "name": "Tend glasses state policy",
                "modality": "glasses",
                "sourcePath": "canon-overlay/surface-policy.md",
                "proof": "The overlay policy keeps thin displays to source state, owner, proof, and next action."
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
      },
      "review": {
        "status": "ready",
        "requiredArtifacts": [
          "theme",
          "tokens",
          "templates",
          "copy-rules",
          "surface-policy",
          "registry"
        ],
        "presentArtifacts": [
          "theme",
          "tokens",
          "templates",
          "copy-rules",
          "surface-policy",
          "registry"
        ],
        "missingArtifacts": [],
        "integrityIssues": [],
        "extensionDecisions": [
          {
            "packet": {
              "id": "overlay.tend-database.surface-brief",
              "title": "Database source management surface",
              "summary": "A candidate Canon database-service template for source setup, settings, agent automation, and receipt handoffs without promoting Tend-specific vertical schemas into Canon.",
              "requestedKind": "template",
              "requestedModalities": [
                "web",
                "chat",
                "app",
                "voice",
                "glasses"
              ],
              "owner": "tend-team",
              "sourcePackage": "@create-something/tend",
              "sourcePath": "src/routes/+page.svelte",
              "tags": [
                "overlay",
                "tend",
                "database",
                "sources",
                "settings",
                "evidence"
              ],
              "surfaces": [
                {
                  "surfaceId": "tend-home",
                  "name": "Tend public home",
                  "modality": "web",
                  "sourcePath": "src/routes/+page.svelte",
                  "proof": "The home route introduces the database service, automation model, and next action."
                },
                {
                  "surfaceId": "tend-agent-sdk",
                  "name": "Agent SDK handoff",
                  "modality": "chat",
                  "sourcePath": "src/lib/sdk/agent.ts",
                  "proof": "The SDK agent module gives agents a source for summarizing automation capabilities without relying on rendered copy."
                },
                {
                  "surfaceId": "tend-sources",
                  "name": "Source management route",
                  "modality": "app",
                  "sourcePath": "src/routes/sources/+page.svelte",
                  "proof": "The sources route is the app surface for database inputs, state, and receipts."
                },
                {
                  "surfaceId": "tend-settings-voice",
                  "name": "Settings voice handoff",
                  "modality": "voice",
                  "sourcePath": "src/routes/settings/+page.svelte",
                  "proof": "The settings route supports concise spoken summaries of configuration, state, owner, and next action."
                },
                {
                  "surfaceId": "tend-glasses-state",
                  "name": "Tend glasses state policy",
                  "modality": "glasses",
                  "sourcePath": "canon-overlay/surface-policy.md",
                  "proof": "The overlay policy keeps thin displays to source state, owner, proof, and next action."
                }
              ],
              "dependencies": [
                "component.clear-decision-panel",
                "component.clear-proof-strip",
                "template.canon-project-overlay-manifest",
                "template.canon-extension-intake",
                "policy.signal-decision-proof"
              ]
            },
            "decision": {
              "stage": "candidate",
              "action": "promote-candidate",
              "rationale": "The proposal has evidence from at least two surfaces, so Canon should evaluate it as a shared candidate instead of leaving it project-local.",
              "requiredEvidence": [
                "Source-adjacent implementation path.",
                "At least two surface proofs or client receipts.",
                "Accessibility, evidence, motion, and extension contract notes.",
                "Registry dependencies and modality list."
              ],
              "stopBeforeStable": [
                "Do not mark stable until Canon owns export path, docs, tests, and compatibility notes."
              ]
            }
          }
        ],
        "stopConditions": [
          "Do not mark stable until Canon owns export path, docs, tests, and compatibility notes.",
          "Do not promote project-local overlay primitives into Canon stable without repeated-surface evidence.",
          "Do not fork Canon primitives; keep local copy, policy, tokens, and templates in named overlay artifacts."
        ],
        "summary": "Tend Database Overlay declares the complete Canon overlay artifact set, valid source evidence, and known Canon registry dependencies."
      }
    },
    {
      "manifestPath": "packages/webflow-apps-admin/dashboard/canon-overlay/manifest.ts",
      "manifest": {
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
      },
      "review": {
        "status": "ready",
        "requiredArtifacts": [
          "theme",
          "tokens",
          "templates",
          "copy-rules",
          "surface-policy",
          "registry"
        ],
        "presentArtifacts": [
          "theme",
          "tokens",
          "templates",
          "copy-rules",
          "surface-policy",
          "registry"
        ],
        "missingArtifacts": [],
        "integrityIssues": [],
        "extensionDecisions": [
          {
            "packet": {
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
            },
            "decision": {
              "stage": "candidate",
              "action": "promote-candidate",
              "rationale": "The proposal has evidence from at least two surfaces, so Canon should evaluate it as a shared candidate instead of leaving it project-local.",
              "requiredEvidence": [
                "Source-adjacent implementation path.",
                "At least two surface proofs or client receipts.",
                "Accessibility, evidence, motion, and extension contract notes.",
                "Registry dependencies and modality list."
              ],
              "stopBeforeStable": [
                "Do not mark stable until Canon owns export path, docs, tests, and compatibility notes."
              ]
            }
          }
        ],
        "stopConditions": [
          "Do not mark stable until Canon owns export path, docs, tests, and compatibility notes.",
          "Do not promote project-local overlay primitives into Canon stable without repeated-surface evidence.",
          "Do not fork Canon primitives; keep local copy, policy, tokens, and templates in named overlay artifacts."
        ],
        "summary": "Webflow Apps Admin Audit Overlay declares the complete Canon overlay artifact set, valid source evidence, and known Canon registry dependencies."
      }
    },
    {
      "manifestPath": "packages/webflow-dashboard/canon-overlay/manifest.ts",
      "manifest": {
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
      },
      "review": {
        "status": "ready",
        "requiredArtifacts": [
          "theme",
          "tokens",
          "templates",
          "copy-rules",
          "surface-policy",
          "registry"
        ],
        "presentArtifacts": [
          "theme",
          "tokens",
          "templates",
          "copy-rules",
          "surface-policy",
          "registry"
        ],
        "missingArtifacts": [],
        "integrityIssues": [],
        "extensionDecisions": [
          {
            "packet": {
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
            },
            "decision": {
              "stage": "candidate",
              "action": "promote-candidate",
              "rationale": "The proposal has evidence from at least two surfaces, so Canon should evaluate it as a shared candidate instead of leaving it project-local.",
              "requiredEvidence": [
                "Source-adjacent implementation path.",
                "At least two surface proofs or client receipts.",
                "Accessibility, evidence, motion, and extension contract notes.",
                "Registry dependencies and modality list."
              ],
              "stopBeforeStable": [
                "Do not mark stable until Canon owns export path, docs, tests, and compatibility notes."
              ]
            }
          }
        ],
        "stopConditions": [
          "Do not mark stable until Canon owns export path, docs, tests, and compatibility notes.",
          "Do not promote project-local overlay primitives into Canon stable without repeated-surface evidence.",
          "Do not fork Canon primitives; keep local copy, policy, tokens, and templates in named overlay artifacts."
        ],
        "summary": "Webflow Dashboard Marketplace Overlay declares the complete Canon overlay artifact set, valid source evidence, and known Canon registry dependencies."
      }
    },
    {
      "manifestPath": "packages/webflow-template-validation/canon-overlay/manifest.ts",
      "manifest": {
        "id": "overlay.webflow-template-validation",
        "name": "Webflow Template Validation Overlay",
        "owner": "webflow-validation-team",
        "sourcePackage": "@create-something/webflow-template-validation",
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
          "template-validation",
          "next"
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
            "id": "overlay.webflow-template-validation.surface-brief",
            "title": "Surface Brief Template",
            "summary": "A reusable project-overlay brief for documenting workflow state, Canon reuse, local artifacts, evidence, and extension-intake needs.",
            "requestedKind": "template",
            "requestedModalities": [
              "web",
              "chat",
              "app",
              "voice",
              "glasses"
            ],
            "owner": "webflow-validation-team",
            "sourcePackage": "@create-something/webflow-template-validation",
            "sourcePath": "canon-overlay/templates/surface-brief.md",
            "tags": [
              "overlay",
              "brief",
              "surface",
              "evidence"
            ],
            "surfaces": [
              {
                "surfaceId": "web-webflow-template-validation-brief-1",
                "name": "Web project overlay brief",
                "modality": "web",
                "sourcePath": "canon-overlay/templates/surface-brief.md",
                "proof": "Copyable template names Canon reuse, local overlay artifacts, evidence, and extension intake."
              },
              {
                "surfaceId": "chat-webflow-template-validation-brief-2",
                "name": "Chat project overlay brief",
                "modality": "chat",
                "sourcePath": "canon-overlay/templates/surface-brief.md",
                "proof": "The same structure summarizes cleanly for agent/chat handoff."
              }
            ],
            "dependencies": [
              "template.canon-project-overlay-manifest",
              "template.canon-extension-intake",
              "policy.signal-decision-proof"
            ]
          }
        ]
      },
      "review": {
        "status": "ready",
        "requiredArtifacts": [
          "theme",
          "tokens",
          "templates",
          "copy-rules",
          "surface-policy",
          "registry"
        ],
        "presentArtifacts": [
          "theme",
          "tokens",
          "templates",
          "copy-rules",
          "surface-policy",
          "registry"
        ],
        "missingArtifacts": [],
        "integrityIssues": [],
        "extensionDecisions": [
          {
            "packet": {
              "id": "overlay.webflow-template-validation.surface-brief",
              "title": "Surface Brief Template",
              "summary": "A reusable project-overlay brief for documenting workflow state, Canon reuse, local artifacts, evidence, and extension-intake needs.",
              "requestedKind": "template",
              "requestedModalities": [
                "web",
                "chat",
                "app",
                "voice",
                "glasses"
              ],
              "owner": "webflow-validation-team",
              "sourcePackage": "@create-something/webflow-template-validation",
              "sourcePath": "canon-overlay/templates/surface-brief.md",
              "tags": [
                "overlay",
                "brief",
                "surface",
                "evidence"
              ],
              "surfaces": [
                {
                  "surfaceId": "web-webflow-template-validation-brief-1",
                  "name": "Web project overlay brief",
                  "modality": "web",
                  "sourcePath": "canon-overlay/templates/surface-brief.md",
                  "proof": "Copyable template names Canon reuse, local overlay artifacts, evidence, and extension intake."
                },
                {
                  "surfaceId": "chat-webflow-template-validation-brief-2",
                  "name": "Chat project overlay brief",
                  "modality": "chat",
                  "sourcePath": "canon-overlay/templates/surface-brief.md",
                  "proof": "The same structure summarizes cleanly for agent/chat handoff."
                }
              ],
              "dependencies": [
                "template.canon-project-overlay-manifest",
                "template.canon-extension-intake",
                "policy.signal-decision-proof"
              ]
            },
            "decision": {
              "stage": "candidate",
              "action": "promote-candidate",
              "rationale": "The proposal has evidence from at least two surfaces, so Canon should evaluate it as a shared candidate instead of leaving it project-local.",
              "requiredEvidence": [
                "Source-adjacent implementation path.",
                "At least two surface proofs or client receipts.",
                "Accessibility, evidence, motion, and extension contract notes.",
                "Registry dependencies and modality list."
              ],
              "stopBeforeStable": [
                "Do not mark stable until Canon owns export path, docs, tests, and compatibility notes."
              ]
            }
          }
        ],
        "stopConditions": [
          "Do not mark stable until Canon owns export path, docs, tests, and compatibility notes.",
          "Do not promote project-local overlay primitives into Canon stable without repeated-surface evidence.",
          "Do not fork Canon primitives; keep local copy, policy, tokens, and templates in named overlay artifacts."
        ],
        "summary": "Webflow Template Validation Overlay declares the complete Canon overlay artifact set, valid source evidence, and known Canon registry dependencies."
      }
    }
  ],
  "summary": {
    "total": 29,
    "ready": 29,
    "needsArtifacts": 0,
    "needsEvidence": 0,
    "needsReview": 0,
    "candidateIntakes": 29,
    "projectLocalIntakes": 0
  },
  "agentContract": {
    "purpose": "canon-overlay-intake-inventory",
    "primaryConsumers": [
      "codex",
      "mcp",
      "ltd-docs",
      "project-overlays"
    ],
    "useFor": [
      "finding project/client Canon overlays across repo packages and apps",
      "reviewing overlay artifact completeness before handoff",
      "identifying extension intakes that are project-local versus candidate promotion",
      "keeping multi-project feedback attached to Canon overlay manifests instead of ad hoc docs"
    ],
    "stopBefore": [
      "automatically promoting a project-local overlay into Canon stable",
      "mutating project overlay files during inventory discovery",
      "using a one-surface overlay as evidence for shared Canon primitives",
      "creating a second overlay intake tracker outside Canon and Linear"
    ]
  }
};
