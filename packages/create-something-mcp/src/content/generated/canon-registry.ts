/**
 * Generated Canon registry content — DO NOT EDIT MANUALLY.
 * Run: npm run build:content
 * Source: packages/canon/src/lib/registry/
 */

import type { CanonRegistryManifest } from '../types.js';

export const CANON_REGISTRY_MANIFEST: CanonRegistryManifest = {
  "schemaVersion": 1,
  "id": "canon-registry",
  "sourceOfTruth": "@create-something/canon/registry",
  "description": "Machine-readable Canon foundation for CREATE SOMETHING design system discovery, templates, modality adapters, and project extension governance.",
  "requiredModalities": [
    "web",
    "chat",
    "app",
    "voice",
    "glasses"
  ],
  "extensionLifecycle": [
    {
      "stage": "project-local",
      "description": "Project or client overlay owns the need, evidence, and local implementation without forking Canon primitives."
    },
    {
      "stage": "candidate",
      "description": "Pattern repeats across at least two surfaces or clients and receives a source-adjacent contract plus docs path."
    },
    {
      "stage": "canon-stable",
      "description": "Canon owns the primitive, export path, tests, docs, and compatibility contract for all consumers."
    },
    {
      "stage": "deprecated",
      "description": "Canon keeps discovery metadata and migration guidance while routing new work to the replacement primitive."
    }
  ],
  "agentContract": {
    "purpose": "canon-design-system-discovery",
    "primaryConsumers": [
      "codex",
      "mcp",
      "ltd-docs",
      "project-overlays"
    ],
    "useFor": [
      "choose Canon primitives before inventing local UI",
      "map a requested surface to web, chat, app, voice, or glasses modality constraints",
      "find templates that preserve Signal, Decision, Proof, receipt, and owner structure",
      "decide whether a client/project pattern should stay local or become a Canon candidate"
    ],
    "stopBefore": [
      "copying third-party brand identity into Canon",
      "creating a local component when an equivalent stable primitive exists",
      "moving reasoning or trust boundaries onto thin display devices",
      "promoting a project-local overlay without evidence from multiple surfaces or clients"
    ]
  },
  "items": [
    {
      "id": "token.canon-core",
      "name": "Canon Core Tokens",
      "kind": "token",
      "maturity": "stable",
      "description": "Shared color, typography, spacing, radius, motion, surface, and proof-state values used by Canon consumers.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/styles/tokens.css",
      "importPath": "@create-something/canon/styles/tokens.css",
      "docsPath": "/canon/resources/tokens",
      "tags": [
        "tokens",
        "css",
        "foundation",
        "theme"
      ],
      "modalities": [
        "web",
        "app",
        "chat",
        "voice",
        "glasses"
      ],
      "contract": {
        "accessibility": "Tokens must preserve readable contrast and must not make state color-only.",
        "extension": "Project overlays may add aliases, but canonical values remain owned by Canon."
      }
    },
    {
      "id": "component.button",
      "name": "Button",
      "kind": "component",
      "maturity": "stable",
      "description": "Action control for primary, secondary, and ghost interactions.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/components/Button.svelte",
      "importPath": "@create-something/canon",
      "docsPath": "/canon/components/button",
      "tags": [
        "action",
        "control",
        "web"
      ],
      "modalities": [
        "web",
        "app"
      ],
      "dependencies": [
        "token.canon-core"
      ],
      "contract": {
        "accessibility": "Actions need explicit labels, disabled state, and visible focus treatment.",
        "extension": "Use variants before adding local button styles."
      }
    },
    {
      "id": "component.card",
      "name": "Card",
      "kind": "component",
      "maturity": "stable",
      "description": "Container for grouping related content with controlled emphasis.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/components/Card.svelte",
      "importPath": "@create-something/canon",
      "docsPath": "/canon/components/card",
      "tags": [
        "container",
        "surface",
        "web"
      ],
      "modalities": [
        "web",
        "app"
      ],
      "dependencies": [
        "token.canon-core"
      ],
      "contract": {
        "accessibility": "Cards must not hide structure from headings, landmarks, or link text.",
        "extension": "Use cards for bounded repeated items, not nested page-section decoration."
      }
    },
    {
      "id": "component.navigation",
      "name": "Navigation",
      "kind": "component",
      "maturity": "stable",
      "description": "Primary wayfinding with property-aware navigation and clear visual style support.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/components/Navigation.svelte",
      "importPath": "@create-something/canon",
      "docsPath": "/canon/components/navigation",
      "tags": [
        "navigation",
        "wayfinding",
        "property"
      ],
      "modalities": [
        "web",
        "app"
      ],
      "dependencies": [
        "token.canon-core"
      ],
      "contract": {
        "accessibility": "Navigation must expose clear labels, current state, and mobile-safe targets.",
        "extension": "Property packages configure links and policy; Canon owns the primitive."
      }
    },
    {
      "id": "component.clear-decision-panel",
      "name": "ClearDecisionPanel",
      "kind": "component",
      "maturity": "stable",
      "description": "Clear communication surface for allow, review, block, and neutral decision states with evidence and receipts.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/components/clear/ClearDecisionPanel.svelte",
      "importPath": "@create-something/canon",
      "docsPath": "/canon/components/clear",
      "tags": [
        "clear",
        "decision",
        "run-wait-stop",
        "evidence",
        "receipt"
      ],
      "modalities": [
        "web",
        "app",
        "chat",
        "voice",
        "glasses"
      ],
      "dependencies": [
        "token.canon-core",
        "policy.signal-decision-proof"
      ],
      "contract": {
        "accessibility": "Decision state must be present in text and structure, not only color or animation.",
        "evidence": "Every decision item should name evidence, receipt, owner, or next action.",
        "motion": "Motion is limited to state, selection, progression, or handoff.",
        "extension": "Use this before inventing local decision cards, approval panels, or status shells."
      }
    },
    {
      "id": "component.clear-proof-strip",
      "name": "ClearProofStrip",
      "kind": "component",
      "maturity": "stable",
      "description": "Compact proof objects for claims, validation gates, receipts, and trust evidence.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/components/clear/ClearProofStrip.svelte",
      "importPath": "@create-something/canon",
      "docsPath": "/canon/components/clear",
      "tags": [
        "clear",
        "proof",
        "evidence",
        "receipt"
      ],
      "modalities": [
        "web",
        "app",
        "chat"
      ],
      "dependencies": [
        "token.canon-core",
        "policy.signal-decision-proof"
      ],
      "contract": {
        "evidence": "Proof items must connect claims to concrete artifacts, checks, or receipts.",
        "extension": "Prefer this when multiple proof objects need to be scanned together."
      }
    },
    {
      "id": "adapter.atlas-graph-artifact",
      "name": "Atlas Graph Artifact",
      "kind": "adapter",
      "maturity": "stable",
      "description": "Renderer-independent workflow graph contract for human-readable and agent-readable maps.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/atlas/headless.ts",
      "importPath": "@create-something/canon/atlas/headless",
      "docsPath": "/canon/components/clear",
      "tags": [
        "atlas",
        "graph",
        "workflow-map",
        "agent-contract"
      ],
      "modalities": [
        "web",
        "app",
        "chat",
        "voice",
        "glasses"
      ],
      "dependencies": [
        "policy.signal-decision-proof"
      ],
      "contract": {
        "evidence": "Graph nodes must preserve owner, status, products, and source-of-truth role.",
        "extension": "Renderers may change by modality, but the graph/story artifact shape stays Canon-owned."
      }
    },
    {
      "id": "policy.signal-decision-proof",
      "name": "Signal Decision Proof Contract",
      "kind": "policy",
      "maturity": "stable",
      "description": "Governance product loop: Atlas maps, Signal captures, Decision routes, Proof records back to Atlas.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/governance/products.ts",
      "importPath": "@create-something/canon/governance",
      "docsPath": "/canon/components/clear",
      "tags": [
        "atlas",
        "signal",
        "decision",
        "proof",
        "governance"
      ],
      "modalities": [
        "web",
        "chat",
        "app",
        "voice",
        "glasses"
      ],
      "contract": {
        "evidence": "Production surfaces must preserve the loop: Atlas -> Signal -> Decision -> Proof -> Atlas.",
        "extension": "New products attach to this loop instead of inventing parallel IDs."
      }
    },
    {
      "id": "template.web-governed-workflow",
      "name": "Web Governed Workflow Template",
      "kind": "template",
      "maturity": "candidate",
      "description": "Default web/app composition for a mapped workflow: hero claim, Atlas map, decision panel, proof strip, and action footer.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/registry/data.ts",
      "docsPath": "/canon/components/clear",
      "tags": [
        "template",
        "web",
        "workflow",
        "governance"
      ],
      "modalities": [
        "web",
        "app"
      ],
      "dependencies": [
        "component.navigation",
        "component.clear-decision-panel",
        "component.clear-proof-strip",
        "adapter.atlas-graph-artifact"
      ],
      "contract": {
        "accessibility": "Template must keep headings, landmarks, and next action readable.",
        "evidence": "A claim is incomplete until the adjacent proof object is visible.",
        "extension": "Client overlays provide copy, starter maps, integrations, and receipts."
      }
    },
    {
      "id": "template.chat-decision-brief",
      "name": "Chat Decision Brief Template",
      "kind": "template",
      "maturity": "candidate",
      "description": "Compact chat response structure for decision state, evidence, owner, next action, and stop condition.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/registry/data.ts",
      "tags": [
        "template",
        "chat",
        "decision",
        "brief"
      ],
      "modalities": [
        "chat",
        "voice"
      ],
      "dependencies": [
        "policy.signal-decision-proof"
      ],
      "contract": {
        "evidence": "Chat briefs must cite or name proof, not only summarize confidence.",
        "extension": "Project prompts may adapt language but must preserve state/evidence/owner/action."
      }
    },
    {
      "id": "template.glasses-routing-hud",
      "name": "Glasses Routing HUD Template",
      "kind": "template",
      "maturity": "candidate",
      "description": "Thin heads-up display structure for ranked work, brief detail access, confirmation, and handoff.",
      "ownerPackage": "@create-something/canon",
      "sourcePath": "packages/canon/src/lib/registry/data.ts",
      "tags": [
        "template",
        "glasses",
        "hud",
        "routing"
      ],
      "modalities": [
        "glasses"
      ],
      "dependencies": [
        "policy.signal-decision-proof"
      ],
      "contract": {
        "accessibility": "Main view must stay one-glance and reserve details for explicit selection.",
        "evidence": "Evidence may be available on detail press but must not clutter the home view.",
        "extension": "Reasoning, ranking, secrets, and trust decisions stay on the Worker/server side; glasses display routed state."
      }
    }
  ]
};
