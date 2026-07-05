/**
 * Generated Canon overlay candidate promotion approval record content — DO NOT EDIT MANUALLY.
 * Run: npm run build:content
 * Source: packages/canon/src/lib/overlays/intake.ts
 */

import type { CanonOverlayCandidatePromotionApprovalRecordCollection } from '../types.js';

export const CANON_OVERLAY_CANDIDATE_PROMOTION_APPROVAL_RECORDS: CanonOverlayCandidatePromotionApprovalRecordCollection = {
  "schemaVersion": 1,
  "id": "canon-overlay-candidate-promotion-approval-records",
  "sourceOfTruth": "@create-something/canon/overlays/intake",
  "description": "Read-only approval-record templates for Canon overlay candidate promotion readiness reports, making maintainer approval, target selection, and implementation ownership explicit before code changes.",
  "entries": [
    {
      "id": "canon-overlay-candidate-promotion-approval-record:overlay.agency-atlas-public.workflow-proof-surface",
      "readinessReportId": "canon-overlay-candidate-promotion-readiness:overlay.agency-atlas-public.workflow-proof-surface",
      "planId": "canon-overlay-candidate-promotion-plan:overlay.agency-atlas-public.workflow-proof-surface",
      "candidateId": "overlay.agency-atlas-public:overlay.agency-atlas-public.workflow-proof-surface",
      "intakeId": "overlay.agency-atlas-public.workflow-proof-surface",
      "title": "Agency public Atlas workflow proof surface approval record",
      "summary": "A candidate Canon pattern for turning a public web route, chat-assisted canvas, and booking handoff into one reusable workflow-proof surface without forking Atlas primitives. This readiness report compares the plan with current Canon registry and public export policy snapshots before implementation starts. Fill this record before implementation starts; every target remains unset until a maintainer records an explicit choice.",
      "state": "approval-required",
      "approvalUri": "canon://overlays/candidates/overlay.agency-atlas-public.workflow-proof-surface/approval-record",
      "readinessUri": "canon://overlays/candidates/overlay.agency-atlas-public.workflow-proof-surface/readiness",
      "planUri": "canon://overlays/candidates/overlay.agency-atlas-public.workflow-proof-surface/promotion-plan",
      "handoffUri": "canon://overlays/candidates/overlay.agency-atlas-public.workflow-proof-surface/handoff",
      "candidateUri": "canon://overlays/candidates/overlay.agency-atlas-public.workflow-proof-surface",
      "reviewUri": "canon://overlays/intake/overlay.agency-atlas-public",
      "target": {
        "approvalOwner": null,
        "approvalEvidence": null,
        "approvedAt": null,
        "registryAction": null,
        "registryItemId": null,
        "exportPath": null,
        "exportName": null,
        "docsPath": null,
        "maturityTarget": null,
        "implementationOwner": null
      },
      "requiredFields": [
        {
          "id": "approvalOwner",
          "label": "Approval Owner",
          "required": true,
          "value": null,
          "hints": [
            "Name the maintainer, role, or decision authority who approved implementation."
          ],
          "instructions": "Record the human owner responsible for the approval decision."
        },
        {
          "id": "approvalEvidence",
          "label": "Approval Evidence",
          "required": true,
          "value": null,
          "hints": [
            "Use a stable PR comment, Linear comment, meeting note, or decision artifact reference."
          ],
          "instructions": "Record where the approval decision can be audited."
        },
        {
          "id": "approvedAt",
          "label": "Approved At",
          "required": true,
          "value": null,
          "hints": [
            "Use an ISO 8601 timestamp or exact calendar date."
          ],
          "instructions": "Record when the approval decision happened."
        },
        {
          "id": "registryAction",
          "label": "Registry Action",
          "required": true,
          "value": null,
          "hints": [
            "Allowed values: reuse-existing, update-existing, create-new."
          ],
          "instructions": "Choose how implementation should treat the Canon registry target."
        },
        {
          "id": "registryItemId",
          "label": "Registry Item Id",
          "required": true,
          "value": null,
          "hints": [
            "template.atlas-development-handoff: Atlas Development Handoff Template",
            "template.canon-project-overlay-manifest: Canon Project Overlay Manifest",
            "template.canon-project-overlay-template-pack: Canon Project Overlay Template Pack",
            "component.atlas-atlas-story-canvas: AtlasStoryCanvas",
            "template.canon-extension-intake: Canon Extension Intake Template"
          ],
          "instructions": "Record the selected Canon registry item id or the new id to create."
        },
        {
          "id": "exportPath",
          "label": "Export Path",
          "required": true,
          "value": null,
          "hints": [
            "./atlas: candidate-review / stable-foundation-candidate",
            "./overlays/intake: registry-covered / registry-artifact",
            "./atlas/handoff: registry-covered / headless-contract",
            "./components#TriadHealth: candidate-review / domain-specific",
            "./components#CrossPropertyLink: candidate-review / platform-surface"
          ],
          "instructions": "Record the package export path that implementation should add or update."
        },
        {
          "id": "exportName",
          "label": "Export Name",
          "required": false,
          "value": null,
          "hints": [
            "./atlas: candidate-review / stable-foundation-candidate",
            "./overlays/intake: registry-covered / registry-artifact",
            "./atlas/handoff: registry-covered / headless-contract",
            "./components#TriadHealth: candidate-review / domain-specific",
            "./components#CrossPropertyLink: candidate-review / platform-surface"
          ],
          "instructions": "Record the named export when the target is a symbol-level export."
        },
        {
          "id": "docsPath",
          "label": "Docs Path",
          "required": true,
          "value": null,
          "hints": [
            "/canon/components/atlas",
            "/canon/resources/registry"
          ],
          "instructions": "Record the Canon docs path that implementation must update."
        },
        {
          "id": "maturityTarget",
          "label": "Maturity Target",
          "required": true,
          "value": null,
          "hints": [
            "Allowed values: experimental, candidate, stable. Stable requires export, docs, tests, compatibility, and registry routing."
          ],
          "instructions": "Record the intended Canon maturity after implementation."
        },
        {
          "id": "implementationOwner",
          "label": "Implementation Owner",
          "required": true,
          "value": null,
          "hints": [
            "Name the maintainer or agent lane responsible for the implementation slice."
          ],
          "instructions": "Record who owns the follow-up implementation work."
        }
      ],
      "targetHints": {
        "registryItems": [
          {
            "id": "template.atlas-development-handoff",
            "name": "Atlas Development Handoff Template",
            "kind": "template",
            "maturity": "candidate",
            "modalities": [
              "web",
              "chat",
              "app",
              "voice",
              "glasses"
            ],
            "docsPath": "/canon/resources/registry",
            "score": 30,
            "reason": "Matches requested kind and overlaps 3 requested modalities."
          },
          {
            "id": "template.canon-project-overlay-manifest",
            "name": "Canon Project Overlay Manifest",
            "kind": "template",
            "maturity": "candidate",
            "modalities": [
              "web",
              "chat",
              "app",
              "voice",
              "glasses"
            ],
            "docsPath": "/canon/resources/registry",
            "score": 24,
            "reason": "Matches requested kind and overlaps 3 requested modalities."
          },
          {
            "id": "template.canon-project-overlay-template-pack",
            "name": "Canon Project Overlay Template Pack",
            "kind": "template",
            "maturity": "candidate",
            "modalities": [
              "web",
              "chat",
              "app",
              "voice",
              "glasses"
            ],
            "docsPath": "/canon/resources/registry",
            "score": 22,
            "reason": "Matches requested kind and overlaps 3 requested modalities."
          },
          {
            "id": "component.atlas-atlas-story-canvas",
            "name": "AtlasStoryCanvas",
            "kind": "component",
            "maturity": "candidate",
            "modalities": [
              "web",
              "app",
              "chat",
              "voice",
              "glasses"
            ],
            "docsPath": "/canon/components/atlas",
            "score": 21,
            "reason": "Overlaps 3 requested modalities."
          },
          {
            "id": "template.canon-extension-intake",
            "name": "Canon Extension Intake Template",
            "kind": "template",
            "maturity": "candidate",
            "modalities": [
              "web",
              "chat",
              "app",
              "voice",
              "glasses"
            ],
            "docsPath": "/canon/resources/registry",
            "score": 21,
            "reason": "Matches requested kind and overlaps 3 requested modalities."
          }
        ],
        "exportPolicies": [
          {
            "exportPath": "./atlas",
            "classification": "stable-foundation-candidate",
            "registryPolicy": "candidate-review",
            "score": 9,
            "rationale": "Atlas renderers should align with the existing headless graph adapter before promotion."
          },
          {
            "exportPath": "./overlays/intake",
            "classification": "registry-artifact",
            "registryPolicy": "registry-covered",
            "score": 8,
            "rationale": "Overlay intake inventory scans project overlay manifests and routes extension-intake evidence without promoting primitives automatically.",
            "registryItemIds": [
              "template.canon-extension-intake"
            ]
          },
          {
            "exportPath": "./atlas/handoff",
            "classification": "headless-contract",
            "registryPolicy": "registry-covered",
            "score": 7,
            "rationale": "Atlas handoff API is covered by template.atlas-development-handoff.",
            "registryItemIds": [
              "template.atlas-development-handoff"
            ]
          },
          {
            "exportPath": "./components",
            "classification": "domain-specific",
            "registryPolicy": "candidate-review",
            "score": 7,
            "rationale": "CREATE SOMETHING framework display; needs governance-pattern contract before promotion.",
            "exportName": "TriadHealth"
          },
          {
            "exportPath": "./components",
            "classification": "platform-surface",
            "registryPolicy": "candidate-review",
            "score": 7,
            "rationale": "Property-routing primitive candidate tied to CREATE SOMETHING property topology.",
            "exportName": "CrossPropertyLink"
          }
        ],
        "docsPaths": [
          "/canon/components/atlas",
          "/canon/resources/registry"
        ]
      },
      "checklist": [
        "Record the human maintainer or role approving implementation.",
        "Record the approval evidence location, such as PR comment, Linear comment, meeting note, or signed decision.",
        "Select registry action and registry item id before editing Canon source.",
        "Select export path and docs path before implementation starts.",
        "Select maturity target and implementation owner before opening implementation work.",
        "Carry validation and compatibility requirements from the readiness report into the implementation PR."
      ],
      "stopConditions": [
        "Do not mark stable until Canon owns export path, docs, tests, and compatibility notes.",
        "Stop if human approval is missing or ambiguous.",
        "Stop if source paths, surface proofs, or required evidence are stale.",
        "Stop if implementation would create a fork instead of a Canon-owned export and registry item.",
        "Stop before creating Linear work automatically from this plan.",
        "Stop if readiness output is used as approval instead of evidence for a maintainer decision.",
        "Stop if no Canon registry id, export path, docs path, and validation scope have been selected.",
        "Stop if any required approval-record field is still UNSET.",
        "Stop if target fields were copied from hints without maintainer review.",
        "Stop before using this record as permission to mutate Canon or project overlays."
      ],
      "approvalBoundary": [
        "This approval record is a read-only template and does not itself approve implementation.",
        "Only a maintainer-filled record with explicit owner, evidence, target, docs, maturity, and implementation owner fields can support opening implementation work.",
        "The record does not create Linear issues, mutate Canon, mutate project overlays, or mark candidates stable."
      ],
      "agentContract": {
        "purpose": "canon-overlay-candidate-promotion-approval-record",
        "primaryConsumers": [
          "codex",
          "mcp",
          "ltd-docs",
          "project-overlays"
        ],
        "useFor": [
          "recording the exact human approval and target choices required before implementation",
          "keeping readiness hints separate from maintainer-selected targets",
          "handing an approved candidate into a bounded implementation slice"
        ],
        "stopBefore": [
          "automatically filling required approval fields",
          "automatically creating Linear work",
          "automatically editing Canon source, registry, exports, docs, or project overlays",
          "treating an unfilled approval record as approval or stable promotion"
        ]
      }
    },
    {
      "id": "canon-overlay-candidate-promotion-approval-record:overlay.lms-workflow-learning.lesson-proof-surface",
      "readinessReportId": "canon-overlay-candidate-promotion-readiness:overlay.lms-workflow-learning.lesson-proof-surface",
      "planId": "canon-overlay-candidate-promotion-plan:overlay.lms-workflow-learning.lesson-proof-surface",
      "candidateId": "overlay.lms-workflow-learning:overlay.lms-workflow-learning.lesson-proof-surface",
      "intakeId": "overlay.lms-workflow-learning.lesson-proof-surface",
      "title": "Workflow learning proof surface approval record",
      "summary": "A candidate Canon learning template for teaching workflow proof across lesson content, path navigation, progress receipts, and event telemetry without promoting one course's copy into Canon stable. This readiness report compares the plan with current Canon registry and public export policy snapshots before implementation starts. Fill this record before implementation starts; every target remains unset until a maintainer records an explicit choice.",
      "state": "approval-required",
      "approvalUri": "canon://overlays/candidates/overlay.lms-workflow-learning.lesson-proof-surface/approval-record",
      "readinessUri": "canon://overlays/candidates/overlay.lms-workflow-learning.lesson-proof-surface/readiness",
      "planUri": "canon://overlays/candidates/overlay.lms-workflow-learning.lesson-proof-surface/promotion-plan",
      "handoffUri": "canon://overlays/candidates/overlay.lms-workflow-learning.lesson-proof-surface/handoff",
      "candidateUri": "canon://overlays/candidates/overlay.lms-workflow-learning.lesson-proof-surface",
      "reviewUri": "canon://overlays/intake/overlay.lms-workflow-learning",
      "target": {
        "approvalOwner": null,
        "approvalEvidence": null,
        "approvedAt": null,
        "registryAction": null,
        "registryItemId": null,
        "exportPath": null,
        "exportName": null,
        "docsPath": null,
        "maturityTarget": null,
        "implementationOwner": null
      },
      "requiredFields": [
        {
          "id": "approvalOwner",
          "label": "Approval Owner",
          "required": true,
          "value": null,
          "hints": [
            "Name the maintainer, role, or decision authority who approved implementation."
          ],
          "instructions": "Record the human owner responsible for the approval decision."
        },
        {
          "id": "approvalEvidence",
          "label": "Approval Evidence",
          "required": true,
          "value": null,
          "hints": [
            "Use a stable PR comment, Linear comment, meeting note, or decision artifact reference."
          ],
          "instructions": "Record where the approval decision can be audited."
        },
        {
          "id": "approvedAt",
          "label": "Approved At",
          "required": true,
          "value": null,
          "hints": [
            "Use an ISO 8601 timestamp or exact calendar date."
          ],
          "instructions": "Record when the approval decision happened."
        },
        {
          "id": "registryAction",
          "label": "Registry Action",
          "required": true,
          "value": null,
          "hints": [
            "Allowed values: reuse-existing, update-existing, create-new."
          ],
          "instructions": "Choose how implementation should treat the Canon registry target."
        },
        {
          "id": "registryItemId",
          "label": "Registry Item Id",
          "required": true,
          "value": null,
          "hints": [
            "template.atlas-development-handoff: Atlas Development Handoff Template",
            "template.web-governed-workflow: Web Governed Workflow Template",
            "template.canon-project-overlay-template-pack: Canon Project Overlay Template Pack",
            "template.canon-extension-intake: Canon Extension Intake Template",
            "template.canon-project-overlay-manifest: Canon Project Overlay Manifest"
          ],
          "instructions": "Record the selected Canon registry item id or the new id to create."
        },
        {
          "id": "exportPath",
          "label": "Export Path",
          "required": true,
          "value": null,
          "hints": [
            "./insights: candidate-review / content-utility",
            "./interactive#IntegrationFlow: candidate-review / composition-pattern",
            "./overlays/intake: registry-covered / registry-artifact",
            "./components#PapersGrid: candidate-review / content-utility",
            "./brand: candidate-review / brand-surface"
          ],
          "instructions": "Record the package export path that implementation should add or update."
        },
        {
          "id": "exportName",
          "label": "Export Name",
          "required": false,
          "value": null,
          "hints": [
            "./insights: candidate-review / content-utility",
            "./interactive#IntegrationFlow: candidate-review / composition-pattern",
            "./overlays/intake: registry-covered / registry-artifact",
            "./components#PapersGrid: candidate-review / content-utility",
            "./brand: candidate-review / brand-surface"
          ],
          "instructions": "Record the named export when the target is a symbol-level export."
        },
        {
          "id": "docsPath",
          "label": "Docs Path",
          "required": true,
          "value": null,
          "hints": [
            "/canon/components/clear",
            "/canon/resources/registry"
          ],
          "instructions": "Record the Canon docs path that implementation must update."
        },
        {
          "id": "maturityTarget",
          "label": "Maturity Target",
          "required": true,
          "value": null,
          "hints": [
            "Allowed values: experimental, candidate, stable. Stable requires export, docs, tests, compatibility, and registry routing."
          ],
          "instructions": "Record the intended Canon maturity after implementation."
        },
        {
          "id": "implementationOwner",
          "label": "Implementation Owner",
          "required": true,
          "value": null,
          "hints": [
            "Name the maintainer or agent lane responsible for the implementation slice."
          ],
          "instructions": "Record who owns the follow-up implementation work."
        }
      ],
      "targetHints": {
        "registryItems": [
          {
            "id": "template.atlas-development-handoff",
            "name": "Atlas Development Handoff Template",
            "kind": "template",
            "maturity": "candidate",
            "modalities": [
              "web",
              "chat",
              "app",
              "voice",
              "glasses"
            ],
            "docsPath": "/canon/resources/registry",
            "score": 28,
            "reason": "Matches requested kind and overlaps 3 requested modalities."
          },
          {
            "id": "template.web-governed-workflow",
            "name": "Web Governed Workflow Template",
            "kind": "template",
            "maturity": "candidate",
            "modalities": [
              "web",
              "app"
            ],
            "docsPath": "/canon/components/clear",
            "score": 24,
            "reason": "Matches requested kind and overlaps 2 requested modalities."
          },
          {
            "id": "template.canon-project-overlay-template-pack",
            "name": "Canon Project Overlay Template Pack",
            "kind": "template",
            "maturity": "candidate",
            "modalities": [
              "web",
              "chat",
              "app",
              "voice",
              "glasses"
            ],
            "docsPath": "/canon/resources/registry",
            "score": 23,
            "reason": "Matches requested kind and overlaps 3 requested modalities."
          },
          {
            "id": "template.canon-extension-intake",
            "name": "Canon Extension Intake Template",
            "kind": "template",
            "maturity": "candidate",
            "modalities": [
              "web",
              "chat",
              "app",
              "voice",
              "glasses"
            ],
            "docsPath": "/canon/resources/registry",
            "score": 22,
            "reason": "Matches requested kind and overlaps 3 requested modalities."
          },
          {
            "id": "template.canon-project-overlay-manifest",
            "name": "Canon Project Overlay Manifest",
            "kind": "template",
            "maturity": "candidate",
            "modalities": [
              "web",
              "chat",
              "app",
              "voice",
              "glasses"
            ],
            "docsPath": "/canon/resources/registry",
            "score": 22,
            "reason": "Matches requested kind and overlaps 3 requested modalities."
          }
        ],
        "exportPolicies": [
          {
            "exportPath": "./insights",
            "classification": "content-utility",
            "registryPolicy": "candidate-review",
            "score": 8,
            "rationale": "Insight visuals need content and proof contracts before registry promotion."
          },
          {
            "exportPath": "./interactive",
            "classification": "composition-pattern",
            "registryPolicy": "candidate-review",
            "score": 8,
            "rationale": "IntegrationFlow can become a shared workflow/integration disclosure pattern after data and nonvisual contracts settle.",
            "exportName": "IntegrationFlow"
          },
          {
            "exportPath": "./overlays/intake",
            "classification": "registry-artifact",
            "registryPolicy": "registry-covered",
            "score": 8,
            "rationale": "Overlay intake inventory scans project overlay manifests and routes extension-intake evidence without promoting primitives automatically.",
            "registryItemIds": [
              "template.canon-extension-intake"
            ]
          },
          {
            "exportPath": "./components",
            "classification": "content-utility",
            "registryPolicy": "candidate-review",
            "score": 7,
            "rationale": "Research content collection layout, not yet a general Canon grid contract.",
            "exportName": "PapersGrid"
          },
          {
            "exportPath": "./brand",
            "classification": "brand-surface",
            "registryPolicy": "candidate-review",
            "score": 6,
            "rationale": "Brand support exports need brand-contract review before any stable registry promotion."
          }
        ],
        "docsPaths": [
          "/canon/components/clear",
          "/canon/resources/registry"
        ]
      },
      "checklist": [
        "Record the human maintainer or role approving implementation.",
        "Record the approval evidence location, such as PR comment, Linear comment, meeting note, or signed decision.",
        "Select registry action and registry item id before editing Canon source.",
        "Select export path and docs path before implementation starts.",
        "Select maturity target and implementation owner before opening implementation work.",
        "Carry validation and compatibility requirements from the readiness report into the implementation PR."
      ],
      "stopConditions": [
        "Do not mark stable until Canon owns export path, docs, tests, and compatibility notes.",
        "Stop if human approval is missing or ambiguous.",
        "Stop if source paths, surface proofs, or required evidence are stale.",
        "Stop if implementation would create a fork instead of a Canon-owned export and registry item.",
        "Stop before creating Linear work automatically from this plan.",
        "Stop if readiness output is used as approval instead of evidence for a maintainer decision.",
        "Stop if no Canon registry id, export path, docs path, and validation scope have been selected.",
        "Stop if any required approval-record field is still UNSET.",
        "Stop if target fields were copied from hints without maintainer review.",
        "Stop before using this record as permission to mutate Canon or project overlays."
      ],
      "approvalBoundary": [
        "This approval record is a read-only template and does not itself approve implementation.",
        "Only a maintainer-filled record with explicit owner, evidence, target, docs, maturity, and implementation owner fields can support opening implementation work.",
        "The record does not create Linear issues, mutate Canon, mutate project overlays, or mark candidates stable."
      ],
      "agentContract": {
        "purpose": "canon-overlay-candidate-promotion-approval-record",
        "primaryConsumers": [
          "codex",
          "mcp",
          "ltd-docs",
          "project-overlays"
        ],
        "useFor": [
          "recording the exact human approval and target choices required before implementation",
          "keeping readiness hints separate from maintainer-selected targets",
          "handing an approved candidate into a bounded implementation slice"
        ],
        "stopBefore": [
          "automatically filling required approval fields",
          "automatically creating Linear work",
          "automatically editing Canon source, registry, exports, docs, or project overlays",
          "treating an unfilled approval record as approval or stable promotion"
        ]
      }
    }
  ],
  "summary": {
    "total": 2,
    "approvalRequired": 2
  },
  "agentContract": {
    "purpose": "canon-overlay-candidate-promotion-approval-records",
    "primaryConsumers": [
      "codex",
      "mcp",
      "ltd-docs",
      "project-overlays"
    ],
    "useFor": [
      "recording the human approval and target-selection fields required before implementation starts",
      "turning readiness review hints into explicit maintainer choices",
      "preserving approval evidence as a review artifact without mutating Canon or project overlays"
    ],
    "stopBefore": [
      "treating an unfilled approval record as approval",
      "automatically filling target fields from readiness hints",
      "automatically creating Linear work from approval records",
      "automatically editing Canon registry, exports, docs, or project overlays",
      "marking candidates stable from approval-record output"
    ]
  }
};
