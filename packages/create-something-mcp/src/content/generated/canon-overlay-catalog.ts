/**
 * Generated Canon overlay catalog content — DO NOT EDIT MANUALLY.
 * Run: npm run build:content
 * Source: packages/canon/src/lib/overlays/
 */

import type { CanonOverlayCatalog } from '../types.js';

export const CANON_OVERLAY_CATALOG: CanonOverlayCatalog = {
  "schemaVersion": 1,
  "id": "canon-overlay-catalog",
  "sourceOfTruth": "@create-something/canon/overlays",
  "description": "Machine-readable Canon overlay contract for extending Canon across web, chat, app, voice, and glasses without forking primitives.",
  "requiredArtifacts": [
    "theme",
    "tokens",
    "templates",
    "copy-rules",
    "surface-policy",
    "registry"
  ],
  "overlayRules": [
    "Extend Canon through named overlay artifacts, not primitive forks.",
    "Keep theme aliases, token aliases, templates, copy rules, surface policy, and registry metadata together.",
    "Route primitive, template, adapter, token, or policy promotion through Canon extension intake.",
    "Keep one-surface needs project-local until repeated-surface evidence supports candidate promotion.",
    "Do not mark an overlay-driven primitive stable until Canon owns export path, docs, tests, compatibility, and registry routing."
  ],
  "modalityContracts": [
    {
      "modality": "web",
      "useFor": "Routed pages, marketing surfaces, dashboards, and public workflow proofs.",
      "overlayOwns": [
        "local copy",
        "surface-specific templates",
        "integration receipts"
      ],
      "canonOwns": [
        "tokens",
        "layout primitives",
        "accessibility contract",
        "registry routing"
      ]
    },
    {
      "modality": "chat",
      "useFor": "Agent handoffs, review summaries, intake flows, and compact decision/proof exchanges.",
      "overlayOwns": [
        "conversation copy",
        "tool receipts",
        "handoff templates"
      ],
      "canonOwns": [
        "decision/proof semantics",
        "extension intake routing",
        "artifact metadata"
      ]
    },
    {
      "modality": "app",
      "useFor": "Authenticated product flows, operational consoles, and repeated task surfaces.",
      "overlayOwns": [
        "workflow policy",
        "app-specific states",
        "domain data bindings"
      ],
      "canonOwns": [
        "components",
        "state display patterns",
        "token and motion boundaries"
      ]
    },
    {
      "modality": "voice",
      "useFor": "Spoken status, escalation, confirmation, and operator briefing flows.",
      "overlayOwns": [
        "spoken terminology",
        "confirmation phrases",
        "escalation scripts"
      ],
      "canonOwns": [
        "decision/proof structure",
        "state hierarchy",
        "artifact references"
      ]
    },
    {
      "modality": "glasses",
      "useFor": "Thin, glanceable workflow overlays with state, owner, receipt, and next action.",
      "overlayOwns": [
        "context labels",
        "local task sequence",
        "device-specific display policy"
      ],
      "canonOwns": [
        "compact proof/state pattern",
        "minimum readable metadata",
        "routing template"
      ]
    }
  ],
  "templates": [
    {
      "id": "overlay.project-template",
      "name": "Canon Project Overlay Template",
      "summary": "Copyable starter pack for project and client overlays with the complete artifact set, extension intake, and reviewable manifest.",
      "docsPath": "/canon/resources/overlays",
      "registryItemIds": [
        "template.canon-project-overlay-template-pack",
        "template.canon-project-overlay-manifest",
        "template.canon-extension-intake"
      ],
      "outputFiles": [
        "theme.css",
        "tokens.json",
        "templates/README.md",
        "templates/surface-brief.md",
        "copy-rules.md",
        "surface-policy.md",
        "registry.json",
        "manifest.ts"
      ],
      "manifest": {
        "id": "overlay.project-template",
        "name": "Canon Project Overlay Template",
        "owner": "project-owner",
        "sourcePackage": "@create-something/example-project",
        "sourcePath": "packages/canon/src/lib/overlays/project-template/manifest.ts",
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
          "template",
          "project",
          "client",
          "governance"
        ],
        "artifacts": [
          {
            "kind": "theme",
            "path": "packages/canon/src/lib/overlays/project-template/theme.css",
            "description": "Project-local CSS aliases that point back to Canon tokens.",
            "registryItemIds": [
              "token.canon-core"
            ]
          },
          {
            "kind": "tokens",
            "path": "packages/canon/src/lib/overlays/project-template/tokens.json",
            "description": "Design-token aliases for project-specific names without a new token scale.",
            "registryItemIds": [
              "token.canon-core"
            ]
          },
          {
            "kind": "templates",
            "path": "packages/canon/src/lib/overlays/project-template/templates",
            "description": "Copyable briefs for surface-specific workflow overlays.",
            "registryItemIds": [
              "template.canon-project-overlay-manifest",
              "template.canon-extension-intake"
            ]
          },
          {
            "kind": "copy-rules",
            "path": "packages/canon/src/lib/overlays/project-template/copy-rules.md",
            "description": "Project voice and terminology rules that keep Canon primitives stable.",
            "registryItemIds": [
              "policy.signal-decision-proof"
            ]
          },
          {
            "kind": "surface-policy",
            "path": "packages/canon/src/lib/overlays/project-template/surface-policy.md",
            "description": "Modality policy for web, chat, app, voice, and glasses overlays.",
            "registryItemIds": [
              "policy.signal-decision-proof"
            ]
          },
          {
            "kind": "registry",
            "path": "packages/canon/src/lib/overlays/project-template/registry.json",
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
            "id": "overlay.project-template.surface-brief",
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
            "owner": "project-owner",
            "sourcePackage": "@create-something/example-project",
            "sourcePath": "packages/canon/src/lib/overlays/project-template/templates/surface-brief.md",
            "tags": [
              "overlay",
              "brief",
              "surface",
              "evidence"
            ],
            "surfaces": [
              {
                "surfaceId": "web-project-overlay-brief",
                "name": "Web project overlay brief",
                "modality": "web",
                "sourcePath": "packages/canon/src/lib/overlays/project-template/templates/surface-brief.md",
                "proof": "Copyable template names Canon reuse, local overlay artifacts, evidence, and extension intake."
              },
              {
                "surfaceId": "chat-project-overlay-brief",
                "name": "Chat project overlay brief",
                "modality": "chat",
                "sourcePath": "packages/canon/src/lib/overlays/project-template/templates/surface-brief.md",
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
              "id": "overlay.project-template.surface-brief",
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
              "owner": "project-owner",
              "sourcePackage": "@create-something/example-project",
              "sourcePath": "packages/canon/src/lib/overlays/project-template/templates/surface-brief.md",
              "tags": [
                "overlay",
                "brief",
                "surface",
                "evidence"
              ],
              "surfaces": [
                {
                  "surfaceId": "web-project-overlay-brief",
                  "name": "Web project overlay brief",
                  "modality": "web",
                  "sourcePath": "packages/canon/src/lib/overlays/project-template/templates/surface-brief.md",
                  "proof": "Copyable template names Canon reuse, local overlay artifacts, evidence, and extension intake."
                },
                {
                  "surfaceId": "chat-project-overlay-brief",
                  "name": "Chat project overlay brief",
                  "modality": "chat",
                  "sourcePath": "packages/canon/src/lib/overlays/project-template/templates/surface-brief.md",
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
        "summary": "Canon Project Overlay Template declares the complete Canon overlay artifact set, valid source evidence, and known Canon registry dependencies."
      }
    }
  ],
  "agentContract": {
    "purpose": "canon-overlay-extension-discovery",
    "primaryConsumers": [
      "codex",
      "mcp",
      "ltd-docs",
      "project-overlays"
    ],
    "useFor": [
      "discovering the required overlay artifact set before starting a client or project UI surface",
      "choosing what stays project-local versus what routes through Canon extension intake",
      "checking modality responsibilities for web, chat, app, voice, and glasses",
      "finding the copyable project-overlay template and its registry dependencies"
    ],
    "stopBefore": [
      "forking a Canon primitive for local copy or policy needs",
      "promoting a one-surface overlay as Canon stable",
      "shipping an overlay without theme, tokens, templates, copy rules, surface policy, and registry metadata",
      "creating a second overlay documentation system outside Canon source data"
    ]
  }
};
