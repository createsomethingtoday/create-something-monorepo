/**
 * Generated Canon overlay candidate promotion approval record content — DO NOT EDIT MANUALLY.
 * Run: npm run build:content
 * Source: packages/canon/src/lib/mcp-snapshot/
 */

import type { CanonOverlayCandidatePromotionApprovalRecordCollection } from '../types.js';

export const CANON_OVERLAY_CANDIDATE_PROMOTION_APPROVAL_RECORDS: CanonOverlayCandidatePromotionApprovalRecordCollection = {
  "schemaVersion": 1,
  "id": "canon-overlay-candidate-promotion-approval-records",
  "sourceOfTruth": "@create-something/canon/overlays/intake",
  "description": "Read-only approval-record templates for Canon overlay candidate promotion readiness reports, making maintainer approval, target selection, and implementation ownership explicit before code changes.",
  "entries": [
    {
      "id": "canon-overlay-candidate-promotion-approval-record:overlay.atlas-studio-desktop.surface-brief",
      "readinessReportId": "canon-overlay-candidate-promotion-readiness:overlay.atlas-studio-desktop.surface-brief",
      "planId": "canon-overlay-candidate-promotion-plan:overlay.atlas-studio-desktop.surface-brief",
      "candidateId": "overlay.atlas-studio-desktop:overlay.atlas-studio-desktop.surface-brief",
      "intakeId": "overlay.atlas-studio-desktop.surface-brief",
      "title": "Surface Brief Template approval record",
      "summary": "A reusable project-overlay brief for documenting workflow state, Canon reuse, local artifacts, evidence, and extension-intake needs. This readiness report compares the plan with current Canon registry and public export policy snapshots before implementation starts. Fill this record before implementation starts; every target remains unset until a maintainer records an explicit choice.",
      "state": "approval-required",
      "approvalUri": "canon://overlays/candidates/overlay.atlas-studio-desktop.surface-brief/approval-record",
      "readinessUri": "canon://overlays/candidates/overlay.atlas-studio-desktop.surface-brief/readiness",
      "planUri": "canon://overlays/candidates/overlay.atlas-studio-desktop.surface-brief/promotion-plan",
      "handoffUri": "canon://overlays/candidates/overlay.atlas-studio-desktop.surface-brief/handoff",
      "candidateUri": "canon://overlays/candidates/overlay.atlas-studio-desktop.surface-brief",
      "reviewUri": "canon://overlays/intake/overlay.atlas-studio-desktop",
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
            "template.canon-extension-intake: Canon Extension Intake Template",
            "template.canon-project-overlay-template-pack: Canon Project Overlay Template Pack",
            "token.canon-core: Canon Core Tokens"
          ],
          "instructions": "Record the selected Canon registry item id or the new id to create."
        },
        {
          "id": "exportPath",
          "label": "Export Path",
          "required": true,
          "value": null,
          "hints": [
            "./modality-readiness: registry-covered / registry-artifact",
            "./codification: registry-covered / registry-artifact",
            "./mcp-snapshot: registry-covered / registry-artifact",
            "./overlays/intake: registry-covered / registry-artifact",
            "./registry: registry-covered / registry-artifact"
          ],
          "instructions": "Record the package export path that implementation should add or update."
        },
        {
          "id": "exportName",
          "label": "Export Name",
          "required": false,
          "value": null,
          "hints": [
            "./modality-readiness: registry-covered / registry-artifact",
            "./codification: registry-covered / registry-artifact",
            "./mcp-snapshot: registry-covered / registry-artifact",
            "./overlays/intake: registry-covered / registry-artifact",
            "./registry: registry-covered / registry-artifact"
          ],
          "instructions": "Record the named export when the target is a symbol-level export."
        },
        {
          "id": "docsPath",
          "label": "Docs Path",
          "required": true,
          "value": null,
          "hints": [
            "/canon/resources/registry",
            "/canon/resources/tokens"
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
            "score": 32,
            "reason": "Matches requested kind and overlaps 5 requested modalities."
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
            "score": 31,
            "reason": "Matches requested kind and overlaps 5 requested modalities."
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
            "score": 30,
            "reason": "Matches requested kind and overlaps 5 requested modalities."
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
            "score": 29,
            "reason": "Matches requested kind and overlaps 5 requested modalities."
          },
          {
            "id": "token.canon-core",
            "name": "Canon Core Tokens",
            "kind": "token",
            "maturity": "stable",
            "modalities": [
              "web",
              "app",
              "chat",
              "voice",
              "glasses"
            ],
            "docsPath": "/canon/resources/tokens",
            "score": 20,
            "reason": "Overlaps 5 requested modalities."
          }
        ],
        "exportPolicies": [
          {
            "exportPath": "./modality-readiness",
            "classification": "registry-artifact",
            "registryPolicy": "registry-covered",
            "score": 15,
            "rationale": "Modality readiness report audits web, chat, app, voice, and glasses implementation evidence from registry and overlay inventory.",
            "registryItemIds": [
              "template.canon-project-overlay-manifest",
              "template.canon-extension-intake"
            ]
          },
          {
            "exportPath": "./codification",
            "classification": "registry-artifact",
            "registryPolicy": "registry-covered",
            "score": 12,
            "rationale": "Codification audit classifies repo UI files by Canon ownership, direct import, overlay governance, or explicit local exemption.",
            "registryItemIds": [
              "template.canon-project-overlay-manifest",
              "template.canon-extension-intake"
            ]
          },
          {
            "exportPath": "./mcp-snapshot",
            "classification": "registry-artifact",
            "registryPolicy": "registry-covered",
            "score": 12,
            "rationale": "MCP snapshot bundles Canon registry, overlays, candidate review, and readiness artifacts for agent-facing consumers.",
            "registryItemIds": [
              "template.canon-project-overlay-template-pack",
              "template.canon-project-overlay-manifest",
              "template.canon-extension-intake"
            ]
          },
          {
            "exportPath": "./overlays/intake",
            "classification": "registry-artifact",
            "registryPolicy": "registry-covered",
            "score": 12,
            "rationale": "Overlay intake inventory scans project overlay manifests and routes extension-intake evidence without promoting primitives automatically.",
            "registryItemIds": [
              "template.canon-extension-intake"
            ]
          },
          {
            "exportPath": "./registry",
            "classification": "registry-artifact",
            "registryPolicy": "registry-covered",
            "score": 12,
            "rationale": "Registry API is the Canon source of truth for discoverable artifacts and lifecycle rules.",
            "registryItemIds": [
              "template.canon-extension-intake",
              "template.canon-project-overlay-manifest"
            ]
          }
        ],
        "docsPaths": [
          "/canon/resources/registry",
          "/canon/resources/tokens"
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
      "id": "canon-overlay-candidate-promotion-approval-record:overlay.guard-performance-lab.surface-brief",
      "readinessReportId": "canon-overlay-candidate-promotion-readiness:overlay.guard-performance-lab.surface-brief",
      "planId": "canon-overlay-candidate-promotion-plan:overlay.guard-performance-lab.surface-brief",
      "candidateId": "overlay.guard-performance-lab:overlay.guard-performance-lab.surface-brief",
      "intakeId": "overlay.guard-performance-lab.surface-brief",
      "title": "Surface Brief Template approval record",
      "summary": "A reusable project-overlay brief for documenting workflow state, Canon reuse, local artifacts, evidence, and extension-intake needs. This readiness report compares the plan with current Canon registry and public export policy snapshots before implementation starts. Fill this record before implementation starts; every target remains unset until a maintainer records an explicit choice.",
      "state": "approval-required",
      "approvalUri": "canon://overlays/candidates/overlay.guard-performance-lab.surface-brief/approval-record",
      "readinessUri": "canon://overlays/candidates/overlay.guard-performance-lab.surface-brief/readiness",
      "planUri": "canon://overlays/candidates/overlay.guard-performance-lab.surface-brief/promotion-plan",
      "handoffUri": "canon://overlays/candidates/overlay.guard-performance-lab.surface-brief/handoff",
      "candidateUri": "canon://overlays/candidates/overlay.guard-performance-lab.surface-brief",
      "reviewUri": "canon://overlays/intake/overlay.guard-performance-lab",
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
            "template.canon-project-overlay-manifest: Canon Project Overlay Manifest",
            "template.canon-extension-intake: Canon Extension Intake Template",
            "template.atlas-development-handoff: Atlas Development Handoff Template",
            "template.canon-project-overlay-template-pack: Canon Project Overlay Template Pack",
            "token.canon-core: Canon Core Tokens"
          ],
          "instructions": "Record the selected Canon registry item id or the new id to create."
        },
        {
          "id": "exportPath",
          "label": "Export Path",
          "required": true,
          "value": null,
          "hints": [
            "./modality-readiness: registry-covered / registry-artifact",
            "./codification: registry-covered / registry-artifact",
            "./mcp-snapshot: registry-covered / registry-artifact",
            "./overlays/intake: registry-covered / registry-artifact",
            "./registry: registry-covered / registry-artifact"
          ],
          "instructions": "Record the package export path that implementation should add or update."
        },
        {
          "id": "exportName",
          "label": "Export Name",
          "required": false,
          "value": null,
          "hints": [
            "./modality-readiness: registry-covered / registry-artifact",
            "./codification: registry-covered / registry-artifact",
            "./mcp-snapshot: registry-covered / registry-artifact",
            "./overlays/intake: registry-covered / registry-artifact",
            "./registry: registry-covered / registry-artifact"
          ],
          "instructions": "Record the named export when the target is a symbol-level export."
        },
        {
          "id": "docsPath",
          "label": "Docs Path",
          "required": true,
          "value": null,
          "hints": [
            "/canon/resources/registry",
            "/canon/resources/tokens"
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
            "score": 31,
            "reason": "Matches requested kind and overlaps 5 requested modalities."
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
            "score": 30,
            "reason": "Matches requested kind and overlaps 5 requested modalities."
          },
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
            "score": 29,
            "reason": "Matches requested kind and overlaps 5 requested modalities."
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
            "score": 29,
            "reason": "Matches requested kind and overlaps 5 requested modalities."
          },
          {
            "id": "token.canon-core",
            "name": "Canon Core Tokens",
            "kind": "token",
            "maturity": "stable",
            "modalities": [
              "web",
              "app",
              "chat",
              "voice",
              "glasses"
            ],
            "docsPath": "/canon/resources/tokens",
            "score": 20,
            "reason": "Overlaps 5 requested modalities."
          }
        ],
        "exportPolicies": [
          {
            "exportPath": "./modality-readiness",
            "classification": "registry-artifact",
            "registryPolicy": "registry-covered",
            "score": 15,
            "rationale": "Modality readiness report audits web, chat, app, voice, and glasses implementation evidence from registry and overlay inventory.",
            "registryItemIds": [
              "template.canon-project-overlay-manifest",
              "template.canon-extension-intake"
            ]
          },
          {
            "exportPath": "./codification",
            "classification": "registry-artifact",
            "registryPolicy": "registry-covered",
            "score": 12,
            "rationale": "Codification audit classifies repo UI files by Canon ownership, direct import, overlay governance, or explicit local exemption.",
            "registryItemIds": [
              "template.canon-project-overlay-manifest",
              "template.canon-extension-intake"
            ]
          },
          {
            "exportPath": "./mcp-snapshot",
            "classification": "registry-artifact",
            "registryPolicy": "registry-covered",
            "score": 12,
            "rationale": "MCP snapshot bundles Canon registry, overlays, candidate review, and readiness artifacts for agent-facing consumers.",
            "registryItemIds": [
              "template.canon-project-overlay-template-pack",
              "template.canon-project-overlay-manifest",
              "template.canon-extension-intake"
            ]
          },
          {
            "exportPath": "./overlays/intake",
            "classification": "registry-artifact",
            "registryPolicy": "registry-covered",
            "score": 12,
            "rationale": "Overlay intake inventory scans project overlay manifests and routes extension-intake evidence without promoting primitives automatically.",
            "registryItemIds": [
              "template.canon-extension-intake"
            ]
          },
          {
            "exportPath": "./registry",
            "classification": "registry-artifact",
            "registryPolicy": "registry-covered",
            "score": 12,
            "rationale": "Registry API is the Canon source of truth for discoverable artifacts and lifecycle rules.",
            "registryItemIds": [
              "template.canon-extension-intake",
              "template.canon-project-overlay-manifest"
            ]
          }
        ],
        "docsPaths": [
          "/canon/resources/registry",
          "/canon/resources/tokens"
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
      "id": "canon-overlay-candidate-promotion-approval-record:overlay.marketplace-template-submission-cloud.surface-brief",
      "readinessReportId": "canon-overlay-candidate-promotion-readiness:overlay.marketplace-template-submission-cloud.surface-brief",
      "planId": "canon-overlay-candidate-promotion-plan:overlay.marketplace-template-submission-cloud.surface-brief",
      "candidateId": "overlay.marketplace-template-submission-cloud:overlay.marketplace-template-submission-cloud.surface-brief",
      "intakeId": "overlay.marketplace-template-submission-cloud.surface-brief",
      "title": "Surface Brief Template approval record",
      "summary": "A reusable project-overlay brief for documenting workflow state, Canon reuse, local artifacts, evidence, and extension-intake needs. This readiness report compares the plan with current Canon registry and public export policy snapshots before implementation starts. Fill this record before implementation starts; every target remains unset until a maintainer records an explicit choice.",
      "state": "approval-required",
      "approvalUri": "canon://overlays/candidates/overlay.marketplace-template-submission-cloud.surface-brief/approval-record",
      "readinessUri": "canon://overlays/candidates/overlay.marketplace-template-submission-cloud.surface-brief/readiness",
      "planUri": "canon://overlays/candidates/overlay.marketplace-template-submission-cloud.surface-brief/promotion-plan",
      "handoffUri": "canon://overlays/candidates/overlay.marketplace-template-submission-cloud.surface-brief/handoff",
      "candidateUri": "canon://overlays/candidates/overlay.marketplace-template-submission-cloud.surface-brief",
      "reviewUri": "canon://overlays/intake/overlay.marketplace-template-submission-cloud",
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
            "template.canon-project-overlay-manifest: Canon Project Overlay Manifest",
            "template.canon-extension-intake: Canon Extension Intake Template",
            "template.atlas-development-handoff: Atlas Development Handoff Template",
            "template.canon-project-overlay-template-pack: Canon Project Overlay Template Pack",
            "template.chat-decision-brief: Chat Decision Brief Template"
          ],
          "instructions": "Record the selected Canon registry item id or the new id to create."
        },
        {
          "id": "exportPath",
          "label": "Export Path",
          "required": true,
          "value": null,
          "hints": [
            "./modality-readiness: registry-covered / registry-artifact",
            "./codification: registry-covered / registry-artifact",
            "./mcp-snapshot: registry-covered / registry-artifact",
            "./overlays/intake: registry-covered / registry-artifact",
            "./registry: registry-covered / registry-artifact"
          ],
          "instructions": "Record the package export path that implementation should add or update."
        },
        {
          "id": "exportName",
          "label": "Export Name",
          "required": false,
          "value": null,
          "hints": [
            "./modality-readiness: registry-covered / registry-artifact",
            "./codification: registry-covered / registry-artifact",
            "./mcp-snapshot: registry-covered / registry-artifact",
            "./overlays/intake: registry-covered / registry-artifact",
            "./registry: registry-covered / registry-artifact"
          ],
          "instructions": "Record the named export when the target is a symbol-level export."
        },
        {
          "id": "docsPath",
          "label": "Docs Path",
          "required": true,
          "value": null,
          "hints": [
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
            "score": 34,
            "reason": "Matches requested kind and overlaps 5 requested modalities."
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
            "score": 33,
            "reason": "Matches requested kind and overlaps 5 requested modalities."
          },
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
            "score": 32,
            "reason": "Matches requested kind and overlaps 5 requested modalities."
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
            "score": 32,
            "reason": "Matches requested kind and overlaps 5 requested modalities."
          },
          {
            "id": "template.chat-decision-brief",
            "name": "Chat Decision Brief Template",
            "kind": "template",
            "maturity": "candidate",
            "modalities": [
              "chat",
              "voice"
            ],
            "docsPath": "/canon/resources/registry",
            "score": 21,
            "reason": "Matches requested kind and overlaps 2 requested modalities."
          }
        ],
        "exportPolicies": [
          {
            "exportPath": "./modality-readiness",
            "classification": "registry-artifact",
            "registryPolicy": "registry-covered",
            "score": 18,
            "rationale": "Modality readiness report audits web, chat, app, voice, and glasses implementation evidence from registry and overlay inventory.",
            "registryItemIds": [
              "template.canon-project-overlay-manifest",
              "template.canon-extension-intake"
            ]
          },
          {
            "exportPath": "./codification",
            "classification": "registry-artifact",
            "registryPolicy": "registry-covered",
            "score": 15,
            "rationale": "Codification audit classifies repo UI files by Canon ownership, direct import, overlay governance, or explicit local exemption.",
            "registryItemIds": [
              "template.canon-project-overlay-manifest",
              "template.canon-extension-intake"
            ]
          },
          {
            "exportPath": "./mcp-snapshot",
            "classification": "registry-artifact",
            "registryPolicy": "registry-covered",
            "score": 15,
            "rationale": "MCP snapshot bundles Canon registry, overlays, candidate review, and readiness artifacts for agent-facing consumers.",
            "registryItemIds": [
              "template.canon-project-overlay-template-pack",
              "template.canon-project-overlay-manifest",
              "template.canon-extension-intake"
            ]
          },
          {
            "exportPath": "./overlays/intake",
            "classification": "registry-artifact",
            "registryPolicy": "registry-covered",
            "score": 15,
            "rationale": "Overlay intake inventory scans project overlay manifests and routes extension-intake evidence without promoting primitives automatically.",
            "registryItemIds": [
              "template.canon-extension-intake"
            ]
          },
          {
            "exportPath": "./registry",
            "classification": "registry-artifact",
            "registryPolicy": "registry-covered",
            "score": 15,
            "rationale": "Registry API is the Canon source of truth for discoverable artifacts and lifecycle rules.",
            "registryItemIds": [
              "template.canon-extension-intake",
              "template.canon-project-overlay-manifest"
            ]
          }
        ],
        "docsPaths": [
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
      "id": "canon-overlay-candidate-promotion-approval-record:overlay.webflow-dashboard-cloud.surface-brief",
      "readinessReportId": "canon-overlay-candidate-promotion-readiness:overlay.webflow-dashboard-cloud.surface-brief",
      "planId": "canon-overlay-candidate-promotion-plan:overlay.webflow-dashboard-cloud.surface-brief",
      "candidateId": "overlay.webflow-dashboard-cloud:overlay.webflow-dashboard-cloud.surface-brief",
      "intakeId": "overlay.webflow-dashboard-cloud.surface-brief",
      "title": "Surface Brief Template approval record",
      "summary": "A reusable project-overlay brief for documenting workflow state, Canon reuse, local artifacts, evidence, and extension-intake needs. This readiness report compares the plan with current Canon registry and public export policy snapshots before implementation starts. Fill this record before implementation starts; every target remains unset until a maintainer records an explicit choice.",
      "state": "approval-required",
      "approvalUri": "canon://overlays/candidates/overlay.webflow-dashboard-cloud.surface-brief/approval-record",
      "readinessUri": "canon://overlays/candidates/overlay.webflow-dashboard-cloud.surface-brief/readiness",
      "planUri": "canon://overlays/candidates/overlay.webflow-dashboard-cloud.surface-brief/promotion-plan",
      "handoffUri": "canon://overlays/candidates/overlay.webflow-dashboard-cloud.surface-brief/handoff",
      "candidateUri": "canon://overlays/candidates/overlay.webflow-dashboard-cloud.surface-brief",
      "reviewUri": "canon://overlays/intake/overlay.webflow-dashboard-cloud",
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
            "template.canon-project-overlay-manifest: Canon Project Overlay Manifest",
            "template.canon-extension-intake: Canon Extension Intake Template",
            "template.atlas-development-handoff: Atlas Development Handoff Template",
            "template.canon-project-overlay-template-pack: Canon Project Overlay Template Pack",
            "token.canon-core: Canon Core Tokens"
          ],
          "instructions": "Record the selected Canon registry item id or the new id to create."
        },
        {
          "id": "exportPath",
          "label": "Export Path",
          "required": true,
          "value": null,
          "hints": [
            "./modality-readiness: registry-covered / registry-artifact",
            "./codification: registry-covered / registry-artifact",
            "./mcp-snapshot: registry-covered / registry-artifact",
            "./overlays/intake: registry-covered / registry-artifact",
            "./registry: registry-covered / registry-artifact"
          ],
          "instructions": "Record the package export path that implementation should add or update."
        },
        {
          "id": "exportName",
          "label": "Export Name",
          "required": false,
          "value": null,
          "hints": [
            "./modality-readiness: registry-covered / registry-artifact",
            "./codification: registry-covered / registry-artifact",
            "./mcp-snapshot: registry-covered / registry-artifact",
            "./overlays/intake: registry-covered / registry-artifact",
            "./registry: registry-covered / registry-artifact"
          ],
          "instructions": "Record the named export when the target is a symbol-level export."
        },
        {
          "id": "docsPath",
          "label": "Docs Path",
          "required": true,
          "value": null,
          "hints": [
            "/canon/resources/registry",
            "/canon/resources/tokens"
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
            "score": 31,
            "reason": "Matches requested kind and overlaps 5 requested modalities."
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
            "score": 30,
            "reason": "Matches requested kind and overlaps 5 requested modalities."
          },
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
            "score": 29,
            "reason": "Matches requested kind and overlaps 5 requested modalities."
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
            "score": 29,
            "reason": "Matches requested kind and overlaps 5 requested modalities."
          },
          {
            "id": "token.canon-core",
            "name": "Canon Core Tokens",
            "kind": "token",
            "maturity": "stable",
            "modalities": [
              "web",
              "app",
              "chat",
              "voice",
              "glasses"
            ],
            "docsPath": "/canon/resources/tokens",
            "score": 20,
            "reason": "Overlaps 5 requested modalities."
          }
        ],
        "exportPolicies": [
          {
            "exportPath": "./modality-readiness",
            "classification": "registry-artifact",
            "registryPolicy": "registry-covered",
            "score": 15,
            "rationale": "Modality readiness report audits web, chat, app, voice, and glasses implementation evidence from registry and overlay inventory.",
            "registryItemIds": [
              "template.canon-project-overlay-manifest",
              "template.canon-extension-intake"
            ]
          },
          {
            "exportPath": "./codification",
            "classification": "registry-artifact",
            "registryPolicy": "registry-covered",
            "score": 12,
            "rationale": "Codification audit classifies repo UI files by Canon ownership, direct import, overlay governance, or explicit local exemption.",
            "registryItemIds": [
              "template.canon-project-overlay-manifest",
              "template.canon-extension-intake"
            ]
          },
          {
            "exportPath": "./mcp-snapshot",
            "classification": "registry-artifact",
            "registryPolicy": "registry-covered",
            "score": 12,
            "rationale": "MCP snapshot bundles Canon registry, overlays, candidate review, and readiness artifacts for agent-facing consumers.",
            "registryItemIds": [
              "template.canon-project-overlay-template-pack",
              "template.canon-project-overlay-manifest",
              "template.canon-extension-intake"
            ]
          },
          {
            "exportPath": "./overlays/intake",
            "classification": "registry-artifact",
            "registryPolicy": "registry-covered",
            "score": 12,
            "rationale": "Overlay intake inventory scans project overlay manifests and routes extension-intake evidence without promoting primitives automatically.",
            "registryItemIds": [
              "template.canon-extension-intake"
            ]
          },
          {
            "exportPath": "./registry",
            "classification": "registry-artifact",
            "registryPolicy": "registry-covered",
            "score": 12,
            "rationale": "Registry API is the Canon source of truth for discoverable artifacts and lifecycle rules.",
            "registryItemIds": [
              "template.canon-extension-intake",
              "template.canon-project-overlay-manifest"
            ]
          }
        ],
        "docsPaths": [
          "/canon/resources/registry",
          "/canon/resources/tokens"
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
      "id": "canon-overlay-candidate-promotion-approval-record:overlay.webflow-marketplace-category-cloud.surface-brief",
      "readinessReportId": "canon-overlay-candidate-promotion-readiness:overlay.webflow-marketplace-category-cloud.surface-brief",
      "planId": "canon-overlay-candidate-promotion-plan:overlay.webflow-marketplace-category-cloud.surface-brief",
      "candidateId": "overlay.webflow-marketplace-category-cloud:overlay.webflow-marketplace-category-cloud.surface-brief",
      "intakeId": "overlay.webflow-marketplace-category-cloud.surface-brief",
      "title": "Surface Brief Template approval record",
      "summary": "A reusable project-overlay brief for documenting workflow state, Canon reuse, local artifacts, evidence, and extension-intake needs. This readiness report compares the plan with current Canon registry and public export policy snapshots before implementation starts. Fill this record before implementation starts; every target remains unset until a maintainer records an explicit choice.",
      "state": "approval-required",
      "approvalUri": "canon://overlays/candidates/overlay.webflow-marketplace-category-cloud.surface-brief/approval-record",
      "readinessUri": "canon://overlays/candidates/overlay.webflow-marketplace-category-cloud.surface-brief/readiness",
      "planUri": "canon://overlays/candidates/overlay.webflow-marketplace-category-cloud.surface-brief/promotion-plan",
      "handoffUri": "canon://overlays/candidates/overlay.webflow-marketplace-category-cloud.surface-brief/handoff",
      "candidateUri": "canon://overlays/candidates/overlay.webflow-marketplace-category-cloud.surface-brief",
      "reviewUri": "canon://overlays/intake/overlay.webflow-marketplace-category-cloud",
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
            "template.canon-project-overlay-manifest: Canon Project Overlay Manifest",
            "template.canon-extension-intake: Canon Extension Intake Template",
            "template.atlas-development-handoff: Atlas Development Handoff Template",
            "template.canon-project-overlay-template-pack: Canon Project Overlay Template Pack",
            "token.canon-core: Canon Core Tokens"
          ],
          "instructions": "Record the selected Canon registry item id or the new id to create."
        },
        {
          "id": "exportPath",
          "label": "Export Path",
          "required": true,
          "value": null,
          "hints": [
            "./modality-readiness: registry-covered / registry-artifact",
            "./codification: registry-covered / registry-artifact",
            "./mcp-snapshot: registry-covered / registry-artifact",
            "./overlays/intake: registry-covered / registry-artifact",
            "./registry: registry-covered / registry-artifact"
          ],
          "instructions": "Record the package export path that implementation should add or update."
        },
        {
          "id": "exportName",
          "label": "Export Name",
          "required": false,
          "value": null,
          "hints": [
            "./modality-readiness: registry-covered / registry-artifact",
            "./codification: registry-covered / registry-artifact",
            "./mcp-snapshot: registry-covered / registry-artifact",
            "./overlays/intake: registry-covered / registry-artifact",
            "./registry: registry-covered / registry-artifact"
          ],
          "instructions": "Record the named export when the target is a symbol-level export."
        },
        {
          "id": "docsPath",
          "label": "Docs Path",
          "required": true,
          "value": null,
          "hints": [
            "/canon/resources/registry",
            "/canon/resources/tokens"
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
            "score": 31,
            "reason": "Matches requested kind and overlaps 5 requested modalities."
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
            "score": 30,
            "reason": "Matches requested kind and overlaps 5 requested modalities."
          },
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
            "score": 29,
            "reason": "Matches requested kind and overlaps 5 requested modalities."
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
            "score": 29,
            "reason": "Matches requested kind and overlaps 5 requested modalities."
          },
          {
            "id": "token.canon-core",
            "name": "Canon Core Tokens",
            "kind": "token",
            "maturity": "stable",
            "modalities": [
              "web",
              "app",
              "chat",
              "voice",
              "glasses"
            ],
            "docsPath": "/canon/resources/tokens",
            "score": 20,
            "reason": "Overlaps 5 requested modalities."
          }
        ],
        "exportPolicies": [
          {
            "exportPath": "./modality-readiness",
            "classification": "registry-artifact",
            "registryPolicy": "registry-covered",
            "score": 15,
            "rationale": "Modality readiness report audits web, chat, app, voice, and glasses implementation evidence from registry and overlay inventory.",
            "registryItemIds": [
              "template.canon-project-overlay-manifest",
              "template.canon-extension-intake"
            ]
          },
          {
            "exportPath": "./codification",
            "classification": "registry-artifact",
            "registryPolicy": "registry-covered",
            "score": 12,
            "rationale": "Codification audit classifies repo UI files by Canon ownership, direct import, overlay governance, or explicit local exemption.",
            "registryItemIds": [
              "template.canon-project-overlay-manifest",
              "template.canon-extension-intake"
            ]
          },
          {
            "exportPath": "./mcp-snapshot",
            "classification": "registry-artifact",
            "registryPolicy": "registry-covered",
            "score": 12,
            "rationale": "MCP snapshot bundles Canon registry, overlays, candidate review, and readiness artifacts for agent-facing consumers.",
            "registryItemIds": [
              "template.canon-project-overlay-template-pack",
              "template.canon-project-overlay-manifest",
              "template.canon-extension-intake"
            ]
          },
          {
            "exportPath": "./overlays/intake",
            "classification": "registry-artifact",
            "registryPolicy": "registry-covered",
            "score": 12,
            "rationale": "Overlay intake inventory scans project overlay manifests and routes extension-intake evidence without promoting primitives automatically.",
            "registryItemIds": [
              "template.canon-extension-intake"
            ]
          },
          {
            "exportPath": "./registry",
            "classification": "registry-artifact",
            "registryPolicy": "registry-covered",
            "score": 12,
            "rationale": "Registry API is the Canon source of truth for discoverable artifacts and lifecycle rules.",
            "registryItemIds": [
              "template.canon-extension-intake",
              "template.canon-project-overlay-manifest"
            ]
          }
        ],
        "docsPaths": [
          "/canon/resources/registry",
          "/canon/resources/tokens"
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
            "template.canon-extension-intake: Canon Extension Intake Template",
            "component.atlas-atlas-story-canvas: AtlasStoryCanvas"
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
            "./modality-readiness: registry-covered / registry-artifact",
            "./overlays/intake: registry-covered / registry-artifact",
            "./atlas/handoff: registry-covered / headless-contract",
            "./components#TriadHealth: candidate-review / domain-specific"
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
            "./modality-readiness: registry-covered / registry-artifact",
            "./overlays/intake: registry-covered / registry-artifact",
            "./atlas/handoff: registry-covered / headless-contract",
            "./components#TriadHealth: candidate-review / domain-specific"
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
            "score": 34,
            "reason": "Matches requested kind and overlaps 5 requested modalities."
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
            "score": 28,
            "reason": "Matches requested kind and overlaps 5 requested modalities."
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
            "score": 26,
            "reason": "Matches requested kind and overlaps 5 requested modalities."
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
            "score": 25,
            "reason": "Matches requested kind and overlaps 5 requested modalities."
          },
          {
            "id": "component.atlas-atlas-story-canvas",
            "name": "AtlasStoryCanvas",
            "kind": "component",
            "maturity": "stable",
            "modalities": [
              "web",
              "app",
              "chat",
              "voice",
              "glasses"
            ],
            "docsPath": "/canon/components/atlas",
            "score": 24,
            "reason": "Overlaps 5 requested modalities."
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
            "exportPath": "./modality-readiness",
            "classification": "registry-artifact",
            "registryPolicy": "registry-covered",
            "score": 8,
            "rationale": "Modality readiness report audits web, chat, app, voice, and glasses implementation evidence from registry and overlay inventory.",
            "registryItemIds": [
              "template.canon-project-overlay-manifest",
              "template.canon-extension-intake"
            ]
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
      "id": "canon-overlay-candidate-promotion-approval-record:overlay.jandjhomehealth.surface-brief",
      "readinessReportId": "canon-overlay-candidate-promotion-readiness:overlay.jandjhomehealth.surface-brief",
      "planId": "canon-overlay-candidate-promotion-plan:overlay.jandjhomehealth.surface-brief",
      "candidateId": "overlay.jandjhomehealth:overlay.jandjhomehealth.surface-brief",
      "intakeId": "overlay.jandjhomehealth.surface-brief",
      "title": "Surface Brief Template approval record",
      "summary": "A reusable project-overlay brief for documenting workflow state, Canon reuse, local artifacts, evidence, and extension-intake needs. This readiness report compares the plan with current Canon registry and public export policy snapshots before implementation starts. Fill this record before implementation starts; every target remains unset until a maintainer records an explicit choice.",
      "state": "approval-required",
      "approvalUri": "canon://overlays/candidates/overlay.jandjhomehealth.surface-brief/approval-record",
      "readinessUri": "canon://overlays/candidates/overlay.jandjhomehealth.surface-brief/readiness",
      "planUri": "canon://overlays/candidates/overlay.jandjhomehealth.surface-brief/promotion-plan",
      "handoffUri": "canon://overlays/candidates/overlay.jandjhomehealth.surface-brief/handoff",
      "candidateUri": "canon://overlays/candidates/overlay.jandjhomehealth.surface-brief",
      "reviewUri": "canon://overlays/intake/overlay.jandjhomehealth",
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
            "template.canon-project-overlay-manifest: Canon Project Overlay Manifest",
            "template.canon-extension-intake: Canon Extension Intake Template",
            "template.canon-project-overlay-template-pack: Canon Project Overlay Template Pack",
            "template.atlas-development-handoff: Atlas Development Handoff Template",
            "component.triad-health: TriadHealth"
          ],
          "instructions": "Record the selected Canon registry item id or the new id to create."
        },
        {
          "id": "exportPath",
          "label": "Export Path",
          "required": true,
          "value": null,
          "hints": [
            "./modality-readiness: registry-covered / registry-artifact",
            "./codification: registry-covered / registry-artifact",
            "./mcp-snapshot: registry-covered / registry-artifact",
            "./overlays/intake: registry-covered / registry-artifact",
            "./registry: registry-covered / registry-artifact"
          ],
          "instructions": "Record the package export path that implementation should add or update."
        },
        {
          "id": "exportName",
          "label": "Export Name",
          "required": false,
          "value": null,
          "hints": [
            "./modality-readiness: registry-covered / registry-artifact",
            "./codification: registry-covered / registry-artifact",
            "./mcp-snapshot: registry-covered / registry-artifact",
            "./overlays/intake: registry-covered / registry-artifact",
            "./registry: registry-covered / registry-artifact"
          ],
          "instructions": "Record the named export when the target is a symbol-level export."
        },
        {
          "id": "docsPath",
          "label": "Docs Path",
          "required": true,
          "value": null,
          "hints": [
            "/canon/components",
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
            "score": 32,
            "reason": "Matches requested kind and overlaps 5 requested modalities."
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
            "score": 31,
            "reason": "Matches requested kind and overlaps 5 requested modalities."
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
            "score": 30,
            "reason": "Matches requested kind and overlaps 5 requested modalities."
          },
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
            "score": 29,
            "reason": "Matches requested kind and overlaps 5 requested modalities."
          },
          {
            "id": "component.triad-health",
            "name": "TriadHealth",
            "kind": "component",
            "maturity": "stable",
            "modalities": [
              "web",
              "app",
              "chat",
              "voice",
              "glasses"
            ],
            "docsPath": "/canon/components",
            "score": 20,
            "reason": "Overlaps 5 requested modalities."
          }
        ],
        "exportPolicies": [
          {
            "exportPath": "./modality-readiness",
            "classification": "registry-artifact",
            "registryPolicy": "registry-covered",
            "score": 15,
            "rationale": "Modality readiness report audits web, chat, app, voice, and glasses implementation evidence from registry and overlay inventory.",
            "registryItemIds": [
              "template.canon-project-overlay-manifest",
              "template.canon-extension-intake"
            ]
          },
          {
            "exportPath": "./codification",
            "classification": "registry-artifact",
            "registryPolicy": "registry-covered",
            "score": 12,
            "rationale": "Codification audit classifies repo UI files by Canon ownership, direct import, overlay governance, or explicit local exemption.",
            "registryItemIds": [
              "template.canon-project-overlay-manifest",
              "template.canon-extension-intake"
            ]
          },
          {
            "exportPath": "./mcp-snapshot",
            "classification": "registry-artifact",
            "registryPolicy": "registry-covered",
            "score": 12,
            "rationale": "MCP snapshot bundles Canon registry, overlays, candidate review, and readiness artifacts for agent-facing consumers.",
            "registryItemIds": [
              "template.canon-project-overlay-template-pack",
              "template.canon-project-overlay-manifest",
              "template.canon-extension-intake"
            ]
          },
          {
            "exportPath": "./overlays/intake",
            "classification": "registry-artifact",
            "registryPolicy": "registry-covered",
            "score": 12,
            "rationale": "Overlay intake inventory scans project overlay manifests and routes extension-intake evidence without promoting primitives automatically.",
            "registryItemIds": [
              "template.canon-extension-intake"
            ]
          },
          {
            "exportPath": "./registry",
            "classification": "registry-artifact",
            "registryPolicy": "registry-covered",
            "score": 12,
            "rationale": "Registry API is the Canon source of truth for discoverable artifacts and lifecycle rules.",
            "registryItemIds": [
              "template.canon-extension-intake",
              "template.canon-project-overlay-manifest"
            ]
          }
        ],
        "docsPaths": [
          "/canon/components",
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
      "id": "canon-overlay-candidate-promotion-approval-record:overlay.outerfields.surface-brief",
      "readinessReportId": "canon-overlay-candidate-promotion-readiness:overlay.outerfields.surface-brief",
      "planId": "canon-overlay-candidate-promotion-plan:overlay.outerfields.surface-brief",
      "candidateId": "overlay.outerfields:overlay.outerfields.surface-brief",
      "intakeId": "overlay.outerfields.surface-brief",
      "title": "Surface Brief Template approval record",
      "summary": "A reusable project-overlay brief for documenting workflow state, Canon reuse, local artifacts, evidence, and extension-intake needs. This readiness report compares the plan with current Canon registry and public export policy snapshots before implementation starts. Fill this record before implementation starts; every target remains unset until a maintainer records an explicit choice.",
      "state": "approval-required",
      "approvalUri": "canon://overlays/candidates/overlay.outerfields.surface-brief/approval-record",
      "readinessUri": "canon://overlays/candidates/overlay.outerfields.surface-brief/readiness",
      "planUri": "canon://overlays/candidates/overlay.outerfields.surface-brief/promotion-plan",
      "handoffUri": "canon://overlays/candidates/overlay.outerfields.surface-brief/handoff",
      "candidateUri": "canon://overlays/candidates/overlay.outerfields.surface-brief",
      "reviewUri": "canon://overlays/intake/overlay.outerfields",
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
            "template.canon-project-overlay-manifest: Canon Project Overlay Manifest",
            "template.canon-extension-intake: Canon Extension Intake Template",
            "template.canon-project-overlay-template-pack: Canon Project Overlay Template Pack",
            "template.atlas-development-handoff: Atlas Development Handoff Template",
            "token.canon-core: Canon Core Tokens"
          ],
          "instructions": "Record the selected Canon registry item id or the new id to create."
        },
        {
          "id": "exportPath",
          "label": "Export Path",
          "required": true,
          "value": null,
          "hints": [
            "./modality-readiness: registry-covered / registry-artifact",
            "./codification: registry-covered / registry-artifact",
            "./mcp-snapshot: registry-covered / registry-artifact",
            "./overlays/intake: registry-covered / registry-artifact",
            "./registry: registry-covered / registry-artifact"
          ],
          "instructions": "Record the package export path that implementation should add or update."
        },
        {
          "id": "exportName",
          "label": "Export Name",
          "required": false,
          "value": null,
          "hints": [
            "./modality-readiness: registry-covered / registry-artifact",
            "./codification: registry-covered / registry-artifact",
            "./mcp-snapshot: registry-covered / registry-artifact",
            "./overlays/intake: registry-covered / registry-artifact",
            "./registry: registry-covered / registry-artifact"
          ],
          "instructions": "Record the named export when the target is a symbol-level export."
        },
        {
          "id": "docsPath",
          "label": "Docs Path",
          "required": true,
          "value": null,
          "hints": [
            "/canon/resources/registry",
            "/canon/resources/tokens"
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
            "score": 32,
            "reason": "Matches requested kind and overlaps 5 requested modalities."
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
            "score": 31,
            "reason": "Matches requested kind and overlaps 5 requested modalities."
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
            "score": 30,
            "reason": "Matches requested kind and overlaps 5 requested modalities."
          },
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
            "score": 29,
            "reason": "Matches requested kind and overlaps 5 requested modalities."
          },
          {
            "id": "token.canon-core",
            "name": "Canon Core Tokens",
            "kind": "token",
            "maturity": "stable",
            "modalities": [
              "web",
              "app",
              "chat",
              "voice",
              "glasses"
            ],
            "docsPath": "/canon/resources/tokens",
            "score": 20,
            "reason": "Overlaps 5 requested modalities."
          }
        ],
        "exportPolicies": [
          {
            "exportPath": "./modality-readiness",
            "classification": "registry-artifact",
            "registryPolicy": "registry-covered",
            "score": 15,
            "rationale": "Modality readiness report audits web, chat, app, voice, and glasses implementation evidence from registry and overlay inventory.",
            "registryItemIds": [
              "template.canon-project-overlay-manifest",
              "template.canon-extension-intake"
            ]
          },
          {
            "exportPath": "./codification",
            "classification": "registry-artifact",
            "registryPolicy": "registry-covered",
            "score": 12,
            "rationale": "Codification audit classifies repo UI files by Canon ownership, direct import, overlay governance, or explicit local exemption.",
            "registryItemIds": [
              "template.canon-project-overlay-manifest",
              "template.canon-extension-intake"
            ]
          },
          {
            "exportPath": "./mcp-snapshot",
            "classification": "registry-artifact",
            "registryPolicy": "registry-covered",
            "score": 12,
            "rationale": "MCP snapshot bundles Canon registry, overlays, candidate review, and readiness artifacts for agent-facing consumers.",
            "registryItemIds": [
              "template.canon-project-overlay-template-pack",
              "template.canon-project-overlay-manifest",
              "template.canon-extension-intake"
            ]
          },
          {
            "exportPath": "./overlays/intake",
            "classification": "registry-artifact",
            "registryPolicy": "registry-covered",
            "score": 12,
            "rationale": "Overlay intake inventory scans project overlay manifests and routes extension-intake evidence without promoting primitives automatically.",
            "registryItemIds": [
              "template.canon-extension-intake"
            ]
          },
          {
            "exportPath": "./registry",
            "classification": "registry-artifact",
            "registryPolicy": "registry-covered",
            "score": 12,
            "rationale": "Registry API is the Canon source of truth for discoverable artifacts and lifecycle rules.",
            "registryItemIds": [
              "template.canon-extension-intake",
              "template.canon-project-overlay-manifest"
            ]
          }
        ],
        "docsPaths": [
          "/canon/resources/registry",
          "/canon/resources/tokens"
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
      "id": "canon-overlay-candidate-promotion-approval-record:overlay.the-stack.surface-brief",
      "readinessReportId": "canon-overlay-candidate-promotion-readiness:overlay.the-stack.surface-brief",
      "planId": "canon-overlay-candidate-promotion-plan:overlay.the-stack.surface-brief",
      "candidateId": "overlay.the-stack:overlay.the-stack.surface-brief",
      "intakeId": "overlay.the-stack.surface-brief",
      "title": "Surface Brief Template approval record",
      "summary": "A reusable project-overlay brief for documenting workflow state, Canon reuse, local artifacts, evidence, and extension-intake needs. This readiness report compares the plan with current Canon registry and public export policy snapshots before implementation starts. Fill this record before implementation starts; every target remains unset until a maintainer records an explicit choice.",
      "state": "approval-required",
      "approvalUri": "canon://overlays/candidates/overlay.the-stack.surface-brief/approval-record",
      "readinessUri": "canon://overlays/candidates/overlay.the-stack.surface-brief/readiness",
      "planUri": "canon://overlays/candidates/overlay.the-stack.surface-brief/promotion-plan",
      "handoffUri": "canon://overlays/candidates/overlay.the-stack.surface-brief/handoff",
      "candidateUri": "canon://overlays/candidates/overlay.the-stack.surface-brief",
      "reviewUri": "canon://overlays/intake/overlay.the-stack",
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
            "template.canon-project-overlay-manifest: Canon Project Overlay Manifest",
            "template.canon-extension-intake: Canon Extension Intake Template",
            "template.canon-project-overlay-template-pack: Canon Project Overlay Template Pack",
            "template.atlas-development-handoff: Atlas Development Handoff Template",
            "token.canon-core: Canon Core Tokens"
          ],
          "instructions": "Record the selected Canon registry item id or the new id to create."
        },
        {
          "id": "exportPath",
          "label": "Export Path",
          "required": true,
          "value": null,
          "hints": [
            "./modality-readiness: registry-covered / registry-artifact",
            "./codification: registry-covered / registry-artifact",
            "./mcp-snapshot: registry-covered / registry-artifact",
            "./overlays/intake: registry-covered / registry-artifact",
            "./registry: registry-covered / registry-artifact"
          ],
          "instructions": "Record the package export path that implementation should add or update."
        },
        {
          "id": "exportName",
          "label": "Export Name",
          "required": false,
          "value": null,
          "hints": [
            "./modality-readiness: registry-covered / registry-artifact",
            "./codification: registry-covered / registry-artifact",
            "./mcp-snapshot: registry-covered / registry-artifact",
            "./overlays/intake: registry-covered / registry-artifact",
            "./registry: registry-covered / registry-artifact"
          ],
          "instructions": "Record the named export when the target is a symbol-level export."
        },
        {
          "id": "docsPath",
          "label": "Docs Path",
          "required": true,
          "value": null,
          "hints": [
            "/canon/resources/registry",
            "/canon/resources/tokens"
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
            "score": 32,
            "reason": "Matches requested kind and overlaps 5 requested modalities."
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
            "score": 31,
            "reason": "Matches requested kind and overlaps 5 requested modalities."
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
            "score": 30,
            "reason": "Matches requested kind and overlaps 5 requested modalities."
          },
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
            "score": 29,
            "reason": "Matches requested kind and overlaps 5 requested modalities."
          },
          {
            "id": "token.canon-core",
            "name": "Canon Core Tokens",
            "kind": "token",
            "maturity": "stable",
            "modalities": [
              "web",
              "app",
              "chat",
              "voice",
              "glasses"
            ],
            "docsPath": "/canon/resources/tokens",
            "score": 20,
            "reason": "Overlaps 5 requested modalities."
          }
        ],
        "exportPolicies": [
          {
            "exportPath": "./modality-readiness",
            "classification": "registry-artifact",
            "registryPolicy": "registry-covered",
            "score": 15,
            "rationale": "Modality readiness report audits web, chat, app, voice, and glasses implementation evidence from registry and overlay inventory.",
            "registryItemIds": [
              "template.canon-project-overlay-manifest",
              "template.canon-extension-intake"
            ]
          },
          {
            "exportPath": "./codification",
            "classification": "registry-artifact",
            "registryPolicy": "registry-covered",
            "score": 12,
            "rationale": "Codification audit classifies repo UI files by Canon ownership, direct import, overlay governance, or explicit local exemption.",
            "registryItemIds": [
              "template.canon-project-overlay-manifest",
              "template.canon-extension-intake"
            ]
          },
          {
            "exportPath": "./mcp-snapshot",
            "classification": "registry-artifact",
            "registryPolicy": "registry-covered",
            "score": 12,
            "rationale": "MCP snapshot bundles Canon registry, overlays, candidate review, and readiness artifacts for agent-facing consumers.",
            "registryItemIds": [
              "template.canon-project-overlay-template-pack",
              "template.canon-project-overlay-manifest",
              "template.canon-extension-intake"
            ]
          },
          {
            "exportPath": "./overlays/intake",
            "classification": "registry-artifact",
            "registryPolicy": "registry-covered",
            "score": 12,
            "rationale": "Overlay intake inventory scans project overlay manifests and routes extension-intake evidence without promoting primitives automatically.",
            "registryItemIds": [
              "template.canon-extension-intake"
            ]
          },
          {
            "exportPath": "./registry",
            "classification": "registry-artifact",
            "registryPolicy": "registry-covered",
            "score": 12,
            "rationale": "Registry API is the Canon source of truth for discoverable artifacts and lifecycle rules.",
            "registryItemIds": [
              "template.canon-extension-intake",
              "template.canon-project-overlay-manifest"
            ]
          }
        ],
        "docsPaths": [
          "/canon/resources/registry",
          "/canon/resources/tokens"
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
      "id": "canon-overlay-candidate-promotion-approval-record:overlay.app-governance-dashboard.surface-brief",
      "readinessReportId": "canon-overlay-candidate-promotion-readiness:overlay.app-governance-dashboard.surface-brief",
      "planId": "canon-overlay-candidate-promotion-plan:overlay.app-governance-dashboard.surface-brief",
      "candidateId": "overlay.app-governance-dashboard:overlay.app-governance-dashboard.surface-brief",
      "intakeId": "overlay.app-governance-dashboard.surface-brief",
      "title": "Surface Brief Template approval record",
      "summary": "A reusable project-overlay brief for documenting workflow state, Canon reuse, local artifacts, evidence, and extension-intake needs. This readiness report compares the plan with current Canon registry and public export policy snapshots before implementation starts. Fill this record before implementation starts; every target remains unset until a maintainer records an explicit choice.",
      "state": "approval-required",
      "approvalUri": "canon://overlays/candidates/overlay.app-governance-dashboard.surface-brief/approval-record",
      "readinessUri": "canon://overlays/candidates/overlay.app-governance-dashboard.surface-brief/readiness",
      "planUri": "canon://overlays/candidates/overlay.app-governance-dashboard.surface-brief/promotion-plan",
      "handoffUri": "canon://overlays/candidates/overlay.app-governance-dashboard.surface-brief/handoff",
      "candidateUri": "canon://overlays/candidates/overlay.app-governance-dashboard.surface-brief",
      "reviewUri": "canon://overlays/intake/overlay.app-governance-dashboard",
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
            "template.canon-project-overlay-manifest: Canon Project Overlay Manifest",
            "template.canon-extension-intake: Canon Extension Intake Template",
            "template.canon-project-overlay-template-pack: Canon Project Overlay Template Pack",
            "template.atlas-development-handoff: Atlas Development Handoff Template",
            "component.triad-health: TriadHealth"
          ],
          "instructions": "Record the selected Canon registry item id or the new id to create."
        },
        {
          "id": "exportPath",
          "label": "Export Path",
          "required": true,
          "value": null,
          "hints": [
            "./codification: registry-covered / registry-artifact",
            "./modality-readiness: registry-covered / registry-artifact",
            "./mcp-snapshot: registry-covered / registry-artifact",
            "./overlays/intake: registry-covered / registry-artifact",
            "./registry: registry-covered / registry-artifact"
          ],
          "instructions": "Record the package export path that implementation should add or update."
        },
        {
          "id": "exportName",
          "label": "Export Name",
          "required": false,
          "value": null,
          "hints": [
            "./codification: registry-covered / registry-artifact",
            "./modality-readiness: registry-covered / registry-artifact",
            "./mcp-snapshot: registry-covered / registry-artifact",
            "./overlays/intake: registry-covered / registry-artifact",
            "./registry: registry-covered / registry-artifact"
          ],
          "instructions": "Record the named export when the target is a symbol-level export."
        },
        {
          "id": "docsPath",
          "label": "Docs Path",
          "required": true,
          "value": null,
          "hints": [
            "/canon/components",
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
            "score": 32,
            "reason": "Matches requested kind and overlaps 5 requested modalities."
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
            "score": 31,
            "reason": "Matches requested kind and overlaps 5 requested modalities."
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
            "score": 30,
            "reason": "Matches requested kind and overlaps 5 requested modalities."
          },
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
            "score": 27,
            "reason": "Matches requested kind and overlaps 5 requested modalities."
          },
          {
            "id": "component.triad-health",
            "name": "TriadHealth",
            "kind": "component",
            "maturity": "stable",
            "modalities": [
              "web",
              "app",
              "chat",
              "voice",
              "glasses"
            ],
            "docsPath": "/canon/components",
            "score": 19,
            "reason": "Overlaps 5 requested modalities."
          }
        ],
        "exportPolicies": [
          {
            "exportPath": "./codification",
            "classification": "registry-artifact",
            "registryPolicy": "registry-covered",
            "score": 15,
            "rationale": "Codification audit classifies repo UI files by Canon ownership, direct import, overlay governance, or explicit local exemption.",
            "registryItemIds": [
              "template.canon-project-overlay-manifest",
              "template.canon-extension-intake"
            ]
          },
          {
            "exportPath": "./modality-readiness",
            "classification": "registry-artifact",
            "registryPolicy": "registry-covered",
            "score": 15,
            "rationale": "Modality readiness report audits web, chat, app, voice, and glasses implementation evidence from registry and overlay inventory.",
            "registryItemIds": [
              "template.canon-project-overlay-manifest",
              "template.canon-extension-intake"
            ]
          },
          {
            "exportPath": "./mcp-snapshot",
            "classification": "registry-artifact",
            "registryPolicy": "registry-covered",
            "score": 12,
            "rationale": "MCP snapshot bundles Canon registry, overlays, candidate review, and readiness artifacts for agent-facing consumers.",
            "registryItemIds": [
              "template.canon-project-overlay-template-pack",
              "template.canon-project-overlay-manifest",
              "template.canon-extension-intake"
            ]
          },
          {
            "exportPath": "./overlays/intake",
            "classification": "registry-artifact",
            "registryPolicy": "registry-covered",
            "score": 12,
            "rationale": "Overlay intake inventory scans project overlay manifests and routes extension-intake evidence without promoting primitives automatically.",
            "registryItemIds": [
              "template.canon-extension-intake"
            ]
          },
          {
            "exportPath": "./registry",
            "classification": "registry-artifact",
            "registryPolicy": "registry-covered",
            "score": 12,
            "rationale": "Registry API is the Canon source of truth for discoverable artifacts and lifecycle rules.",
            "registryItemIds": [
              "template.canon-extension-intake",
              "template.canon-project-overlay-manifest"
            ]
          }
        ],
        "docsPaths": [
          "/canon/components",
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
      "id": "canon-overlay-candidate-promotion-approval-record:overlay.app-governance-desktop.surface-brief",
      "readinessReportId": "canon-overlay-candidate-promotion-readiness:overlay.app-governance-desktop.surface-brief",
      "planId": "canon-overlay-candidate-promotion-plan:overlay.app-governance-desktop.surface-brief",
      "candidateId": "overlay.app-governance-desktop:overlay.app-governance-desktop.surface-brief",
      "intakeId": "overlay.app-governance-desktop.surface-brief",
      "title": "Surface Brief Template approval record",
      "summary": "A reusable project-overlay brief for documenting workflow state, Canon reuse, local artifacts, evidence, and extension-intake needs. This readiness report compares the plan with current Canon registry and public export policy snapshots before implementation starts. Fill this record before implementation starts; every target remains unset until a maintainer records an explicit choice.",
      "state": "approval-required",
      "approvalUri": "canon://overlays/candidates/overlay.app-governance-desktop.surface-brief/approval-record",
      "readinessUri": "canon://overlays/candidates/overlay.app-governance-desktop.surface-brief/readiness",
      "planUri": "canon://overlays/candidates/overlay.app-governance-desktop.surface-brief/promotion-plan",
      "handoffUri": "canon://overlays/candidates/overlay.app-governance-desktop.surface-brief/handoff",
      "candidateUri": "canon://overlays/candidates/overlay.app-governance-desktop.surface-brief",
      "reviewUri": "canon://overlays/intake/overlay.app-governance-desktop",
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
            "template.canon-project-overlay-manifest: Canon Project Overlay Manifest",
            "template.canon-extension-intake: Canon Extension Intake Template",
            "template.canon-project-overlay-template-pack: Canon Project Overlay Template Pack",
            "template.atlas-development-handoff: Atlas Development Handoff Template",
            "component.triad-health: TriadHealth"
          ],
          "instructions": "Record the selected Canon registry item id or the new id to create."
        },
        {
          "id": "exportPath",
          "label": "Export Path",
          "required": true,
          "value": null,
          "hints": [
            "./codification: registry-covered / registry-artifact",
            "./modality-readiness: registry-covered / registry-artifact",
            "./mcp-snapshot: registry-covered / registry-artifact",
            "./overlays/intake: registry-covered / registry-artifact",
            "./registry: registry-covered / registry-artifact"
          ],
          "instructions": "Record the package export path that implementation should add or update."
        },
        {
          "id": "exportName",
          "label": "Export Name",
          "required": false,
          "value": null,
          "hints": [
            "./codification: registry-covered / registry-artifact",
            "./modality-readiness: registry-covered / registry-artifact",
            "./mcp-snapshot: registry-covered / registry-artifact",
            "./overlays/intake: registry-covered / registry-artifact",
            "./registry: registry-covered / registry-artifact"
          ],
          "instructions": "Record the named export when the target is a symbol-level export."
        },
        {
          "id": "docsPath",
          "label": "Docs Path",
          "required": true,
          "value": null,
          "hints": [
            "/canon/components",
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
            "score": 32,
            "reason": "Matches requested kind and overlaps 5 requested modalities."
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
            "score": 31,
            "reason": "Matches requested kind and overlaps 5 requested modalities."
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
            "score": 30,
            "reason": "Matches requested kind and overlaps 5 requested modalities."
          },
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
            "score": 27,
            "reason": "Matches requested kind and overlaps 5 requested modalities."
          },
          {
            "id": "component.triad-health",
            "name": "TriadHealth",
            "kind": "component",
            "maturity": "stable",
            "modalities": [
              "web",
              "app",
              "chat",
              "voice",
              "glasses"
            ],
            "docsPath": "/canon/components",
            "score": 19,
            "reason": "Overlaps 5 requested modalities."
          }
        ],
        "exportPolicies": [
          {
            "exportPath": "./codification",
            "classification": "registry-artifact",
            "registryPolicy": "registry-covered",
            "score": 15,
            "rationale": "Codification audit classifies repo UI files by Canon ownership, direct import, overlay governance, or explicit local exemption.",
            "registryItemIds": [
              "template.canon-project-overlay-manifest",
              "template.canon-extension-intake"
            ]
          },
          {
            "exportPath": "./modality-readiness",
            "classification": "registry-artifact",
            "registryPolicy": "registry-covered",
            "score": 15,
            "rationale": "Modality readiness report audits web, chat, app, voice, and glasses implementation evidence from registry and overlay inventory.",
            "registryItemIds": [
              "template.canon-project-overlay-manifest",
              "template.canon-extension-intake"
            ]
          },
          {
            "exportPath": "./mcp-snapshot",
            "classification": "registry-artifact",
            "registryPolicy": "registry-covered",
            "score": 12,
            "rationale": "MCP snapshot bundles Canon registry, overlays, candidate review, and readiness artifacts for agent-facing consumers.",
            "registryItemIds": [
              "template.canon-project-overlay-template-pack",
              "template.canon-project-overlay-manifest",
              "template.canon-extension-intake"
            ]
          },
          {
            "exportPath": "./overlays/intake",
            "classification": "registry-artifact",
            "registryPolicy": "registry-covered",
            "score": 12,
            "rationale": "Overlay intake inventory scans project overlay manifests and routes extension-intake evidence without promoting primitives automatically.",
            "registryItemIds": [
              "template.canon-extension-intake"
            ]
          },
          {
            "exportPath": "./registry",
            "classification": "registry-artifact",
            "registryPolicy": "registry-covered",
            "score": 12,
            "rationale": "Registry API is the Canon source of truth for discoverable artifacts and lifecycle rules.",
            "registryItemIds": [
              "template.canon-extension-intake",
              "template.canon-project-overlay-manifest"
            ]
          }
        ],
        "docsPaths": [
          "/canon/components",
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
      "id": "canon-overlay-candidate-promotion-approval-record:overlay.clearway-conversion.surface-brief",
      "readinessReportId": "canon-overlay-candidate-promotion-readiness:overlay.clearway-conversion.surface-brief",
      "planId": "canon-overlay-candidate-promotion-plan:overlay.clearway-conversion.surface-brief",
      "candidateId": "overlay.clearway-conversion:overlay.clearway-conversion.surface-brief",
      "intakeId": "overlay.clearway-conversion.surface-brief",
      "title": "Conversion booking and embed surface approval record",
      "summary": "A candidate Canon conversion template for booking flows, developer embeds, admin receipts, and concise operator handoffs without turning Clearway-specific scheduling copy into Canon primitives. This readiness report compares the plan with current Canon registry and public export policy snapshots before implementation starts. Fill this record before implementation starts; every target remains unset until a maintainer records an explicit choice.",
      "state": "approval-required",
      "approvalUri": "canon://overlays/candidates/overlay.clearway-conversion.surface-brief/approval-record",
      "readinessUri": "canon://overlays/candidates/overlay.clearway-conversion.surface-brief/readiness",
      "planUri": "canon://overlays/candidates/overlay.clearway-conversion.surface-brief/promotion-plan",
      "handoffUri": "canon://overlays/candidates/overlay.clearway-conversion.surface-brief/handoff",
      "candidateUri": "canon://overlays/candidates/overlay.clearway-conversion.surface-brief",
      "reviewUri": "canon://overlays/intake/overlay.clearway-conversion",
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
            "template.canon-project-overlay-manifest: Canon Project Overlay Manifest",
            "template.atlas-development-handoff: Atlas Development Handoff Template",
            "template.canon-project-overlay-template-pack: Canon Project Overlay Template Pack",
            "template.canon-extension-intake: Canon Extension Intake Template",
            "component.conversion-metric-counters: MetricCounters"
          ],
          "instructions": "Record the selected Canon registry item id or the new id to create."
        },
        {
          "id": "exportPath",
          "label": "Export Path",
          "required": true,
          "value": null,
          "hints": [
            "./modality-readiness: registry-covered / registry-artifact",
            "./overlays/intake: registry-covered / registry-artifact",
            "./components#PropertyFunnel: candidate-review / platform-surface",
            "./conversion: candidate-review / composition-pattern",
            "./components#TriadHealth: candidate-review / domain-specific"
          ],
          "instructions": "Record the package export path that implementation should add or update."
        },
        {
          "id": "exportName",
          "label": "Export Name",
          "required": false,
          "value": null,
          "hints": [
            "./modality-readiness: registry-covered / registry-artifact",
            "./overlays/intake: registry-covered / registry-artifact",
            "./components#PropertyFunnel: candidate-review / platform-surface",
            "./conversion: candidate-review / composition-pattern",
            "./components#TriadHealth: candidate-review / domain-specific"
          ],
          "instructions": "Record the named export when the target is a symbol-level export."
        },
        {
          "id": "docsPath",
          "label": "Docs Path",
          "required": true,
          "value": null,
          "hints": [
            "/canon/components/conversion",
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
            "score": 25,
            "reason": "Matches requested kind and overlaps 5 requested modalities."
          },
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
            "score": 24,
            "reason": "Matches requested kind and overlaps 5 requested modalities."
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
            "score": 24,
            "reason": "Matches requested kind and overlaps 5 requested modalities."
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
            "score": 23,
            "reason": "Matches requested kind and overlaps 5 requested modalities."
          },
          {
            "id": "component.conversion-metric-counters",
            "name": "MetricCounters",
            "kind": "component",
            "maturity": "stable",
            "modalities": [
              "web",
              "app",
              "chat",
              "voice",
              "glasses"
            ],
            "docsPath": "/canon/components/conversion",
            "score": 18,
            "reason": "Overlaps 5 requested modalities."
          }
        ],
        "exportPolicies": [
          {
            "exportPath": "./modality-readiness",
            "classification": "registry-artifact",
            "registryPolicy": "registry-covered",
            "score": 9,
            "rationale": "Modality readiness report audits web, chat, app, voice, and glasses implementation evidence from registry and overlay inventory.",
            "registryItemIds": [
              "template.canon-project-overlay-manifest",
              "template.canon-extension-intake"
            ]
          },
          {
            "exportPath": "./overlays/intake",
            "classification": "registry-artifact",
            "registryPolicy": "registry-covered",
            "score": 9,
            "rationale": "Overlay intake inventory scans project overlay manifests and routes extension-intake evidence without promoting primitives automatically.",
            "registryItemIds": [
              "template.canon-extension-intake"
            ]
          },
          {
            "exportPath": "./components",
            "classification": "platform-surface",
            "registryPolicy": "candidate-review",
            "score": 8,
            "rationale": "Property conversion surface; needs funnel policy before becoming stable registry UI.",
            "exportName": "PropertyFunnel"
          },
          {
            "exportPath": "./conversion",
            "classification": "composition-pattern",
            "registryPolicy": "candidate-review",
            "score": 8,
            "rationale": "Conversion components need proof/receipt and property-policy contracts before promotion."
          },
          {
            "exportPath": "./components",
            "classification": "domain-specific",
            "registryPolicy": "candidate-review",
            "score": 7,
            "rationale": "CREATE SOMETHING framework display; needs governance-pattern contract before promotion.",
            "exportName": "TriadHealth"
          }
        ],
        "docsPaths": [
          "/canon/components/conversion",
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
      "id": "canon-overlay-candidate-promotion-approval-record:overlay.concierge-chat-staffing.surface-brief",
      "readinessReportId": "canon-overlay-candidate-promotion-readiness:overlay.concierge-chat-staffing.surface-brief",
      "planId": "canon-overlay-candidate-promotion-plan:overlay.concierge-chat-staffing.surface-brief",
      "candidateId": "overlay.concierge-chat-staffing:overlay.concierge-chat-staffing.surface-brief",
      "intakeId": "overlay.concierge-chat-staffing.surface-brief",
      "title": "Staffing concierge chat surface approval record",
      "summary": "A candidate Canon concierge template for governed chat, staffing intake, job matching, profile receipts, and operator settings without promoting one staffing vertical into Canon stable. This readiness report compares the plan with current Canon registry and public export policy snapshots before implementation starts. Fill this record before implementation starts; every target remains unset until a maintainer records an explicit choice.",
      "state": "approval-required",
      "approvalUri": "canon://overlays/candidates/overlay.concierge-chat-staffing.surface-brief/approval-record",
      "readinessUri": "canon://overlays/candidates/overlay.concierge-chat-staffing.surface-brief/readiness",
      "planUri": "canon://overlays/candidates/overlay.concierge-chat-staffing.surface-brief/promotion-plan",
      "handoffUri": "canon://overlays/candidates/overlay.concierge-chat-staffing.surface-brief/handoff",
      "candidateUri": "canon://overlays/candidates/overlay.concierge-chat-staffing.surface-brief",
      "reviewUri": "canon://overlays/intake/overlay.concierge-chat-staffing",
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
            "template.canon-extension-intake: Canon Extension Intake Template",
            "template.atlas-development-handoff: Atlas Development Handoff Template",
            "template.canon-project-overlay-manifest: Canon Project Overlay Manifest",
            "template.canon-project-overlay-template-pack: Canon Project Overlay Template Pack",
            "component.catalog-card: CatalogCard"
          ],
          "instructions": "Record the selected Canon registry item id or the new id to create."
        },
        {
          "id": "exportPath",
          "label": "Export Path",
          "required": true,
          "value": null,
          "hints": [
            "./modality-readiness: registry-covered / registry-artifact",
            "./overlays/intake: registry-covered / registry-artifact",
            "./mcp-snapshot: registry-covered / registry-artifact",
            "./codification: registry-covered / registry-artifact",
            "./components/data: candidate-review / stable-foundation-candidate"
          ],
          "instructions": "Record the package export path that implementation should add or update."
        },
        {
          "id": "exportName",
          "label": "Export Name",
          "required": false,
          "value": null,
          "hints": [
            "./modality-readiness: registry-covered / registry-artifact",
            "./overlays/intake: registry-covered / registry-artifact",
            "./mcp-snapshot: registry-covered / registry-artifact",
            "./codification: registry-covered / registry-artifact",
            "./components/data: candidate-review / stable-foundation-candidate"
          ],
          "instructions": "Record the named export when the target is a symbol-level export."
        },
        {
          "id": "docsPath",
          "label": "Docs Path",
          "required": true,
          "value": null,
          "hints": [
            "/canon/components",
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
            "score": 31,
            "reason": "Matches requested kind and overlaps 5 requested modalities."
          },
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
            "reason": "Matches requested kind and overlaps 5 requested modalities."
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
            "score": 30,
            "reason": "Matches requested kind and overlaps 5 requested modalities."
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
            "score": 30,
            "reason": "Matches requested kind and overlaps 5 requested modalities."
          },
          {
            "id": "component.catalog-card",
            "name": "CatalogCard",
            "kind": "component",
            "maturity": "stable",
            "modalities": [
              "web",
              "app",
              "chat",
              "voice",
              "glasses"
            ],
            "docsPath": "/canon/components",
            "score": 23,
            "reason": "Overlaps 5 requested modalities."
          }
        ],
        "exportPolicies": [
          {
            "exportPath": "./modality-readiness",
            "classification": "registry-artifact",
            "registryPolicy": "registry-covered",
            "score": 16,
            "rationale": "Modality readiness report audits web, chat, app, voice, and glasses implementation evidence from registry and overlay inventory.",
            "registryItemIds": [
              "template.canon-project-overlay-manifest",
              "template.canon-extension-intake"
            ]
          },
          {
            "exportPath": "./overlays/intake",
            "classification": "registry-artifact",
            "registryPolicy": "registry-covered",
            "score": 10,
            "rationale": "Overlay intake inventory scans project overlay manifests and routes extension-intake evidence without promoting primitives automatically.",
            "registryItemIds": [
              "template.canon-extension-intake"
            ]
          },
          {
            "exportPath": "./mcp-snapshot",
            "classification": "registry-artifact",
            "registryPolicy": "registry-covered",
            "score": 8,
            "rationale": "MCP snapshot bundles Canon registry, overlays, candidate review, and readiness artifacts for agent-facing consumers.",
            "registryItemIds": [
              "template.canon-project-overlay-template-pack",
              "template.canon-project-overlay-manifest",
              "template.canon-extension-intake"
            ]
          },
          {
            "exportPath": "./codification",
            "classification": "registry-artifact",
            "registryPolicy": "registry-covered",
            "score": 7,
            "rationale": "Codification audit classifies repo UI files by Canon ownership, direct import, overlay governance, or explicit local exemption.",
            "registryItemIds": [
              "template.canon-project-overlay-manifest",
              "template.canon-extension-intake"
            ]
          },
          {
            "exportPath": "./components/data",
            "classification": "stable-foundation-candidate",
            "registryPolicy": "candidate-review",
            "score": 7,
            "rationale": "Database-layer primitives barrel (docs/CANON_DATABASE_LAYER_DESIGN.md); components stay in candidate review until a second consuming surface exists."
          }
        ],
        "docsPaths": [
          "/canon/components",
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
      "id": "canon-overlay-candidate-promotion-approval-record:overlay.io-research-artifact.surface-brief",
      "readinessReportId": "canon-overlay-candidate-promotion-readiness:overlay.io-research-artifact.surface-brief",
      "planId": "canon-overlay-candidate-promotion-plan:overlay.io-research-artifact.surface-brief",
      "candidateId": "overlay.io-research-artifact:overlay.io-research-artifact.surface-brief",
      "intakeId": "overlay.io-research-artifact.surface-brief",
      "title": "Research artifact proof surface approval record",
      "summary": "A candidate Canon research-artifact template for publishing MCP papers, plugin references, visual summaries, and agent-readable source metadata without promoting one article's content into Canon stable. This readiness report compares the plan with current Canon registry and public export policy snapshots before implementation starts. Fill this record before implementation starts; every target remains unset until a maintainer records an explicit choice.",
      "state": "approval-required",
      "approvalUri": "canon://overlays/candidates/overlay.io-research-artifact.surface-brief/approval-record",
      "readinessUri": "canon://overlays/candidates/overlay.io-research-artifact.surface-brief/readiness",
      "planUri": "canon://overlays/candidates/overlay.io-research-artifact.surface-brief/promotion-plan",
      "handoffUri": "canon://overlays/candidates/overlay.io-research-artifact.surface-brief/handoff",
      "candidateUri": "canon://overlays/candidates/overlay.io-research-artifact.surface-brief",
      "reviewUri": "canon://overlays/intake/overlay.io-research-artifact",
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
            "template.canon-extension-intake: Canon Extension Intake Template",
            "component.catalog-card: CatalogCard"
          ],
          "instructions": "Record the selected Canon registry item id or the new id to create."
        },
        {
          "id": "exportPath",
          "label": "Export Path",
          "required": true,
          "value": null,
          "hints": [
            "./modality-readiness: registry-covered / registry-artifact",
            "./mcp-snapshot: registry-covered / registry-artifact",
            "./overlays/intake: registry-covered / registry-artifact",
            "./components#PapersGrid: candidate-review / content-utility",
            "./registry: registry-covered / registry-artifact"
          ],
          "instructions": "Record the package export path that implementation should add or update."
        },
        {
          "id": "exportName",
          "label": "Export Name",
          "required": false,
          "value": null,
          "hints": [
            "./modality-readiness: registry-covered / registry-artifact",
            "./mcp-snapshot: registry-covered / registry-artifact",
            "./overlays/intake: registry-covered / registry-artifact",
            "./components#PapersGrid: candidate-review / content-utility",
            "./registry: registry-covered / registry-artifact"
          ],
          "instructions": "Record the named export when the target is a symbol-level export."
        },
        {
          "id": "docsPath",
          "label": "Docs Path",
          "required": true,
          "value": null,
          "hints": [
            "/canon/components",
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
            "score": 33,
            "reason": "Matches requested kind and overlaps 5 requested modalities."
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
            "score": 32,
            "reason": "Matches requested kind and overlaps 5 requested modalities."
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
            "score": 31,
            "reason": "Matches requested kind and overlaps 5 requested modalities."
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
            "score": 27,
            "reason": "Matches requested kind and overlaps 5 requested modalities."
          },
          {
            "id": "component.catalog-card",
            "name": "CatalogCard",
            "kind": "component",
            "maturity": "stable",
            "modalities": [
              "web",
              "app",
              "chat",
              "voice",
              "glasses"
            ],
            "docsPath": "/canon/components",
            "score": 22,
            "reason": "Overlaps 5 requested modalities."
          }
        ],
        "exportPolicies": [
          {
            "exportPath": "./modality-readiness",
            "classification": "registry-artifact",
            "registryPolicy": "registry-covered",
            "score": 13,
            "rationale": "Modality readiness report audits web, chat, app, voice, and glasses implementation evidence from registry and overlay inventory.",
            "registryItemIds": [
              "template.canon-project-overlay-manifest",
              "template.canon-extension-intake"
            ]
          },
          {
            "exportPath": "./mcp-snapshot",
            "classification": "registry-artifact",
            "registryPolicy": "registry-covered",
            "score": 12,
            "rationale": "MCP snapshot bundles Canon registry, overlays, candidate review, and readiness artifacts for agent-facing consumers.",
            "registryItemIds": [
              "template.canon-project-overlay-template-pack",
              "template.canon-project-overlay-manifest",
              "template.canon-extension-intake"
            ]
          },
          {
            "exportPath": "./overlays/intake",
            "classification": "registry-artifact",
            "registryPolicy": "registry-covered",
            "score": 12,
            "rationale": "Overlay intake inventory scans project overlay manifests and routes extension-intake evidence without promoting primitives automatically.",
            "registryItemIds": [
              "template.canon-extension-intake"
            ]
          },
          {
            "exportPath": "./components",
            "classification": "content-utility",
            "registryPolicy": "candidate-review",
            "score": 11,
            "rationale": "Research content collection layout, not yet a general Canon grid contract.",
            "exportName": "PapersGrid"
          },
          {
            "exportPath": "./registry",
            "classification": "registry-artifact",
            "registryPolicy": "registry-covered",
            "score": 11,
            "rationale": "Registry API is the Canon source of truth for discoverable artifacts and lifecycle rules.",
            "registryItemIds": [
              "template.canon-extension-intake",
              "template.canon-project-overlay-manifest"
            ]
          }
        ],
        "docsPaths": [
          "/canon/components",
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
            "template.canon-project-overlay-template-pack: Canon Project Overlay Template Pack",
            "template.canon-extension-intake: Canon Extension Intake Template",
            "template.canon-project-overlay-manifest: Canon Project Overlay Manifest",
            "template.web-governed-workflow: Web Governed Workflow Template"
          ],
          "instructions": "Record the selected Canon registry item id or the new id to create."
        },
        {
          "id": "exportPath",
          "label": "Export Path",
          "required": true,
          "value": null,
          "hints": [
            "./modality-readiness: registry-covered / registry-artifact",
            "./insights: candidate-review / content-utility",
            "./interactive#IntegrationFlow: candidate-review / composition-pattern",
            "./overlays/intake: registry-covered / registry-artifact",
            "./components#PapersGrid: candidate-review / content-utility"
          ],
          "instructions": "Record the package export path that implementation should add or update."
        },
        {
          "id": "exportName",
          "label": "Export Name",
          "required": false,
          "value": null,
          "hints": [
            "./modality-readiness: registry-covered / registry-artifact",
            "./insights: candidate-review / content-utility",
            "./interactive#IntegrationFlow: candidate-review / composition-pattern",
            "./overlays/intake: registry-covered / registry-artifact",
            "./components#PapersGrid: candidate-review / content-utility"
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
            "score": 32,
            "reason": "Matches requested kind and overlaps 5 requested modalities."
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
            "score": 27,
            "reason": "Matches requested kind and overlaps 5 requested modalities."
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
            "score": 26,
            "reason": "Matches requested kind and overlaps 5 requested modalities."
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
            "score": 26,
            "reason": "Matches requested kind and overlaps 5 requested modalities."
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
          }
        ],
        "exportPolicies": [
          {
            "exportPath": "./modality-readiness",
            "classification": "registry-artifact",
            "registryPolicy": "registry-covered",
            "score": 9,
            "rationale": "Modality readiness report audits web, chat, app, voice, and glasses implementation evidence from registry and overlay inventory.",
            "registryItemIds": [
              "template.canon-project-overlay-manifest",
              "template.canon-extension-intake"
            ]
          },
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
    },
    {
      "id": "canon-overlay-candidate-promotion-approval-record:overlay.ltd-canon-philosophy.surface-brief",
      "readinessReportId": "canon-overlay-candidate-promotion-readiness:overlay.ltd-canon-philosophy.surface-brief",
      "planId": "canon-overlay-candidate-promotion-plan:overlay.ltd-canon-philosophy.surface-brief",
      "candidateId": "overlay.ltd-canon-philosophy:overlay.ltd-canon-philosophy.surface-brief",
      "intakeId": "overlay.ltd-canon-philosophy.surface-brief",
      "title": "Canon philosophy documentation surface approval record",
      "summary": "A candidate Canon documentation template for turning philosophy, standards, voice, and live Canon docs into one reusable cross-property foundation surface without forking Canon primitives. This readiness report compares the plan with current Canon registry and public export policy snapshots before implementation starts. Fill this record before implementation starts; every target remains unset until a maintainer records an explicit choice.",
      "state": "approval-required",
      "approvalUri": "canon://overlays/candidates/overlay.ltd-canon-philosophy.surface-brief/approval-record",
      "readinessUri": "canon://overlays/candidates/overlay.ltd-canon-philosophy.surface-brief/readiness",
      "planUri": "canon://overlays/candidates/overlay.ltd-canon-philosophy.surface-brief/promotion-plan",
      "handoffUri": "canon://overlays/candidates/overlay.ltd-canon-philosophy.surface-brief/handoff",
      "candidateUri": "canon://overlays/candidates/overlay.ltd-canon-philosophy.surface-brief",
      "reviewUri": "canon://overlays/intake/overlay.ltd-canon-philosophy",
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
            "template.canon-project-overlay-manifest: Canon Project Overlay Manifest",
            "template.atlas-development-handoff: Atlas Development Handoff Template",
            "template.canon-extension-intake: Canon Extension Intake Template",
            "template.canon-project-overlay-template-pack: Canon Project Overlay Template Pack",
            "component.catalog-card: CatalogCard"
          ],
          "instructions": "Record the selected Canon registry item id or the new id to create."
        },
        {
          "id": "exportPath",
          "label": "Export Path",
          "required": true,
          "value": null,
          "hints": [
            "./components/data: candidate-review / stable-foundation-candidate",
            "./modality-readiness: registry-covered / registry-artifact",
            "./overlays/intake: registry-covered / registry-artifact",
            "./mcp-snapshot: registry-covered / registry-artifact",
            "./codification: registry-covered / registry-artifact"
          ],
          "instructions": "Record the package export path that implementation should add or update."
        },
        {
          "id": "exportName",
          "label": "Export Name",
          "required": false,
          "value": null,
          "hints": [
            "./components/data: candidate-review / stable-foundation-candidate",
            "./modality-readiness: registry-covered / registry-artifact",
            "./overlays/intake: registry-covered / registry-artifact",
            "./mcp-snapshot: registry-covered / registry-artifact",
            "./codification: registry-covered / registry-artifact"
          ],
          "instructions": "Record the named export when the target is a symbol-level export."
        },
        {
          "id": "docsPath",
          "label": "Docs Path",
          "required": true,
          "value": null,
          "hints": [
            "/canon/components",
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
            "score": 32,
            "reason": "Matches requested kind and overlaps 5 requested modalities."
          },
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
            "score": 31,
            "reason": "Matches requested kind and overlaps 5 requested modalities."
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
            "score": 31,
            "reason": "Matches requested kind and overlaps 5 requested modalities."
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
            "score": 30,
            "reason": "Matches requested kind and overlaps 5 requested modalities."
          },
          {
            "id": "component.catalog-card",
            "name": "CatalogCard",
            "kind": "component",
            "maturity": "stable",
            "modalities": [
              "web",
              "app",
              "chat",
              "voice",
              "glasses"
            ],
            "docsPath": "/canon/components",
            "score": 24,
            "reason": "Overlaps 5 requested modalities."
          }
        ],
        "exportPolicies": [
          {
            "exportPath": "./components/data",
            "classification": "stable-foundation-candidate",
            "registryPolicy": "candidate-review",
            "score": 15,
            "rationale": "Database-layer primitives barrel (docs/CANON_DATABASE_LAYER_DESIGN.md); components stay in candidate review until a second consuming surface exists."
          },
          {
            "exportPath": "./modality-readiness",
            "classification": "registry-artifact",
            "registryPolicy": "registry-covered",
            "score": 15,
            "rationale": "Modality readiness report audits web, chat, app, voice, and glasses implementation evidence from registry and overlay inventory.",
            "registryItemIds": [
              "template.canon-project-overlay-manifest",
              "template.canon-extension-intake"
            ]
          },
          {
            "exportPath": "./overlays/intake",
            "classification": "registry-artifact",
            "registryPolicy": "registry-covered",
            "score": 14,
            "rationale": "Overlay intake inventory scans project overlay manifests and routes extension-intake evidence without promoting primitives automatically.",
            "registryItemIds": [
              "template.canon-extension-intake"
            ]
          },
          {
            "exportPath": "./mcp-snapshot",
            "classification": "registry-artifact",
            "registryPolicy": "registry-covered",
            "score": 12,
            "rationale": "MCP snapshot bundles Canon registry, overlays, candidate review, and readiness artifacts for agent-facing consumers.",
            "registryItemIds": [
              "template.canon-project-overlay-template-pack",
              "template.canon-project-overlay-manifest",
              "template.canon-extension-intake"
            ]
          },
          {
            "exportPath": "./codification",
            "classification": "registry-artifact",
            "registryPolicy": "registry-covered",
            "score": 11,
            "rationale": "Codification audit classifies repo UI files by Canon ownership, direct import, overlay governance, or explicit local exemption.",
            "registryItemIds": [
              "template.canon-project-overlay-manifest",
              "template.canon-extension-intake"
            ]
          }
        ],
        "docsPaths": [
          "/canon/components",
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
      "id": "canon-overlay-candidate-promotion-approval-record:overlay.maverick-admin.surface-brief",
      "readinessReportId": "canon-overlay-candidate-promotion-readiness:overlay.maverick-admin.surface-brief",
      "planId": "canon-overlay-candidate-promotion-plan:overlay.maverick-admin.surface-brief",
      "candidateId": "overlay.maverick-admin:overlay.maverick-admin.surface-brief",
      "intakeId": "overlay.maverick-admin.surface-brief",
      "title": "Surface Brief Template approval record",
      "summary": "A reusable project-overlay brief for documenting workflow state, Canon reuse, local artifacts, evidence, and extension-intake needs. This readiness report compares the plan with current Canon registry and public export policy snapshots before implementation starts. Fill this record before implementation starts; every target remains unset until a maintainer records an explicit choice.",
      "state": "approval-required",
      "approvalUri": "canon://overlays/candidates/overlay.maverick-admin.surface-brief/approval-record",
      "readinessUri": "canon://overlays/candidates/overlay.maverick-admin.surface-brief/readiness",
      "planUri": "canon://overlays/candidates/overlay.maverick-admin.surface-brief/promotion-plan",
      "handoffUri": "canon://overlays/candidates/overlay.maverick-admin.surface-brief/handoff",
      "candidateUri": "canon://overlays/candidates/overlay.maverick-admin.surface-brief",
      "reviewUri": "canon://overlays/intake/overlay.maverick-admin",
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
            "template.canon-project-overlay-manifest: Canon Project Overlay Manifest",
            "template.canon-extension-intake: Canon Extension Intake Template",
            "template.atlas-development-handoff: Atlas Development Handoff Template",
            "template.canon-project-overlay-template-pack: Canon Project Overlay Template Pack",
            "token.canon-core: Canon Core Tokens"
          ],
          "instructions": "Record the selected Canon registry item id or the new id to create."
        },
        {
          "id": "exportPath",
          "label": "Export Path",
          "required": true,
          "value": null,
          "hints": [
            "./modality-readiness: registry-covered / registry-artifact",
            "./codification: registry-covered / registry-artifact",
            "./mcp-snapshot: registry-covered / registry-artifact",
            "./overlays/intake: registry-covered / registry-artifact",
            "./registry: registry-covered / registry-artifact"
          ],
          "instructions": "Record the package export path that implementation should add or update."
        },
        {
          "id": "exportName",
          "label": "Export Name",
          "required": false,
          "value": null,
          "hints": [
            "./modality-readiness: registry-covered / registry-artifact",
            "./codification: registry-covered / registry-artifact",
            "./mcp-snapshot: registry-covered / registry-artifact",
            "./overlays/intake: registry-covered / registry-artifact",
            "./registry: registry-covered / registry-artifact"
          ],
          "instructions": "Record the named export when the target is a symbol-level export."
        },
        {
          "id": "docsPath",
          "label": "Docs Path",
          "required": true,
          "value": null,
          "hints": [
            "/canon/resources/registry",
            "/canon/resources/tokens"
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
            "score": 31,
            "reason": "Matches requested kind and overlaps 5 requested modalities."
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
            "score": 30,
            "reason": "Matches requested kind and overlaps 5 requested modalities."
          },
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
            "score": 29,
            "reason": "Matches requested kind and overlaps 5 requested modalities."
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
            "score": 29,
            "reason": "Matches requested kind and overlaps 5 requested modalities."
          },
          {
            "id": "token.canon-core",
            "name": "Canon Core Tokens",
            "kind": "token",
            "maturity": "stable",
            "modalities": [
              "web",
              "app",
              "chat",
              "voice",
              "glasses"
            ],
            "docsPath": "/canon/resources/tokens",
            "score": 20,
            "reason": "Overlaps 5 requested modalities."
          }
        ],
        "exportPolicies": [
          {
            "exportPath": "./modality-readiness",
            "classification": "registry-artifact",
            "registryPolicy": "registry-covered",
            "score": 15,
            "rationale": "Modality readiness report audits web, chat, app, voice, and glasses implementation evidence from registry and overlay inventory.",
            "registryItemIds": [
              "template.canon-project-overlay-manifest",
              "template.canon-extension-intake"
            ]
          },
          {
            "exportPath": "./codification",
            "classification": "registry-artifact",
            "registryPolicy": "registry-covered",
            "score": 12,
            "rationale": "Codification audit classifies repo UI files by Canon ownership, direct import, overlay governance, or explicit local exemption.",
            "registryItemIds": [
              "template.canon-project-overlay-manifest",
              "template.canon-extension-intake"
            ]
          },
          {
            "exportPath": "./mcp-snapshot",
            "classification": "registry-artifact",
            "registryPolicy": "registry-covered",
            "score": 12,
            "rationale": "MCP snapshot bundles Canon registry, overlays, candidate review, and readiness artifacts for agent-facing consumers.",
            "registryItemIds": [
              "template.canon-project-overlay-template-pack",
              "template.canon-project-overlay-manifest",
              "template.canon-extension-intake"
            ]
          },
          {
            "exportPath": "./overlays/intake",
            "classification": "registry-artifact",
            "registryPolicy": "registry-covered",
            "score": 12,
            "rationale": "Overlay intake inventory scans project overlay manifests and routes extension-intake evidence without promoting primitives automatically.",
            "registryItemIds": [
              "template.canon-extension-intake"
            ]
          },
          {
            "exportPath": "./registry",
            "classification": "registry-artifact",
            "registryPolicy": "registry-covered",
            "score": 12,
            "rationale": "Registry API is the Canon source of truth for discoverable artifacts and lifecycle rules.",
            "registryItemIds": [
              "template.canon-extension-intake",
              "template.canon-project-overlay-manifest"
            ]
          }
        ],
        "docsPaths": [
          "/canon/resources/registry",
          "/canon/resources/tokens"
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
      "id": "canon-overlay-candidate-promotion-approval-record:overlay.maverick-industry.surface-brief",
      "readinessReportId": "canon-overlay-candidate-promotion-readiness:overlay.maverick-industry.surface-brief",
      "planId": "canon-overlay-candidate-promotion-plan:overlay.maverick-industry.surface-brief",
      "candidateId": "overlay.maverick-industry:overlay.maverick-industry.surface-brief",
      "intakeId": "overlay.maverick-industry.surface-brief",
      "title": "Industry service proof surface approval record",
      "summary": "A candidate Canon industry-service template for public sector pages, product proof, news context, and concise sales handoffs without promoting Maverick-specific claims into Canon. This readiness report compares the plan with current Canon registry and public export policy snapshots before implementation starts. Fill this record before implementation starts; every target remains unset until a maintainer records an explicit choice.",
      "state": "approval-required",
      "approvalUri": "canon://overlays/candidates/overlay.maverick-industry.surface-brief/approval-record",
      "readinessUri": "canon://overlays/candidates/overlay.maverick-industry.surface-brief/readiness",
      "planUri": "canon://overlays/candidates/overlay.maverick-industry.surface-brief/promotion-plan",
      "handoffUri": "canon://overlays/candidates/overlay.maverick-industry.surface-brief/handoff",
      "candidateUri": "canon://overlays/candidates/overlay.maverick-industry.surface-brief",
      "reviewUri": "canon://overlays/intake/overlay.maverick-industry",
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
            "template.canon-project-overlay-template-pack: Canon Project Overlay Template Pack",
            "template.canon-extension-intake: Canon Extension Intake Template",
            "template.canon-project-overlay-manifest: Canon Project Overlay Manifest",
            "component.conversion-metric-counters: MetricCounters"
          ],
          "instructions": "Record the selected Canon registry item id or the new id to create."
        },
        {
          "id": "exportPath",
          "label": "Export Path",
          "required": true,
          "value": null,
          "hints": [
            "./modality-readiness: registry-covered / registry-artifact",
            "./overlays/intake: registry-covered / registry-artifact",
            "./components#TriadHealth: candidate-review / domain-specific",
            "./filtering: candidate-review / composition-pattern",
            "./mcp-snapshot: registry-covered / registry-artifact"
          ],
          "instructions": "Record the package export path that implementation should add or update."
        },
        {
          "id": "exportName",
          "label": "Export Name",
          "required": false,
          "value": null,
          "hints": [
            "./modality-readiness: registry-covered / registry-artifact",
            "./overlays/intake: registry-covered / registry-artifact",
            "./components#TriadHealth: candidate-review / domain-specific",
            "./filtering: candidate-review / composition-pattern",
            "./mcp-snapshot: registry-covered / registry-artifact"
          ],
          "instructions": "Record the named export when the target is a symbol-level export."
        },
        {
          "id": "docsPath",
          "label": "Docs Path",
          "required": true,
          "value": null,
          "hints": [
            "/canon/components/conversion",
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
            "score": 27,
            "reason": "Matches requested kind and overlaps 5 requested modalities."
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
            "score": 26,
            "reason": "Matches requested kind and overlaps 5 requested modalities."
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
            "score": 25,
            "reason": "Matches requested kind and overlaps 5 requested modalities."
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
            "score": 25,
            "reason": "Matches requested kind and overlaps 5 requested modalities."
          },
          {
            "id": "component.conversion-metric-counters",
            "name": "MetricCounters",
            "kind": "component",
            "maturity": "stable",
            "modalities": [
              "web",
              "app",
              "chat",
              "voice",
              "glasses"
            ],
            "docsPath": "/canon/components/conversion",
            "score": 17,
            "reason": "Overlaps 5 requested modalities."
          }
        ],
        "exportPolicies": [
          {
            "exportPath": "./modality-readiness",
            "classification": "registry-artifact",
            "registryPolicy": "registry-covered",
            "score": 9,
            "rationale": "Modality readiness report audits web, chat, app, voice, and glasses implementation evidence from registry and overlay inventory.",
            "registryItemIds": [
              "template.canon-project-overlay-manifest",
              "template.canon-extension-intake"
            ]
          },
          {
            "exportPath": "./overlays/intake",
            "classification": "registry-artifact",
            "registryPolicy": "registry-covered",
            "score": 9,
            "rationale": "Overlay intake inventory scans project overlay manifests and routes extension-intake evidence without promoting primitives automatically.",
            "registryItemIds": [
              "template.canon-extension-intake"
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
            "exportPath": "./filtering",
            "classification": "composition-pattern",
            "registryPolicy": "candidate-review",
            "score": 7,
            "rationale": "Filtering surfaces may become templates/patterns after repeated product evidence."
          },
          {
            "exportPath": "./mcp-snapshot",
            "classification": "registry-artifact",
            "registryPolicy": "registry-covered",
            "score": 7,
            "rationale": "MCP snapshot bundles Canon registry, overlays, candidate review, and readiness artifacts for agent-facing consumers.",
            "registryItemIds": [
              "template.canon-project-overlay-template-pack",
              "template.canon-project-overlay-manifest",
              "template.canon-extension-intake"
            ]
          }
        ],
        "docsPaths": [
          "/canon/components/conversion",
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
      "id": "canon-overlay-candidate-promotion-approval-record:overlay.notion-agent-workspace.surface-brief",
      "readinessReportId": "canon-overlay-candidate-promotion-readiness:overlay.notion-agent-workspace.surface-brief",
      "planId": "canon-overlay-candidate-promotion-plan:overlay.notion-agent-workspace.surface-brief",
      "candidateId": "overlay.notion-agent-workspace:overlay.notion-agent-workspace.surface-brief",
      "intakeId": "overlay.notion-agent-workspace.surface-brief",
      "title": "Notion agent workspace surface approval record",
      "summary": "A candidate Canon workspace-agent template for OAuth entry, dashboard review, execution APIs, and compact operator handoffs without promoting Notion-specific tool details into Canon. This readiness report compares the plan with current Canon registry and public export policy snapshots before implementation starts. Fill this record before implementation starts; every target remains unset until a maintainer records an explicit choice.",
      "state": "approval-required",
      "approvalUri": "canon://overlays/candidates/overlay.notion-agent-workspace.surface-brief/approval-record",
      "readinessUri": "canon://overlays/candidates/overlay.notion-agent-workspace.surface-brief/readiness",
      "planUri": "canon://overlays/candidates/overlay.notion-agent-workspace.surface-brief/promotion-plan",
      "handoffUri": "canon://overlays/candidates/overlay.notion-agent-workspace.surface-brief/handoff",
      "candidateUri": "canon://overlays/candidates/overlay.notion-agent-workspace.surface-brief",
      "reviewUri": "canon://overlays/intake/overlay.notion-agent-workspace",
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
            "template.canon-extension-intake: Canon Extension Intake Template",
            "component.filtering-agent-panel: AgentPanel"
          ],
          "instructions": "Record the selected Canon registry item id or the new id to create."
        },
        {
          "id": "exportPath",
          "label": "Export Path",
          "required": true,
          "value": null,
          "hints": [
            "./mcp-snapshot: registry-covered / registry-artifact",
            "./modality-readiness: registry-covered / registry-artifact",
            "./overlays/intake: registry-covered / registry-artifact",
            "./components#TriadHealth: candidate-review / domain-specific",
            "./components/data#DataTable: candidate-review / stable-foundation-candidate"
          ],
          "instructions": "Record the package export path that implementation should add or update."
        },
        {
          "id": "exportName",
          "label": "Export Name",
          "required": false,
          "value": null,
          "hints": [
            "./mcp-snapshot: registry-covered / registry-artifact",
            "./modality-readiness: registry-covered / registry-artifact",
            "./overlays/intake: registry-covered / registry-artifact",
            "./components#TriadHealth: candidate-review / domain-specific",
            "./components/data#DataTable: candidate-review / stable-foundation-candidate"
          ],
          "instructions": "Record the named export when the target is a symbol-level export."
        },
        {
          "id": "docsPath",
          "label": "Docs Path",
          "required": true,
          "value": null,
          "hints": [
            "/canon/components/filtering",
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
            "score": 29,
            "reason": "Matches requested kind and overlaps 5 requested modalities."
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
            "reason": "Matches requested kind and overlaps 5 requested modalities."
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
            "score": 24,
            "reason": "Matches requested kind and overlaps 5 requested modalities."
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
            "score": 23,
            "reason": "Matches requested kind and overlaps 5 requested modalities."
          },
          {
            "id": "component.filtering-agent-panel",
            "name": "AgentPanel",
            "kind": "component",
            "maturity": "stable",
            "modalities": [
              "web",
              "app",
              "chat",
              "voice",
              "glasses"
            ],
            "docsPath": "/canon/components/filtering",
            "score": 20,
            "reason": "Overlaps 5 requested modalities."
          }
        ],
        "exportPolicies": [
          {
            "exportPath": "./mcp-snapshot",
            "classification": "registry-artifact",
            "registryPolicy": "registry-covered",
            "score": 13,
            "rationale": "MCP snapshot bundles Canon registry, overlays, candidate review, and readiness artifacts for agent-facing consumers.",
            "registryItemIds": [
              "template.canon-project-overlay-template-pack",
              "template.canon-project-overlay-manifest",
              "template.canon-extension-intake"
            ]
          },
          {
            "exportPath": "./modality-readiness",
            "classification": "registry-artifact",
            "registryPolicy": "registry-covered",
            "score": 9,
            "rationale": "Modality readiness report audits web, chat, app, voice, and glasses implementation evidence from registry and overlay inventory.",
            "registryItemIds": [
              "template.canon-project-overlay-manifest",
              "template.canon-extension-intake"
            ]
          },
          {
            "exportPath": "./overlays/intake",
            "classification": "registry-artifact",
            "registryPolicy": "registry-covered",
            "score": 9,
            "rationale": "Overlay intake inventory scans project overlay manifests and routes extension-intake evidence without promoting primitives automatically.",
            "registryItemIds": [
              "template.canon-extension-intake"
            ]
          },
          {
            "exportPath": "./components",
            "classification": "domain-specific",
            "registryPolicy": "candidate-review",
            "score": 8,
            "rationale": "CREATE SOMETHING framework display; needs governance-pattern contract before promotion.",
            "exportName": "TriadHealth"
          },
          {
            "exportPath": "./components/data",
            "classification": "stable-foundation-candidate",
            "registryPolicy": "candidate-review",
            "score": 8,
            "rationale": "Dense database-layer table primitive (design doc §2); candidate review until the deployed app-governance dashboard plus a second operator surface validate the contract.",
            "exportName": "DataTable"
          }
        ],
        "docsPaths": [
          "/canon/components/filtering",
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
      "id": "canon-overlay-candidate-promotion-approval-record:overlay.ona-agents.surface-brief",
      "readinessReportId": "canon-overlay-candidate-promotion-readiness:overlay.ona-agents.surface-brief",
      "planId": "canon-overlay-candidate-promotion-plan:overlay.ona-agents.surface-brief",
      "candidateId": "overlay.ona-agents:overlay.ona-agents.surface-brief",
      "intakeId": "overlay.ona-agents.surface-brief",
      "title": "Surface Brief Template approval record",
      "summary": "A reusable project-overlay brief for documenting workflow state, Canon reuse, local artifacts, evidence, and extension-intake needs. This readiness report compares the plan with current Canon registry and public export policy snapshots before implementation starts. Fill this record before implementation starts; every target remains unset until a maintainer records an explicit choice.",
      "state": "approval-required",
      "approvalUri": "canon://overlays/candidates/overlay.ona-agents.surface-brief/approval-record",
      "readinessUri": "canon://overlays/candidates/overlay.ona-agents.surface-brief/readiness",
      "planUri": "canon://overlays/candidates/overlay.ona-agents.surface-brief/promotion-plan",
      "handoffUri": "canon://overlays/candidates/overlay.ona-agents.surface-brief/handoff",
      "candidateUri": "canon://overlays/candidates/overlay.ona-agents.surface-brief",
      "reviewUri": "canon://overlays/intake/overlay.ona-agents",
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
            "template.canon-project-overlay-manifest: Canon Project Overlay Manifest",
            "template.canon-extension-intake: Canon Extension Intake Template",
            "template.atlas-development-handoff: Atlas Development Handoff Template",
            "template.canon-project-overlay-template-pack: Canon Project Overlay Template Pack",
            "token.canon-core: Canon Core Tokens"
          ],
          "instructions": "Record the selected Canon registry item id or the new id to create."
        },
        {
          "id": "exportPath",
          "label": "Export Path",
          "required": true,
          "value": null,
          "hints": [
            "./modality-readiness: registry-covered / registry-artifact",
            "./codification: registry-covered / registry-artifact",
            "./mcp-snapshot: registry-covered / registry-artifact",
            "./overlays/intake: registry-covered / registry-artifact",
            "./registry: registry-covered / registry-artifact"
          ],
          "instructions": "Record the package export path that implementation should add or update."
        },
        {
          "id": "exportName",
          "label": "Export Name",
          "required": false,
          "value": null,
          "hints": [
            "./modality-readiness: registry-covered / registry-artifact",
            "./codification: registry-covered / registry-artifact",
            "./mcp-snapshot: registry-covered / registry-artifact",
            "./overlays/intake: registry-covered / registry-artifact",
            "./registry: registry-covered / registry-artifact"
          ],
          "instructions": "Record the named export when the target is a symbol-level export."
        },
        {
          "id": "docsPath",
          "label": "Docs Path",
          "required": true,
          "value": null,
          "hints": [
            "/canon/resources/registry",
            "/canon/resources/tokens"
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
            "score": 31,
            "reason": "Matches requested kind and overlaps 5 requested modalities."
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
            "score": 30,
            "reason": "Matches requested kind and overlaps 5 requested modalities."
          },
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
            "score": 29,
            "reason": "Matches requested kind and overlaps 5 requested modalities."
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
            "score": 29,
            "reason": "Matches requested kind and overlaps 5 requested modalities."
          },
          {
            "id": "token.canon-core",
            "name": "Canon Core Tokens",
            "kind": "token",
            "maturity": "stable",
            "modalities": [
              "web",
              "app",
              "chat",
              "voice",
              "glasses"
            ],
            "docsPath": "/canon/resources/tokens",
            "score": 20,
            "reason": "Overlaps 5 requested modalities."
          }
        ],
        "exportPolicies": [
          {
            "exportPath": "./modality-readiness",
            "classification": "registry-artifact",
            "registryPolicy": "registry-covered",
            "score": 15,
            "rationale": "Modality readiness report audits web, chat, app, voice, and glasses implementation evidence from registry and overlay inventory.",
            "registryItemIds": [
              "template.canon-project-overlay-manifest",
              "template.canon-extension-intake"
            ]
          },
          {
            "exportPath": "./codification",
            "classification": "registry-artifact",
            "registryPolicy": "registry-covered",
            "score": 12,
            "rationale": "Codification audit classifies repo UI files by Canon ownership, direct import, overlay governance, or explicit local exemption.",
            "registryItemIds": [
              "template.canon-project-overlay-manifest",
              "template.canon-extension-intake"
            ]
          },
          {
            "exportPath": "./mcp-snapshot",
            "classification": "registry-artifact",
            "registryPolicy": "registry-covered",
            "score": 12,
            "rationale": "MCP snapshot bundles Canon registry, overlays, candidate review, and readiness artifacts for agent-facing consumers.",
            "registryItemIds": [
              "template.canon-project-overlay-template-pack",
              "template.canon-project-overlay-manifest",
              "template.canon-extension-intake"
            ]
          },
          {
            "exportPath": "./overlays/intake",
            "classification": "registry-artifact",
            "registryPolicy": "registry-covered",
            "score": 12,
            "rationale": "Overlay intake inventory scans project overlay manifests and routes extension-intake evidence without promoting primitives automatically.",
            "registryItemIds": [
              "template.canon-extension-intake"
            ]
          },
          {
            "exportPath": "./registry",
            "classification": "registry-artifact",
            "registryPolicy": "registry-covered",
            "score": 12,
            "rationale": "Registry API is the Canon source of truth for discoverable artifacts and lifecycle rules.",
            "registryItemIds": [
              "template.canon-extension-intake",
              "template.canon-project-overlay-manifest"
            ]
          }
        ],
        "docsPaths": [
          "/canon/resources/registry",
          "/canon/resources/tokens"
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
      "id": "canon-overlay-candidate-promotion-approval-record:overlay.relay.surface-brief",
      "readinessReportId": "canon-overlay-candidate-promotion-readiness:overlay.relay.surface-brief",
      "planId": "canon-overlay-candidate-promotion-plan:overlay.relay.surface-brief",
      "candidateId": "overlay.relay:overlay.relay.surface-brief",
      "intakeId": "overlay.relay.surface-brief",
      "title": "Surface Brief Template approval record",
      "summary": "A reusable project-overlay brief for documenting workflow state, Canon reuse, local artifacts, evidence, and extension-intake needs. This readiness report compares the plan with current Canon registry and public export policy snapshots before implementation starts. Fill this record before implementation starts; every target remains unset until a maintainer records an explicit choice.",
      "state": "approval-required",
      "approvalUri": "canon://overlays/candidates/overlay.relay.surface-brief/approval-record",
      "readinessUri": "canon://overlays/candidates/overlay.relay.surface-brief/readiness",
      "planUri": "canon://overlays/candidates/overlay.relay.surface-brief/promotion-plan",
      "handoffUri": "canon://overlays/candidates/overlay.relay.surface-brief/handoff",
      "candidateUri": "canon://overlays/candidates/overlay.relay.surface-brief",
      "reviewUri": "canon://overlays/intake/overlay.relay",
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
            "template.canon-project-overlay-manifest: Canon Project Overlay Manifest",
            "template.canon-extension-intake: Canon Extension Intake Template",
            "template.atlas-development-handoff: Atlas Development Handoff Template",
            "template.canon-project-overlay-template-pack: Canon Project Overlay Template Pack",
            "token.canon-core: Canon Core Tokens"
          ],
          "instructions": "Record the selected Canon registry item id or the new id to create."
        },
        {
          "id": "exportPath",
          "label": "Export Path",
          "required": true,
          "value": null,
          "hints": [
            "./modality-readiness: registry-covered / registry-artifact",
            "./codification: registry-covered / registry-artifact",
            "./mcp-snapshot: registry-covered / registry-artifact",
            "./overlays/intake: registry-covered / registry-artifact",
            "./registry: registry-covered / registry-artifact"
          ],
          "instructions": "Record the package export path that implementation should add or update."
        },
        {
          "id": "exportName",
          "label": "Export Name",
          "required": false,
          "value": null,
          "hints": [
            "./modality-readiness: registry-covered / registry-artifact",
            "./codification: registry-covered / registry-artifact",
            "./mcp-snapshot: registry-covered / registry-artifact",
            "./overlays/intake: registry-covered / registry-artifact",
            "./registry: registry-covered / registry-artifact"
          ],
          "instructions": "Record the named export when the target is a symbol-level export."
        },
        {
          "id": "docsPath",
          "label": "Docs Path",
          "required": true,
          "value": null,
          "hints": [
            "/canon/resources/registry",
            "/canon/resources/tokens"
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
            "score": 31,
            "reason": "Matches requested kind and overlaps 5 requested modalities."
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
            "score": 30,
            "reason": "Matches requested kind and overlaps 5 requested modalities."
          },
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
            "score": 29,
            "reason": "Matches requested kind and overlaps 5 requested modalities."
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
            "score": 29,
            "reason": "Matches requested kind and overlaps 5 requested modalities."
          },
          {
            "id": "token.canon-core",
            "name": "Canon Core Tokens",
            "kind": "token",
            "maturity": "stable",
            "modalities": [
              "web",
              "app",
              "chat",
              "voice",
              "glasses"
            ],
            "docsPath": "/canon/resources/tokens",
            "score": 20,
            "reason": "Overlaps 5 requested modalities."
          }
        ],
        "exportPolicies": [
          {
            "exportPath": "./modality-readiness",
            "classification": "registry-artifact",
            "registryPolicy": "registry-covered",
            "score": 15,
            "rationale": "Modality readiness report audits web, chat, app, voice, and glasses implementation evidence from registry and overlay inventory.",
            "registryItemIds": [
              "template.canon-project-overlay-manifest",
              "template.canon-extension-intake"
            ]
          },
          {
            "exportPath": "./codification",
            "classification": "registry-artifact",
            "registryPolicy": "registry-covered",
            "score": 12,
            "rationale": "Codification audit classifies repo UI files by Canon ownership, direct import, overlay governance, or explicit local exemption.",
            "registryItemIds": [
              "template.canon-project-overlay-manifest",
              "template.canon-extension-intake"
            ]
          },
          {
            "exportPath": "./mcp-snapshot",
            "classification": "registry-artifact",
            "registryPolicy": "registry-covered",
            "score": 12,
            "rationale": "MCP snapshot bundles Canon registry, overlays, candidate review, and readiness artifacts for agent-facing consumers.",
            "registryItemIds": [
              "template.canon-project-overlay-template-pack",
              "template.canon-project-overlay-manifest",
              "template.canon-extension-intake"
            ]
          },
          {
            "exportPath": "./overlays/intake",
            "classification": "registry-artifact",
            "registryPolicy": "registry-covered",
            "score": 12,
            "rationale": "Overlay intake inventory scans project overlay manifests and routes extension-intake evidence without promoting primitives automatically.",
            "registryItemIds": [
              "template.canon-extension-intake"
            ]
          },
          {
            "exportPath": "./registry",
            "classification": "registry-artifact",
            "registryPolicy": "registry-covered",
            "score": 12,
            "rationale": "Registry API is the Canon source of truth for discoverable artifacts and lifecycle rules.",
            "registryItemIds": [
              "template.canon-extension-intake",
              "template.canon-project-overlay-manifest"
            ]
          }
        ],
        "docsPaths": [
          "/canon/resources/registry",
          "/canon/resources/tokens"
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
      "id": "canon-overlay-candidate-promotion-approval-record:overlay.space-workbench.surface-brief",
      "readinessReportId": "canon-overlay-candidate-promotion-readiness:overlay.space-workbench.surface-brief",
      "planId": "canon-overlay-candidate-promotion-plan:overlay.space-workbench.surface-brief",
      "candidateId": "overlay.space-workbench:overlay.space-workbench.surface-brief",
      "intakeId": "overlay.space-workbench.surface-brief",
      "title": "Workbench tool proof surface approval record",
      "summary": "A candidate Canon workbench template for turning live tools, playgrounds, data dashboards, and operator receipts into reusable proof surfaces without forking Canon components. This readiness report compares the plan with current Canon registry and public export policy snapshots before implementation starts. Fill this record before implementation starts; every target remains unset until a maintainer records an explicit choice.",
      "state": "approval-required",
      "approvalUri": "canon://overlays/candidates/overlay.space-workbench.surface-brief/approval-record",
      "readinessUri": "canon://overlays/candidates/overlay.space-workbench.surface-brief/readiness",
      "planUri": "canon://overlays/candidates/overlay.space-workbench.surface-brief/promotion-plan",
      "handoffUri": "canon://overlays/candidates/overlay.space-workbench.surface-brief/handoff",
      "candidateUri": "canon://overlays/candidates/overlay.space-workbench.surface-brief",
      "reviewUri": "canon://overlays/intake/overlay.space-workbench",
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
            "template.canon-extension-intake: Canon Extension Intake Template",
            "template.canon-project-overlay-template-pack: Canon Project Overlay Template Pack",
            "component.triad-health: TriadHealth"
          ],
          "instructions": "Record the selected Canon registry item id or the new id to create."
        },
        {
          "id": "exportPath",
          "label": "Export Path",
          "required": true,
          "value": null,
          "hints": [
            "./modality-readiness: registry-covered / registry-artifact",
            "./components/data: candidate-review / stable-foundation-candidate",
            "./overlays/intake: registry-covered / registry-artifact",
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
            "./modality-readiness: registry-covered / registry-artifact",
            "./components/data: candidate-review / stable-foundation-candidate",
            "./overlays/intake: registry-covered / registry-artifact",
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
            "/canon/components",
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
            "score": 27,
            "reason": "Matches requested kind and overlaps 5 requested modalities."
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
            "score": 27,
            "reason": "Matches requested kind and overlaps 5 requested modalities."
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
            "score": 26,
            "reason": "Matches requested kind and overlaps 5 requested modalities."
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
            "score": 26,
            "reason": "Matches requested kind and overlaps 5 requested modalities."
          },
          {
            "id": "component.triad-health",
            "name": "TriadHealth",
            "kind": "component",
            "maturity": "stable",
            "modalities": [
              "web",
              "app",
              "chat",
              "voice",
              "glasses"
            ],
            "docsPath": "/canon/components",
            "score": 20,
            "reason": "Overlaps 5 requested modalities."
          }
        ],
        "exportPolicies": [
          {
            "exportPath": "./modality-readiness",
            "classification": "registry-artifact",
            "registryPolicy": "registry-covered",
            "score": 9,
            "rationale": "Modality readiness report audits web, chat, app, voice, and glasses implementation evidence from registry and overlay inventory.",
            "registryItemIds": [
              "template.canon-project-overlay-manifest",
              "template.canon-extension-intake"
            ]
          },
          {
            "exportPath": "./components/data",
            "classification": "stable-foundation-candidate",
            "registryPolicy": "candidate-review",
            "score": 8,
            "rationale": "Database-layer primitives barrel (docs/CANON_DATABASE_LAYER_DESIGN.md); components stay in candidate review until a second consuming surface exists."
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
          "/canon/components",
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
      "id": "canon-overlay-candidate-promotion-approval-record:overlay.spritz-reading.surface-brief",
      "readinessReportId": "canon-overlay-candidate-promotion-readiness:overlay.spritz-reading.surface-brief",
      "planId": "canon-overlay-candidate-promotion-plan:overlay.spritz-reading.surface-brief",
      "candidateId": "overlay.spritz-reading:overlay.spritz-reading.surface-brief",
      "intakeId": "overlay.spritz-reading.surface-brief",
      "title": "Reading component proof surface approval record",
      "summary": "A candidate Canon component-demo template for interactive reading controls, component API evidence, and compact preview handoffs without making Spritz behavior a Canon primitive. This readiness report compares the plan with current Canon registry and public export policy snapshots before implementation starts. Fill this record before implementation starts; every target remains unset until a maintainer records an explicit choice.",
      "state": "approval-required",
      "approvalUri": "canon://overlays/candidates/overlay.spritz-reading.surface-brief/approval-record",
      "readinessUri": "canon://overlays/candidates/overlay.spritz-reading.surface-brief/readiness",
      "planUri": "canon://overlays/candidates/overlay.spritz-reading.surface-brief/promotion-plan",
      "handoffUri": "canon://overlays/candidates/overlay.spritz-reading.surface-brief/handoff",
      "candidateUri": "canon://overlays/candidates/overlay.spritz-reading.surface-brief",
      "reviewUri": "canon://overlays/intake/overlay.spritz-reading",
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
            "template.canon-extension-intake: Canon Extension Intake Template",
            "template.canon-project-overlay-manifest: Canon Project Overlay Manifest",
            "template.atlas-development-handoff: Atlas Development Handoff Template",
            "template.canon-project-overlay-template-pack: Canon Project Overlay Template Pack",
            "component.insights-statement-text: StatementText"
          ],
          "instructions": "Record the selected Canon registry item id or the new id to create."
        },
        {
          "id": "exportPath",
          "label": "Export Path",
          "required": true,
          "value": null,
          "hints": [
            "./components#CrossPropertyLink: candidate-review / platform-surface",
            "./components/data: candidate-review / stable-foundation-candidate",
            "./modality-readiness: registry-covered / registry-artifact",
            "./overlays/intake: registry-covered / registry-artifact",
            "./components#TriadHealth: candidate-review / domain-specific"
          ],
          "instructions": "Record the package export path that implementation should add or update."
        },
        {
          "id": "exportName",
          "label": "Export Name",
          "required": false,
          "value": null,
          "hints": [
            "./components#CrossPropertyLink: candidate-review / platform-surface",
            "./components/data: candidate-review / stable-foundation-candidate",
            "./modality-readiness: registry-covered / registry-artifact",
            "./overlays/intake: registry-covered / registry-artifact",
            "./components#TriadHealth: candidate-review / domain-specific"
          ],
          "instructions": "Record the named export when the target is a symbol-level export."
        },
        {
          "id": "docsPath",
          "label": "Docs Path",
          "required": true,
          "value": null,
          "hints": [
            "/canon/components/insights",
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
            "score": 26,
            "reason": "Matches requested kind and overlaps 5 requested modalities."
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
            "score": 26,
            "reason": "Matches requested kind and overlaps 5 requested modalities."
          },
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
            "score": 25,
            "reason": "Matches requested kind and overlaps 5 requested modalities."
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
            "score": 25,
            "reason": "Matches requested kind and overlaps 5 requested modalities."
          },
          {
            "id": "component.insights-statement-text",
            "name": "StatementText",
            "kind": "component",
            "maturity": "stable",
            "modalities": [
              "web",
              "app",
              "chat",
              "voice",
              "glasses"
            ],
            "docsPath": "/canon/components/insights",
            "score": 22,
            "reason": "Overlaps 5 requested modalities."
          }
        ],
        "exportPolicies": [
          {
            "exportPath": "./components",
            "classification": "platform-surface",
            "registryPolicy": "candidate-review",
            "score": 10,
            "rationale": "Property-routing primitive candidate tied to CREATE SOMETHING property topology.",
            "exportName": "CrossPropertyLink"
          },
          {
            "exportPath": "./components/data",
            "classification": "stable-foundation-candidate",
            "registryPolicy": "candidate-review",
            "score": 10,
            "rationale": "Database-layer primitives barrel (docs/CANON_DATABASE_LAYER_DESIGN.md); components stay in candidate review until a second consuming surface exists."
          },
          {
            "exportPath": "./modality-readiness",
            "classification": "registry-artifact",
            "registryPolicy": "registry-covered",
            "score": 10,
            "rationale": "Modality readiness report audits web, chat, app, voice, and glasses implementation evidence from registry and overlay inventory.",
            "registryItemIds": [
              "template.canon-project-overlay-manifest",
              "template.canon-extension-intake"
            ]
          },
          {
            "exportPath": "./overlays/intake",
            "classification": "registry-artifact",
            "registryPolicy": "registry-covered",
            "score": 10,
            "rationale": "Overlay intake inventory scans project overlay manifests and routes extension-intake evidence without promoting primitives automatically.",
            "registryItemIds": [
              "template.canon-extension-intake"
            ]
          },
          {
            "exportPath": "./components",
            "classification": "domain-specific",
            "registryPolicy": "candidate-review",
            "score": 9,
            "rationale": "CREATE SOMETHING framework display; needs governance-pattern contract before promotion.",
            "exportName": "TriadHealth"
          }
        ],
        "docsPaths": [
          "/canon/components/insights",
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
      "id": "canon-overlay-candidate-promotion-approval-record:overlay.tend-database.surface-brief",
      "readinessReportId": "canon-overlay-candidate-promotion-readiness:overlay.tend-database.surface-brief",
      "planId": "canon-overlay-candidate-promotion-plan:overlay.tend-database.surface-brief",
      "candidateId": "overlay.tend-database:overlay.tend-database.surface-brief",
      "intakeId": "overlay.tend-database.surface-brief",
      "title": "Database source management surface approval record",
      "summary": "A candidate Canon database-service template for source setup, settings, agent automation, and receipt handoffs without promoting Tend-specific vertical schemas into Canon. This readiness report compares the plan with current Canon registry and public export policy snapshots before implementation starts. Fill this record before implementation starts; every target remains unset until a maintainer records an explicit choice.",
      "state": "approval-required",
      "approvalUri": "canon://overlays/candidates/overlay.tend-database.surface-brief/approval-record",
      "readinessUri": "canon://overlays/candidates/overlay.tend-database.surface-brief/readiness",
      "planUri": "canon://overlays/candidates/overlay.tend-database.surface-brief/promotion-plan",
      "handoffUri": "canon://overlays/candidates/overlay.tend-database.surface-brief/handoff",
      "candidateUri": "canon://overlays/candidates/overlay.tend-database.surface-brief",
      "reviewUri": "canon://overlays/intake/overlay.tend-database",
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
            "template.canon-extension-intake: Canon Extension Intake Template",
            "template.canon-project-overlay-template-pack: Canon Project Overlay Template Pack",
            "component.triad-health: TriadHealth"
          ],
          "instructions": "Record the selected Canon registry item id or the new id to create."
        },
        {
          "id": "exportPath",
          "label": "Export Path",
          "required": true,
          "value": null,
          "hints": [
            "./components/data: candidate-review / stable-foundation-candidate",
            "./modality-readiness: registry-covered / registry-artifact",
            "./overlays/intake: registry-covered / registry-artifact",
            "./components/data#DataTable: candidate-review / stable-foundation-candidate",
            "./components/data#StatusBadge: candidate-review / stable-foundation-candidate"
          ],
          "instructions": "Record the package export path that implementation should add or update."
        },
        {
          "id": "exportName",
          "label": "Export Name",
          "required": false,
          "value": null,
          "hints": [
            "./components/data: candidate-review / stable-foundation-candidate",
            "./modality-readiness: registry-covered / registry-artifact",
            "./overlays/intake: registry-covered / registry-artifact",
            "./components/data#DataTable: candidate-review / stable-foundation-candidate",
            "./components/data#StatusBadge: candidate-review / stable-foundation-candidate"
          ],
          "instructions": "Record the named export when the target is a symbol-level export."
        },
        {
          "id": "docsPath",
          "label": "Docs Path",
          "required": true,
          "value": null,
          "hints": [
            "/canon/components",
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
            "score": 32,
            "reason": "Matches requested kind and overlaps 5 requested modalities."
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
            "score": 29,
            "reason": "Matches requested kind and overlaps 5 requested modalities."
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
            "score": 25,
            "reason": "Matches requested kind and overlaps 5 requested modalities."
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
            "score": 25,
            "reason": "Matches requested kind and overlaps 5 requested modalities."
          },
          {
            "id": "component.triad-health",
            "name": "TriadHealth",
            "kind": "component",
            "maturity": "stable",
            "modalities": [
              "web",
              "app",
              "chat",
              "voice",
              "glasses"
            ],
            "docsPath": "/canon/components",
            "score": 21,
            "reason": "Overlaps 5 requested modalities."
          }
        ],
        "exportPolicies": [
          {
            "exportPath": "./components/data",
            "classification": "stable-foundation-candidate",
            "registryPolicy": "candidate-review",
            "score": 10,
            "rationale": "Database-layer primitives barrel (docs/CANON_DATABASE_LAYER_DESIGN.md); components stay in candidate review until a second consuming surface exists."
          },
          {
            "exportPath": "./modality-readiness",
            "classification": "registry-artifact",
            "registryPolicy": "registry-covered",
            "score": 9,
            "rationale": "Modality readiness report audits web, chat, app, voice, and glasses implementation evidence from registry and overlay inventory.",
            "registryItemIds": [
              "template.canon-project-overlay-manifest",
              "template.canon-extension-intake"
            ]
          },
          {
            "exportPath": "./overlays/intake",
            "classification": "registry-artifact",
            "registryPolicy": "registry-covered",
            "score": 9,
            "rationale": "Overlay intake inventory scans project overlay manifests and routes extension-intake evidence without promoting primitives automatically.",
            "registryItemIds": [
              "template.canon-extension-intake"
            ]
          },
          {
            "exportPath": "./components/data",
            "classification": "stable-foundation-candidate",
            "registryPolicy": "candidate-review",
            "score": 8,
            "rationale": "Dense database-layer table primitive (design doc §2); candidate review until the deployed app-governance dashboard plus a second operator surface validate the contract.",
            "exportName": "DataTable"
          },
          {
            "exportPath": "./components/data",
            "classification": "stable-foundation-candidate",
            "registryPolicy": "candidate-review",
            "score": 8,
            "rationale": "Semantic state badge for database-layer lifecycles (design doc §4); candidate review until the tone vocabulary is validated by a second consuming surface.",
            "exportName": "StatusBadge"
          }
        ],
        "docsPaths": [
          "/canon/components",
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
      "id": "canon-overlay-candidate-promotion-approval-record:overlay.webflow-apps-admin-audit.surface-brief",
      "readinessReportId": "canon-overlay-candidate-promotion-readiness:overlay.webflow-apps-admin-audit.surface-brief",
      "planId": "canon-overlay-candidate-promotion-plan:overlay.webflow-apps-admin-audit.surface-brief",
      "candidateId": "overlay.webflow-apps-admin-audit:overlay.webflow-apps-admin-audit.surface-brief",
      "intakeId": "overlay.webflow-apps-admin-audit.surface-brief",
      "title": "Webflow app audit dashboard surface approval record",
      "summary": "A candidate Canon audit-dashboard template for app review status, governance evidence, and compact reviewer handoffs without promoting Webflow-specific exception policy into Canon stable. This readiness report compares the plan with current Canon registry and public export policy snapshots before implementation starts. Fill this record before implementation starts; every target remains unset until a maintainer records an explicit choice.",
      "state": "approval-required",
      "approvalUri": "canon://overlays/candidates/overlay.webflow-apps-admin-audit.surface-brief/approval-record",
      "readinessUri": "canon://overlays/candidates/overlay.webflow-apps-admin-audit.surface-brief/readiness",
      "planUri": "canon://overlays/candidates/overlay.webflow-apps-admin-audit.surface-brief/promotion-plan",
      "handoffUri": "canon://overlays/candidates/overlay.webflow-apps-admin-audit.surface-brief/handoff",
      "candidateUri": "canon://overlays/candidates/overlay.webflow-apps-admin-audit.surface-brief",
      "reviewUri": "canon://overlays/intake/overlay.webflow-apps-admin-audit",
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
            "template.canon-extension-intake: Canon Extension Intake Template",
            "template.canon-project-overlay-manifest: Canon Project Overlay Manifest",
            "template.atlas-development-handoff: Atlas Development Handoff Template",
            "template.canon-project-overlay-template-pack: Canon Project Overlay Template Pack",
            "component.triad-health: TriadHealth"
          ],
          "instructions": "Record the selected Canon registry item id or the new id to create."
        },
        {
          "id": "exportPath",
          "label": "Export Path",
          "required": true,
          "value": null,
          "hints": [
            "./modality-readiness: registry-covered / registry-artifact",
            "./codification: registry-covered / registry-artifact",
            "./components/data#DataTable: candidate-review / stable-foundation-candidate",
            "./overlays/intake: registry-covered / registry-artifact",
            "./components#TriadHealth: candidate-review / domain-specific"
          ],
          "instructions": "Record the package export path that implementation should add or update."
        },
        {
          "id": "exportName",
          "label": "Export Name",
          "required": false,
          "value": null,
          "hints": [
            "./modality-readiness: registry-covered / registry-artifact",
            "./codification: registry-covered / registry-artifact",
            "./components/data#DataTable: candidate-review / stable-foundation-candidate",
            "./overlays/intake: registry-covered / registry-artifact",
            "./components#TriadHealth: candidate-review / domain-specific"
          ],
          "instructions": "Record the named export when the target is a symbol-level export."
        },
        {
          "id": "docsPath",
          "label": "Docs Path",
          "required": true,
          "value": null,
          "hints": [
            "/canon/components",
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
            "score": 27,
            "reason": "Matches requested kind and overlaps 5 requested modalities."
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
            "score": 27,
            "reason": "Matches requested kind and overlaps 5 requested modalities."
          },
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
            "score": 26,
            "reason": "Matches requested kind and overlaps 5 requested modalities."
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
            "score": 26,
            "reason": "Matches requested kind and overlaps 5 requested modalities."
          },
          {
            "id": "component.triad-health",
            "name": "TriadHealth",
            "kind": "component",
            "maturity": "stable",
            "modalities": [
              "web",
              "app",
              "chat",
              "voice",
              "glasses"
            ],
            "docsPath": "/canon/components",
            "score": 20,
            "reason": "Overlaps 5 requested modalities."
          }
        ],
        "exportPolicies": [
          {
            "exportPath": "./modality-readiness",
            "classification": "registry-artifact",
            "registryPolicy": "registry-covered",
            "score": 15,
            "rationale": "Modality readiness report audits web, chat, app, voice, and glasses implementation evidence from registry and overlay inventory.",
            "registryItemIds": [
              "template.canon-project-overlay-manifest",
              "template.canon-extension-intake"
            ]
          },
          {
            "exportPath": "./codification",
            "classification": "registry-artifact",
            "registryPolicy": "registry-covered",
            "score": 12,
            "rationale": "Codification audit classifies repo UI files by Canon ownership, direct import, overlay governance, or explicit local exemption.",
            "registryItemIds": [
              "template.canon-project-overlay-manifest",
              "template.canon-extension-intake"
            ]
          },
          {
            "exportPath": "./components/data",
            "classification": "stable-foundation-candidate",
            "registryPolicy": "candidate-review",
            "score": 10,
            "rationale": "Dense database-layer table primitive (design doc §2); candidate review until the deployed app-governance dashboard plus a second operator surface validate the contract.",
            "exportName": "DataTable"
          },
          {
            "exportPath": "./overlays/intake",
            "classification": "registry-artifact",
            "registryPolicy": "registry-covered",
            "score": 10,
            "rationale": "Overlay intake inventory scans project overlay manifests and routes extension-intake evidence without promoting primitives automatically.",
            "registryItemIds": [
              "template.canon-extension-intake"
            ]
          },
          {
            "exportPath": "./components",
            "classification": "domain-specific",
            "registryPolicy": "candidate-review",
            "score": 9,
            "rationale": "CREATE SOMETHING framework display; needs governance-pattern contract before promotion.",
            "exportName": "TriadHealth"
          }
        ],
        "docsPaths": [
          "/canon/components",
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
      "id": "canon-overlay-candidate-promotion-approval-record:overlay.webflow-dashboard-marketplace.surface-brief",
      "readinessReportId": "canon-overlay-candidate-promotion-readiness:overlay.webflow-dashboard-marketplace.surface-brief",
      "planId": "canon-overlay-candidate-promotion-plan:overlay.webflow-dashboard-marketplace.surface-brief",
      "candidateId": "overlay.webflow-dashboard-marketplace:overlay.webflow-dashboard-marketplace.surface-brief",
      "intakeId": "overlay.webflow-dashboard-marketplace.surface-brief",
      "title": "Webflow marketplace dashboard surface approval record",
      "summary": "A candidate Canon marketplace-operations template for dashboard state, marketplace insights, validation, asset receipts, and compact operator handoffs without promoting Webflow-specific data policy into Canon. This readiness report compares the plan with current Canon registry and public export policy snapshots before implementation starts. Fill this record before implementation starts; every target remains unset until a maintainer records an explicit choice.",
      "state": "approval-required",
      "approvalUri": "canon://overlays/candidates/overlay.webflow-dashboard-marketplace.surface-brief/approval-record",
      "readinessUri": "canon://overlays/candidates/overlay.webflow-dashboard-marketplace.surface-brief/readiness",
      "planUri": "canon://overlays/candidates/overlay.webflow-dashboard-marketplace.surface-brief/promotion-plan",
      "handoffUri": "canon://overlays/candidates/overlay.webflow-dashboard-marketplace.surface-brief/handoff",
      "candidateUri": "canon://overlays/candidates/overlay.webflow-dashboard-marketplace.surface-brief",
      "reviewUri": "canon://overlays/intake/overlay.webflow-dashboard-marketplace",
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
            "template.canon-project-overlay-template-pack: Canon Project Overlay Template Pack",
            "template.canon-project-overlay-manifest: Canon Project Overlay Manifest",
            "template.canon-extension-intake: Canon Extension Intake Template",
            "component.triad-health: TriadHealth"
          ],
          "instructions": "Record the selected Canon registry item id or the new id to create."
        },
        {
          "id": "exportPath",
          "label": "Export Path",
          "required": true,
          "value": null,
          "hints": [
            "./components/data#DataTable: candidate-review / stable-foundation-candidate",
            "./modality-readiness: registry-covered / registry-artifact",
            "./overlays/intake: registry-covered / registry-artifact",
            "./components#TriadHealth: candidate-review / domain-specific",
            "./components/data: candidate-review / stable-foundation-candidate"
          ],
          "instructions": "Record the package export path that implementation should add or update."
        },
        {
          "id": "exportName",
          "label": "Export Name",
          "required": false,
          "value": null,
          "hints": [
            "./components/data#DataTable: candidate-review / stable-foundation-candidate",
            "./modality-readiness: registry-covered / registry-artifact",
            "./overlays/intake: registry-covered / registry-artifact",
            "./components#TriadHealth: candidate-review / domain-specific",
            "./components/data: candidate-review / stable-foundation-candidate"
          ],
          "instructions": "Record the named export when the target is a symbol-level export."
        },
        {
          "id": "docsPath",
          "label": "Docs Path",
          "required": true,
          "value": null,
          "hints": [
            "/canon/components",
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
            "score": 27,
            "reason": "Matches requested kind and overlaps 5 requested modalities."
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
            "score": 26,
            "reason": "Matches requested kind and overlaps 5 requested modalities."
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
            "score": 25,
            "reason": "Matches requested kind and overlaps 5 requested modalities."
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
            "score": 24,
            "reason": "Matches requested kind and overlaps 5 requested modalities."
          },
          {
            "id": "component.triad-health",
            "name": "TriadHealth",
            "kind": "component",
            "maturity": "stable",
            "modalities": [
              "web",
              "app",
              "chat",
              "voice",
              "glasses"
            ],
            "docsPath": "/canon/components",
            "score": 19,
            "reason": "Overlaps 5 requested modalities."
          }
        ],
        "exportPolicies": [
          {
            "exportPath": "./components/data",
            "classification": "stable-foundation-candidate",
            "registryPolicy": "candidate-review",
            "score": 12,
            "rationale": "Dense database-layer table primitive (design doc §2); candidate review until the deployed app-governance dashboard plus a second operator surface validate the contract.",
            "exportName": "DataTable"
          },
          {
            "exportPath": "./modality-readiness",
            "classification": "registry-artifact",
            "registryPolicy": "registry-covered",
            "score": 9,
            "rationale": "Modality readiness report audits web, chat, app, voice, and glasses implementation evidence from registry and overlay inventory.",
            "registryItemIds": [
              "template.canon-project-overlay-manifest",
              "template.canon-extension-intake"
            ]
          },
          {
            "exportPath": "./overlays/intake",
            "classification": "registry-artifact",
            "registryPolicy": "registry-covered",
            "score": 9,
            "rationale": "Overlay intake inventory scans project overlay manifests and routes extension-intake evidence without promoting primitives automatically.",
            "registryItemIds": [
              "template.canon-extension-intake"
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
            "exportPath": "./components/data",
            "classification": "stable-foundation-candidate",
            "registryPolicy": "candidate-review",
            "score": 7,
            "rationale": "Database-layer primitives barrel (docs/CANON_DATABASE_LAYER_DESIGN.md); components stay in candidate review until a second consuming surface exists."
          }
        ],
        "docsPaths": [
          "/canon/components",
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
      "id": "canon-overlay-candidate-promotion-approval-record:overlay.webflow-template-validation.surface-brief",
      "readinessReportId": "canon-overlay-candidate-promotion-readiness:overlay.webflow-template-validation.surface-brief",
      "planId": "canon-overlay-candidate-promotion-plan:overlay.webflow-template-validation.surface-brief",
      "candidateId": "overlay.webflow-template-validation:overlay.webflow-template-validation.surface-brief",
      "intakeId": "overlay.webflow-template-validation.surface-brief",
      "title": "Surface Brief Template approval record",
      "summary": "A reusable project-overlay brief for documenting workflow state, Canon reuse, local artifacts, evidence, and extension-intake needs. This readiness report compares the plan with current Canon registry and public export policy snapshots before implementation starts. Fill this record before implementation starts; every target remains unset until a maintainer records an explicit choice.",
      "state": "approval-required",
      "approvalUri": "canon://overlays/candidates/overlay.webflow-template-validation.surface-brief/approval-record",
      "readinessUri": "canon://overlays/candidates/overlay.webflow-template-validation.surface-brief/readiness",
      "planUri": "canon://overlays/candidates/overlay.webflow-template-validation.surface-brief/promotion-plan",
      "handoffUri": "canon://overlays/candidates/overlay.webflow-template-validation.surface-brief/handoff",
      "candidateUri": "canon://overlays/candidates/overlay.webflow-template-validation.surface-brief",
      "reviewUri": "canon://overlays/intake/overlay.webflow-template-validation",
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
            "template.canon-project-overlay-manifest: Canon Project Overlay Manifest",
            "template.canon-extension-intake: Canon Extension Intake Template",
            "template.atlas-development-handoff: Atlas Development Handoff Template",
            "template.canon-project-overlay-template-pack: Canon Project Overlay Template Pack",
            "template.chat-decision-brief: Chat Decision Brief Template"
          ],
          "instructions": "Record the selected Canon registry item id or the new id to create."
        },
        {
          "id": "exportPath",
          "label": "Export Path",
          "required": true,
          "value": null,
          "hints": [
            "./modality-readiness: registry-covered / registry-artifact",
            "./codification: registry-covered / registry-artifact",
            "./mcp-snapshot: registry-covered / registry-artifact",
            "./overlays/intake: registry-covered / registry-artifact",
            "./registry: registry-covered / registry-artifact"
          ],
          "instructions": "Record the package export path that implementation should add or update."
        },
        {
          "id": "exportName",
          "label": "Export Name",
          "required": false,
          "value": null,
          "hints": [
            "./modality-readiness: registry-covered / registry-artifact",
            "./codification: registry-covered / registry-artifact",
            "./mcp-snapshot: registry-covered / registry-artifact",
            "./overlays/intake: registry-covered / registry-artifact",
            "./registry: registry-covered / registry-artifact"
          ],
          "instructions": "Record the named export when the target is a symbol-level export."
        },
        {
          "id": "docsPath",
          "label": "Docs Path",
          "required": true,
          "value": null,
          "hints": [
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
            "score": 34,
            "reason": "Matches requested kind and overlaps 5 requested modalities."
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
            "score": 33,
            "reason": "Matches requested kind and overlaps 5 requested modalities."
          },
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
            "score": 32,
            "reason": "Matches requested kind and overlaps 5 requested modalities."
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
            "score": 32,
            "reason": "Matches requested kind and overlaps 5 requested modalities."
          },
          {
            "id": "template.chat-decision-brief",
            "name": "Chat Decision Brief Template",
            "kind": "template",
            "maturity": "candidate",
            "modalities": [
              "chat",
              "voice"
            ],
            "docsPath": "/canon/resources/registry",
            "score": 21,
            "reason": "Matches requested kind and overlaps 2 requested modalities."
          }
        ],
        "exportPolicies": [
          {
            "exportPath": "./modality-readiness",
            "classification": "registry-artifact",
            "registryPolicy": "registry-covered",
            "score": 18,
            "rationale": "Modality readiness report audits web, chat, app, voice, and glasses implementation evidence from registry and overlay inventory.",
            "registryItemIds": [
              "template.canon-project-overlay-manifest",
              "template.canon-extension-intake"
            ]
          },
          {
            "exportPath": "./codification",
            "classification": "registry-artifact",
            "registryPolicy": "registry-covered",
            "score": 15,
            "rationale": "Codification audit classifies repo UI files by Canon ownership, direct import, overlay governance, or explicit local exemption.",
            "registryItemIds": [
              "template.canon-project-overlay-manifest",
              "template.canon-extension-intake"
            ]
          },
          {
            "exportPath": "./mcp-snapshot",
            "classification": "registry-artifact",
            "registryPolicy": "registry-covered",
            "score": 15,
            "rationale": "MCP snapshot bundles Canon registry, overlays, candidate review, and readiness artifacts for agent-facing consumers.",
            "registryItemIds": [
              "template.canon-project-overlay-template-pack",
              "template.canon-project-overlay-manifest",
              "template.canon-extension-intake"
            ]
          },
          {
            "exportPath": "./overlays/intake",
            "classification": "registry-artifact",
            "registryPolicy": "registry-covered",
            "score": 15,
            "rationale": "Overlay intake inventory scans project overlay manifests and routes extension-intake evidence without promoting primitives automatically.",
            "registryItemIds": [
              "template.canon-extension-intake"
            ]
          },
          {
            "exportPath": "./registry",
            "classification": "registry-artifact",
            "registryPolicy": "registry-covered",
            "score": 15,
            "rationale": "Registry API is the Canon source of truth for discoverable artifacts and lifecycle rules.",
            "registryItemIds": [
              "template.canon-extension-intake",
              "template.canon-project-overlay-manifest"
            ]
          }
        ],
        "docsPaths": [
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
    "total": 27,
    "approvalRequired": 27
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
