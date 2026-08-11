/**
 * Renderer-neutral composition contracts for Atlas presentation artifacts.
 *
 * This package owns no tenant state, renderer state, execution authority, or
 * source-system records. It makes one durable Map module composable across a
 * human Arc, a reusable Playbook, and an operating Runbook.
 */

export const ATLAS_COMPOSITION_SCHEMA = 'create-something/atlas-composition@1' as const;
export const ATLAS_STORY_ADAPTER_SCHEMA = 'atlas-story-v1' as const;

export type AtlasMotionCue =
  | 'signal-reveal'
  | 'module-focus'
  | 'handoff-trace'
  | 'decision-gate'
  | 'recovery-loop'
  | 'proof-stamp'
  | 'none';

export type AtlasRouteKind = 'arc' | 'playbook' | 'runbook';
export type AtlasSceneKind = 'signal' | 'automation' | 'map' | 'judgment' | 'runbook' | 'receipt';
export type AtlasActionStatus = 'proposed' | 'approved' | 'rejected' | 'completed';
export type AtlasPresentationLayout =
  | 'statement'
  | 'split'
  | 'capabilities'
  | 'image'
  | 'code'
  | 'map'
  | 'decision'
  | 'branches'
  | 'demo'
  | 'proof';

export type AtlasStakeholderRole = 'Creator' | 'Reviewer' | 'Partnerships & Support' | 'Leadership';

export type AtlasCapabilityExplanation = {
  nodeId: string;
  title: string;
  can: string;
  produces: string;
  boundary: string;
};

export type AtlasMapVersion = {
  id?: string;
  mode: 'pinned' | 'live';
};

export type AtlasMapModule = {
  id: string;
  title: string;
  description: string;
  map: {
    mapId: string;
    version: AtlasMapVersion;
  };
  selection: {
    edgeIds: string[];
    nodeIds: string[];
  };
};

export type AtlasArtifact = {
  id: string;
  kind: 'evidence' | 'guide' | 'media' | 'receipt' | 'specification';
  title: string;
  summary: string;
  provenance: {
    alt: string;
    costUsd: number | null;
    model: string;
    promptReference: string;
    rights: string;
    source: string;
  };
};

export type AtlasScenePresentation = {
  layout: AtlasPresentationLayout;
  eyebrow: string;
  reader: {
    heading: string;
    explanation: string;
    takeaway: string;
    stakeholders: Array<{
      role: AtlasStakeholderRole;
      meaning: string;
    }>;
  };
  branches?: Array<{
    explanation: string;
    label: string;
    next: string;
  }>;
  callout?: {
    detail: string;
    label: string;
    value: string;
  };
  code?: {
    content: string;
    filename: string;
    language: 'json' | 'typescript';
  };
  media?: {
    artifactId: string;
    caption: string;
    placement: 'beside-copy' | 'full-bleed';
  };
  relationships?: Array<{
    fromNodeId: string;
    label: string;
    toNodeId: string;
  }>;
  capabilities?: AtlasCapabilityExplanation[];
};

export type AtlasCompositionScene = {
  id: string;
  kind: AtlasSceneKind;
  label: string;
  title: string;
  summary: string;
  detail: string;
  artifactIds: string[];
  evidence: string[];
  mapModuleIds: string[];
  focusNodeIds: string[];
  presentation: AtlasScenePresentation;
  motion: {
    cue: AtlasMotionCue;
    reducedMotion: 'static-emphasis';
    source: 'agent-authored-structured-data';
  };
};

export type AtlasCompositionRoute = {
  id: string;
  kind: AtlasRouteKind;
  title: string;
  description: string;
  sceneIds: string[];
};

export type AtlasComposition = {
  schema: typeof ATLAS_COMPOSITION_SCHEMA;
  id: string;
  title: string;
  description: string;
  mode: 'local-fixture';
  mapModules: AtlasMapModule[];
  artifacts: AtlasArtifact[];
  routes: AtlasCompositionRoute[];
  scenes: AtlasCompositionScene[];
};

export type AtlasMapSnapshot = {
  mapId: string;
  latestVersion: string;
  versions: string[];
};

export type AtlasMapModuleResolution = {
  map: AtlasMapSnapshot;
  module: AtlasMapModule;
  resolvedVersion: string;
  versionMode: AtlasMapVersion['mode'];
};

export type AtlasActionProposal = {
  actionId: string;
  arcId: string;
  description: string;
  gate: 'approval';
  proposedBy: string;
  status: AtlasActionStatus;
  title: string;
  boundaries: string[];
  decision?: {
    decidedBy: string;
    value: 'approved' | 'rejected';
  };
};

export type AtlasActionReceipt = {
  actionId: string;
  evidence: string;
  id: string;
  issuer: string;
  kind: 'proof';
  mode: 'local-fixture';
  status: 'recorded';
};

export type AtlasCompositionValidation = {
  ok: boolean;
  issues: string[];
};

export type AtlasRegistryArcStep = {
  id: string;
  title: string;
  detail: string;
};

export type AtlasRegistryArcDefinition = {
  id: string;
  title: string;
  description: string;
  owner: string;
  boundary: string;
  proof: string;
  source: string;
  steps: AtlasRegistryArcStep[];
};

const APP_REVIEW_MAP_MODULE_ID = 'app-review-governance-map';

const APP_REVIEW_GOVERNANCE_ARTIFACTS: AtlasArtifact[] = [
  {
    id: 'app-review-evidence-gate-media',
    kind: 'media',
    title: 'Evidence gate study',
    summary:
      'A generated operating still used as an explanatory composition: the source sheet reaches an inspectable human decision gate without claiming a real review outcome.',
    provenance: {
      alt: 'An ivory source sheet crosses a measured grid toward a physical decision gate, marked by blue, gold, and green state dots.',
      costUsd: null,
      model: 'gpt-image-2 via built-in ImageGen',
      promptReference:
        'packages/agency/content/assets/brand/agency-app-review-governance-evidence-gate.v20260811/source/prompt.md',
      rights: 'Original CREATE SOMETHING model output; no reference images or third-party marks. Review before reuse.',
      source: '/images/arcs/app-review-governance-evidence-gate.v1.png'
    }
  },
  {
    id: 'app-submission-form-contract',
    kind: 'evidence',
    title: 'App Submission Form',
    summary:
      'The creator-facing submission form starts a review request with explicit evidence; it hands off a candidate, never a decision.',
    provenance: {
      alt: 'A creator submits a Marketplace App candidate with the review materials that make the request inspectable.',
      costUsd: 0,
      model: 'not-applicable—submission contract',
      promptReference: 'app-review-governance-arc.intake.v1',
      rights: 'First-party skill documentation with official submission guidance.',
      source: 'skills/webflow-app-preflight/reference/listing-and-submission.md'
    }
  },
  {
    id: 'app-review-preflight-contract',
    kind: 'evidence',
    title: 'App Review Preflight',
    summary:
      'The controlled Preflight system returns bundle and runtime observations as evidence; it does not approve, reject, or replace human policy judgment.',
    provenance: {
      alt: 'A controlled Preflight run returns immutable evidence while the Marketplace decision remains human-owned.',
      costUsd: 0,
      model: 'not-applicable—controlled runtime evidence contract',
      promptReference: 'app-review-governance-arc.preflight.v1',
      rights: 'First-party operational documentation.',
      source: 'skills/WEBFLOW_APP_DEVELOPER_TOOLKIT.md'
    }
  },
  {
    id: 'webflow-app-preflight-skill-contract',
    kind: 'guide',
    title: 'Webflow App Preflight skills',
    summary:
      'Versioned pre-submission skills make the functional, secure, inspectable, and honest quality gate explicit before a reviewer receives the candidate.',
    provenance: {
      alt: 'A versioned skill turns the pre-submission quality gate into an inspectable operating artifact.',
      costUsd: 0,
      model: 'not-applicable—versioned skill contract',
      promptReference: 'app-review-governance-arc.preflight.v1',
      rights: 'First-party skill documentation.',
      source: 'skills/webflow-app-preflight/SKILL.md'
    }
  },
  {
    id: 'app-governance-architecture',
    kind: 'evidence',
    title: 'Governance source boundary',
    summary: 'D1 owns durable governance state; Airtable remains a human workspace and projection.',
    provenance: {
      alt: 'A source-boundary evidence record for the App Governance database.',
      costUsd: 0,
      model: 'not-applicable—repository source contract',
      promptReference: 'app-review-governance-arc.evidence.v1',
      rights: 'First-party repository documentation.',
      source: 'packages/app-governance-db/README.md'
    }
  },
  {
    id: 'slack-signal-contract',
    kind: 'evidence',
    title: 'Signal intake contract',
    summary: 'A Claude agent reads a Slack signal through a user-scoped MCP and normalizes it through the governed boundary.',
    provenance: {
      alt: 'A signal travels from Slack through an agent to a governed write boundary.',
      costUsd: 0,
      model: 'not-applicable—repository source contract',
      promptReference: 'app-review-governance-arc.evidence.v1',
      rights: 'First-party repository documentation.',
      source: 'packages/app-governance-db/README.md'
    }
  },
  {
    id: 'zendesk-context-contract',
    kind: 'evidence',
    title: 'Partner-context boundary',
    summary: 'Zendesk remains the partner and support conversation, linked as context instead of replacing governance state.',
    provenance: {
      alt: 'A Zendesk context artifact remains linked to, but separate from, the governance record.',
      costUsd: 0,
      model: 'not-applicable—repository source contract',
      promptReference: 'app-review-governance-arc.evidence.v1',
      rights: 'First-party repository documentation.',
      source: 'packages/webflow-app-review-mcp/README.md'
    }
  },
  {
    id: 'action-gate-contract',
    kind: 'specification',
    title: 'Approval-gated workflow action',
    summary: 'An agent may propose a bounded action; an operator must approve or reject it before execution.',
    provenance: {
      alt: 'An action moves from proposal through an operator decision before it can execute.',
      costUsd: 0,
      model: 'not-applicable—workflow action contract',
      promptReference: 'app-review-governance-arc.action.v1',
      rights: 'First-party repository migration contract.',
      source: 'packages/app-governance-db/migrations/0010_workflow_actions.sql'
    }
  },
  {
    id: 'receipt-contract',
    kind: 'receipt',
    title: 'Receipt contract',
    summary: 'The governed runtime records proof, decision, handoff, sync, or error evidence as a receipt.',
    provenance: {
      alt: 'A receipt shows the evidence returned after a bounded workflow action.',
      costUsd: 0,
      model: 'not-applicable—workflow receipt contract',
      promptReference: 'app-review-governance-arc.receipt.v1',
      rights: 'First-party repository documentation.',
      source: 'packages/app-governance-db/README.md'
    }
  },
  {
    id: 'motion-authoring-contract',
    kind: 'media',
    title: 'AI-native motion specification',
    summary: 'An agent may author structured motion cues and accessibility metadata; the renderer owns execution.',
    provenance: {
      alt: 'A data-authored presentation scene moves from signal to proof without autoplay-only meaning.',
      costUsd: 0,
      model: 'not-applicable—structured motion data, not generated media',
      promptReference: 'app-review-governance-arc.motion.v1',
      rights: 'First-party local fixture; no third-party or generated bitmap asset.',
      source: 'packages/atlas-composition/src/index.ts'
    }
  }
];

export const APP_REVIEW_GOVERNANCE_COMPOSITION: AtlasComposition = {
  schema: ATLAS_COMPOSITION_SCHEMA,
  id: 'app-review-governance',
  title: 'App Review Governance',
  description:
    'A local presentation fixture showing how an App Review signal becomes an operator decision and a receipt without collapsing source-system authority.',
  mode: 'local-fixture',
  mapModules: [
    {
      id: APP_REVIEW_MAP_MODULE_ID,
      title: 'App Review governance map',
      description: 'One explicit, pinned map module reused by the Arc, Playbook, and Runbook.',
      map: {
        mapId: 'app-review-governance-canonical-map',
        version: { id: '2026-08-11', mode: 'pinned' }
      },
      selection: {
        nodeIds: [
          'app-submission-form',
          'app-review-preflight',
          'webflow-app-preflight-skills',
          'slack-signal',
          'claude-agent',
          'app-governance-mcp',
          'd1-governance-record',
          'airtable-projection',
          'zendesk-context',
          'operator-decision',
          'workflow-receipt'
        ],
        edgeIds: [
          'submission-form-to-preflight',
          'preflight-to-skills',
          'preflight-skills-to-mcp',
          'signal-to-agent',
          'agent-to-mcp',
          'mcp-to-d1',
          'd1-to-airtable',
          'zendesk-to-d1',
          'd1-to-operator',
          'operator-to-receipt'
        ]
      }
    }
  ],
  artifacts: APP_REVIEW_GOVERNANCE_ARTIFACTS,
  scenes: [
    {
      id: 'intake-preflight',
      kind: 'automation',
      label: 'Intake & Preflight',
      title: 'A submission becomes inspectable before review begins.',
      summary: 'Form → Preflight app → skills gate → governed review record.',
      detail:
        'The App Submission Form starts the candidate handoff. App Review Preflight returns controlled evidence, and the versioned Preflight skills make the quality gate legible. Each result is evidence, not an approval; the governed record and operator decision remain explicit.',
      artifactIds: [
        'app-submission-form-contract',
        'app-review-preflight-contract',
        'webflow-app-preflight-skill-contract',
        'motion-authoring-contract'
      ],
      evidence: [
        'Submission and preflight make the candidate inspectable; they never grant Marketplace approval.',
        'The Preflight result is controlled evidence, not a review decision.'
      ],
      mapModuleIds: [APP_REVIEW_MAP_MODULE_ID],
      focusNodeIds: [
        'app-submission-form',
        'app-review-preflight',
        'webflow-app-preflight-skills',
        'app-governance-mcp'
      ],
      presentation: {
        layout: 'split',
        eyebrow: '01 / Intake & Preflight',
        reader: {
          heading: 'A developer submits an app.',
          explanation:
            'The system checks the form, runs App Review Preflight, and gathers the evidence a reviewer needs. The app is ready to inspect, not approved.',
          takeaway: 'Evidence comes before review',
          stakeholders: [
            { role: 'Creator', meaning: 'You can see what is missing before a reviewer decides.' },
            { role: 'Reviewer', meaning: 'You receive one inspectable package instead of scattered evidence.' }
          ]
        },
        callout: {
          label: 'Quality gate',
          value: 'Evidence first',
          detail: 'The submission, controlled Preflight, and versioned skills make a candidate inspectable before a reviewer ever decides.'
        },
        media: {
          artifactId: 'app-review-evidence-gate-media',
          caption: 'The source reaches an evidence gate; it does not become an approval.',
          placement: 'beside-copy'
        }
      },
      motion: {
        cue: 'handoff-trace',
        reducedMotion: 'static-emphasis',
        source: 'agent-authored-structured-data'
      }
    },
    {
      id: 'preflight-capabilities',
      kind: 'automation',
      label: 'Preflight roles',
      title: 'The form, Preflight app, and skills check different layers.',
      summary: 'Handoff completeness → controlled evidence → developer readiness.',
      detail:
        'The submission form validates the handoff. App Review Preflight inspects artifacts and controlled runtime observations. The versioned skills help a developer prepare the app and cite gaps. None can approve the app.',
      artifactIds: [
        'app-submission-form-contract',
        'app-review-preflight-contract',
        'webflow-app-preflight-skill-contract',
        'motion-authoring-contract'
      ],
      evidence: [
        'Static artifact checks and controlled runtime observations are separate evidence lanes.',
        'The form, Preflight app, and skills cannot grant Marketplace approval.'
      ],
      mapModuleIds: [APP_REVIEW_MAP_MODULE_ID],
      focusNodeIds: ['app-submission-form', 'app-review-preflight', 'webflow-app-preflight-skills'],
      presentation: {
        layout: 'capabilities',
        eyebrow: '02 / Preflight roles',
        reader: {
          heading: 'Three tools make the submission inspectable.',
          explanation:
            'The form checks the handoff. Preflight checks the evidence. The skills help the developer prepare. Each returns a different kind of proof, and none makes the review decision.',
          takeaway: 'Different checks, one visible boundary',
          stakeholders: [
            { role: 'Creator', meaning: 'You can tell which tool found a problem and what to fix next.' },
            { role: 'Reviewer', meaning: 'You can distinguish submitted facts, automated evidence, and developer readiness guidance.' }
          ]
        },
        capabilities: [
          {
            nodeId: 'app-submission-form',
            title: 'Submission form',
            can:
              'Checks the fields required for the selected submission type, basic link and file formatting, and whether the review materials are present.',
            produces:
              'One canonical review request with the creator answers, review links and access details, and the submitted bundle or private review artifacts.',
            boundary:
              'A complete form proves the handoff is ready. It does not decide whether the app meets Marketplace quality or policy.'
          },
          {
            nodeId: 'app-review-preflight',
            title: 'App Review Preflight',
            can:
              'Inspects bundle identity and source-map reviewability. In its controlled runtime lane, it observes published hash or SRI, readiness, loaded scripts, and proxy behavior.',
            produces:
              'A bounded evidence result naming the artifact or runtime observed, the checks run, and the findings returned to the developer or reviewer.',
            boundary:
              'Static checks cannot prove live behavior. Runtime evidence can observe behavior, but it cannot approve or reject the app.'
          },
          {
            nodeId: 'webflow-app-preflight-skills',
            title: 'Preflight skills',
            can:
              'Walk the app and its evidence through functional, security, inspectability, OAuth and backend, custom-code lifecycle, listing, and demo checks.',
            produces:
              'Cited checklist findings, concrete remediation steps, and a submit or do-not-submit readiness recommendation.',
            boundary:
              'The versioned skills prepare evidence and can drift as public guidance changes. They do not promise reviewer acceptance.'
          }
        ]
      },
      motion: {
        cue: 'module-focus',
        reducedMotion: 'static-emphasis',
        source: 'agent-authored-structured-data'
      }
    },
    {
      id: 'signal',
      kind: 'signal',
      label: 'Notify',
      title: 'The submission reaches the review team.',
      summary: 'The form starts the request; Slack alerts the team.',
      detail:
        'The submitted form remains the intake. A Slack message alerts the team and stays attached as source context before anything becomes governed work.',
      artifactIds: ['slack-signal-contract', 'motion-authoring-contract'],
      evidence: ['Slack is an intake signal, not the durable governance record.'],
      mapModuleIds: [APP_REVIEW_MAP_MODULE_ID],
      focusNodeIds: ['slack-signal', 'claude-agent'],
      presentation: {
        layout: 'statement',
        eyebrow: '03 / Signal',
        reader: {
          heading: 'The submission reaches the review team.',
          explanation:
            'The form creates the review request. Slack tells the team it is ready. The alert stays attached as context, but it does not become the official record.',
          takeaway: 'One request, one clear alert',
          stakeholders: [
            { role: 'Creator', meaning: 'Your submitted form stays attached to the review.' },
            { role: 'Reviewer', meaning: 'The alert tells you where the review package is waiting.' }
          ]
        },
        callout: {
          label: 'Source boundary',
          value: 'The form starts the request',
          detail: 'Slack alerts the team. It does not replace the submitted form or become the official review record.'
        }
      },
      motion: {
        cue: 'signal-reveal',
        reducedMotion: 'static-emphasis',
        source: 'agent-authored-structured-data'
      }
    },
    {
      id: 'normalize',
      kind: 'automation',
      label: 'Normalize',
      title: 'The agent turns context into a governed item.',
      summary: 'MCP bounds the write path.',
      detail:
        'The agent writes normalized, idempotent work through the App Governance MCP. It does not write directly into a presentation or silently inherit approval.',
      artifactIds: ['slack-signal-contract', 'app-governance-architecture', 'motion-authoring-contract'],
      evidence: ['The governed MCP boundary makes retries and ownership inspectable.'],
      mapModuleIds: [APP_REVIEW_MAP_MODULE_ID],
      focusNodeIds: ['claude-agent', 'app-governance-mcp', 'd1-governance-record'],
      presentation: {
        layout: 'code',
        eyebrow: '04 / Normalize',
        reader: {
          heading: 'An agent prepares the review item.',
          explanation:
            'Claude gathers the submitted evidence and prepares a proposed review item through the governed write path. The agent can organize the work. It cannot approve it.',
          takeaway: 'The agent prepares; a person approves',
          stakeholders: [
            { role: 'Reviewer', meaning: 'You get a prepared item and still own the judgment.' },
            { role: 'Leadership', meaning: 'Automation removes setup work without removing accountability.' }
          ]
        },
        code: {
          language: 'typescript',
          filename: 'app-governance-normalize.ts',
          content: `const governedItem = await appGovernance.create({
  source: slackSignal.id,
  preflight: preflight.receiptId,
  status: 'proposed'
});

// No direct Airtable write. No approval implied.`
        },
        callout: {
          label: 'MCP boundary',
          value: 'Write with policy',
          detail: 'The agent can construct the governed item through a bounded interface. It cannot manufacture approval.'
        }
      },
      motion: {
        cue: 'handoff-trace',
        reducedMotion: 'static-emphasis',
        source: 'agent-authored-structured-data'
      }
    },
    {
      id: 'review-capabilities',
      kind: 'judgment',
      label: 'Review roles',
      title: 'The agent, MCP, and human hold different authority.',
      summary: 'Agent prepares → MCP constrains → reviewer decides.',
      detail:
        'The agent organizes evidence and proposes. The Governance MCP exposes and records bounded operations. The human reviewer validates the evidence and owns the decision.',
      artifactIds: ['app-governance-architecture', 'action-gate-contract', 'motion-authoring-contract'],
      evidence: [
        'The agent recommendation and the reviewer decision remain distinct states.',
        'The governed path records authority; it does not invent it.'
      ],
      mapModuleIds: [APP_REVIEW_MAP_MODULE_ID],
      focusNodeIds: ['claude-agent', 'app-governance-mcp', 'operator-decision'],
      presentation: {
        layout: 'capabilities',
        eyebrow: '05 / Review roles',
        reader: {
          heading: 'Automation stops where judgment begins.',
          explanation:
            'Automation can organize evidence and make the next action legible. The governed interface limits what can happen. A named person still owns approval, rejection, changes, or escalation.',
          takeaway: 'Preparation, permission, and judgment stay separate',
          stakeholders: [
            { role: 'Reviewer', meaning: 'You receive prepared evidence and retain final authority.' },
            { role: 'Leadership', meaning: 'You can see where automation stops and accountable judgment begins.' }
          ]
        },
        capabilities: [
          {
            nodeId: 'claude-agent',
            title: 'Review agent',
            can:
              'Reads the submitted evidence and attached source context, organizes the findings, and drafts a proposed review item or creator update.',
            produces:
              'A structured proposal with its sources, findings, current status, and the smallest intended next action.',
            boundary:
              'The agent can prepare and recommend. It cannot silently approve the app or execute a state change.'
          },
          {
            nodeId: 'app-governance-mcp',
            title: 'Governance MCP',
            can:
              'Exposes named review operations, validates their inputs, and sends permitted reads or writes through the governed system boundary.',
            produces:
              'A traceable record change or explicit failure tied to the operation, actor, source evidence, and policy boundary.',
            boundary:
              'The MCP constrains and records the path. It does not supply reviewer judgment or invent human authorization.'
          },
          {
            nodeId: 'operator-decision',
            title: 'Human reviewer',
            can:
              'Validates the evidence, tests gaps automation cannot settle, and requests changes, rejects, approves, or escalates an exception.',
            produces:
              'An attributable decision with a reason, owner, and clear next step for the creator and review team.',
            boundary:
              'The decision stays human-owned. A green form, scan, skill, agent recommendation, or MCP call cannot imply approval.'
          }
        ]
      },
      motion: {
        cue: 'module-focus',
        reducedMotion: 'static-emphasis',
        source: 'agent-authored-structured-data'
      }
    },
    {
      id: 'orient',
      kind: 'map',
      label: 'Orient',
      title: 'One map makes source, context, and projection visible.',
      summary: 'D1 is durable; Airtable is human-readable.',
      detail:
        'The map keeps the governed record distinct from its Airtable projection and from linked Zendesk context, so an operator can see why each object appears.',
      artifactIds: ['app-governance-architecture', 'zendesk-context-contract', 'motion-authoring-contract'],
      evidence: ['Airtable is a workspace/projection; Zendesk remains linked partner context.'],
      mapModuleIds: [APP_REVIEW_MAP_MODULE_ID],
      focusNodeIds: ['d1-governance-record', 'airtable-projection', 'zendesk-context'],
      presentation: {
        layout: 'map',
        eyebrow: '06 / Orient',
        reader: {
          heading: 'Each system keeps one clear job.',
          explanation:
            'The partner conversation stays attached as supporting context. The durable record stores the decision. The team workspace presents a readable view without becoming a second source of truth.',
          takeaway: 'One record with clear supporting context',
          stakeholders: [
            { role: 'Partnerships & Support', meaning: 'Your conversation stays visible without becoming the decision.' },
            { role: 'Leadership', meaning: 'You can trace one accountable record across the process.' }
          ]
        },
        callout: {
          label: 'Source of truth',
          value: 'One durable review record',
          detail: 'The team workspace stays readable and the partner conversation stays conversational, but neither replaces the official record.'
        },
        relationships: [
          {
            fromNodeId: 'zendesk-context',
            label: 'Keeps context attached',
            toNodeId: 'd1-governance-record'
          },
          {
            fromNodeId: 'd1-governance-record',
            label: 'Projects a readable view',
            toNodeId: 'airtable-projection'
          }
        ]
      },
      motion: {
        cue: 'module-focus',
        reducedMotion: 'static-emphasis',
        source: 'agent-authored-structured-data'
      }
    },
    {
      id: 'decide',
      kind: 'judgment',
      label: 'Decide',
      title: 'The operator decides the bounded next action.',
      summary: 'Proposed is not approved.',
      detail:
        'An agent can draft the smallest reversible action. Approval, rejection, owner, and policy gate remain explicit human judgment.',
      artifactIds: ['action-gate-contract', 'motion-authoring-contract'],
      evidence: ['Workflow actions have explicit proposed, approved, rejected, and completed states.'],
      mapModuleIds: [APP_REVIEW_MAP_MODULE_ID],
      focusNodeIds: ['d1-governance-record', 'operator-decision'],
      presentation: {
        layout: 'decision',
        eyebrow: '07 / Decide',
        reader: {
          heading: 'A person decides what happens next.',
          explanation:
            'The agent may draft a creator update. Proposed means waiting. Approved means the update may run. Request changes, rejection, and exceptions all stay visible.',
          takeaway: 'Proposed means waiting',
          stakeholders: [
            { role: 'Creator', meaning: 'You receive a clear outcome and the reason behind it.' },
            { role: 'Reviewer', meaning: 'You approve, reject, or request changes before any action runs.' }
          ]
        },
        callout: {
          label: 'Human judgment',
          value: 'Proposed is not approved',
          detail: 'The agent can draft the smallest reversible next step. An operator still owns approval, rejection, and accountability.'
        },
      },
      motion: {
        cue: 'decision-gate',
        reducedMotion: 'static-emphasis',
        source: 'agent-authored-structured-data'
      }
    },
    {
      id: 'recover',
      kind: 'judgment',
      label: 'Recover',
      title: 'A request for changes keeps the process moving.',
      summary: 'A no becomes a documented next step, not a dead end.',
      detail:
        'A failed preflight or review can return clear changes to the creator, close the candidate with a reason, or escalate an exception for added sign-off. A revised app re-enters through Intake with its earlier context preserved.',
      artifactIds: ['app-review-preflight-contract', 'zendesk-context-contract', 'action-gate-contract'],
      evidence: [
        'Request changes returns a clear summary and lets a revised app re-enter through Intake.',
        'Exceptions require added human sign-off before any bounded action can run.'
      ],
      mapModuleIds: [APP_REVIEW_MAP_MODULE_ID],
      focusNodeIds: [
        'app-submission-form',
        'app-review-preflight',
        'zendesk-context',
        'operator-decision'
      ],
      presentation: {
        layout: 'branches',
        eyebrow: '08 / Recover',
        reader: {
          heading: 'A no creates a clear way forward.',
          explanation:
            'If preflight or review finds a problem, the creator receives the reason and the next step. A revised app returns to Intake. A risky exception waits for added human sign-off.',
          takeaway: 'Every stop has a next step',
          stakeholders: [
            { role: 'Creator', meaning: 'You know what to change and where a revision re-enters.' },
            { role: 'Partnerships & Support', meaning: 'You can carry context into an exception without bypassing review.' },
            { role: 'Leadership', meaning: 'Failure and escalation paths are visible, not hidden in chat.' }
          ]
        },
        branches: [
          {
            label: 'Request changes',
            explanation: 'Send the creator a concrete list of changes. Preserve the evidence already gathered.',
            next: 'Revise and return to Intake'
          },
          {
            label: 'Reject',
            explanation: 'Record the reason and close this candidate. Keep the decision available for later review.',
            next: 'Close with a visible reason'
          },
          {
            label: 'Escalate an exception',
            explanation: 'Attach partner context and require added sign-off before any action can run.',
            next: 'Wait for dual approval'
          }
        ],
        callout: {
          label: 'Recovery path',
          value: 'Revise, close, or escalate',
          detail: 'A no is useful only when the next step and owner are clear.'
        }
      },
      motion: {
        cue: 'recovery-loop',
        reducedMotion: 'static-emphasis',
        source: 'agent-authored-structured-data'
      }
    },
    {
      id: 'run',
      kind: 'runbook',
      label: 'Run',
      title: 'The approved action follows the bounded runbook.',
      summary: 'The action can run only after its gate clears.',
      detail:
        'This fixture simulates a local requested-changes handoff. It has no production target, sends no message, and has no right to execute a rejected proposal.',
      artifactIds: ['action-gate-contract', 'motion-authoring-contract'],
      evidence: ['The prototype action is local-only and returns no production claim.'],
      mapModuleIds: [APP_REVIEW_MAP_MODULE_ID],
      focusNodeIds: ['operator-decision', 'app-governance-mcp', 'workflow-receipt'],
      presentation: {
        layout: 'demo',
        eyebrow: '09 / Run',
        reader: {
          heading: 'Only the approved action can run.',
          explanation:
            'After approval, the governed write path records the bounded step and keeps the result tied to the review. This demo stays in the browser and sends no message.',
          takeaway: 'Approval unlocks one bounded step',
          stakeholders: [
            { role: 'Creator', meaning: 'Only the update a reviewer approved can be prepared for you.' },
            { role: 'Reviewer', meaning: 'Your approval unlocks one named action, not open-ended access.' }
          ]
        },
        callout: {
          label: 'Execution boundary',
          value: 'One approved creator update',
          detail: 'The demo records a simulated requested-changes handoff. It has no production target and sends no external message.'
        }
      },
      motion: {
        cue: 'recovery-loop',
        reducedMotion: 'static-emphasis',
        source: 'agent-authored-structured-data'
      }
    },
    {
      id: 'proof',
      kind: 'receipt',
      label: 'Proof',
      title: 'The result returns as a receipt, not a chat claim.',
      summary: 'Proof closes the Arc.',
      detail:
        'The visible receipt states the issuer, evidence, mode, and boundary so the story can end with an inspectable artifact instead of an assertion.',
      artifactIds: ['receipt-contract', 'motion-authoring-contract'],
      evidence: ['Receipts record proof, decision, handoff, sync, or error evidence.'],
      mapModuleIds: [APP_REVIEW_MAP_MODULE_ID],
      focusNodeIds: ['workflow-receipt', 'd1-governance-record'],
      presentation: {
        layout: 'proof',
        eyebrow: '10 / Proof',
        reader: {
          heading: 'The system records what happened.',
          explanation:
            'The receipt names the issuer, the action, the result, and the runtime boundary. A reviewer can inspect the record instead of trusting a chat summary.',
          takeaway: 'A receipt closes the review',
          stakeholders: [
            { role: 'Reviewer', meaning: 'You can inspect the action and result after the handoff.' },
            { role: 'Leadership', meaning: 'You get an auditable record instead of a status claim.' }
          ]
        },
        callout: {
          label: 'Close the Arc',
          value: 'Show the receipt',
          detail: 'A visible issuer, evidence string, runtime mode, and boundary close the story with an inspectable artifact.'
        }
      },
      motion: {
        cue: 'proof-stamp',
        reducedMotion: 'static-emphasis',
        source: 'agent-authored-structured-data'
      }
    }
  ],
  routes: [
    {
      id: 'app-review-governance-arc',
      kind: 'arc',
      title: 'App Review Governance Arc',
      description: 'Follow an app from submission to a final receipt.',
      sceneIds: [
        'intake-preflight',
        'preflight-capabilities',
        'signal',
        'normalize',
        'review-capabilities',
        'orient',
        'decide',
        'recover',
        'run',
        'proof'
      ]
    },
    {
      id: 'app-review-governance-playbook',
      kind: 'playbook',
      title: 'App Review Governance Playbook',
      description:
        'Reuse the review method: collect evidence, keep each source clear, require a person to decide, and record proof.',
      sceneIds: [
        'intake-preflight',
        'preflight-capabilities',
        'signal',
        'normalize',
        'review-capabilities',
        'orient',
        'decide',
        'recover',
        'proof'
      ]
    },
    {
      id: 'app-review-governance-runbook',
      kind: 'runbook',
      title: 'App Review Governance Runbook',
      description:
        'Run one review: gather context, wait for approval, take one bounded action, and record the result.',
      sceneIds: [
        'intake-preflight',
        'preflight-capabilities',
        'review-capabilities',
        'orient',
        'decide',
        'recover',
        'run',
        'proof'
      ]
    }
  ]
};

function hasDuplicates(values: string[]): boolean {
  return new Set(values).size !== values.length;
}

function findById<T extends { id: string }>(items: T[], id: string, kind: string): T {
  const item = items.find((candidate) => candidate.id === id);
  if (!item) throw new Error(`${kind} not found: ${id}`);
  return item;
}

export function validateAtlasComposition(composition: AtlasComposition): AtlasCompositionValidation {
  const issues: string[] = [];
  if (composition.schema !== ATLAS_COMPOSITION_SCHEMA) {
    issues.push(`Unsupported composition schema: ${composition.schema}`);
  }

  const moduleIds = composition.mapModules.map((module) => module.id);
  const artifactIds = composition.artifacts.map((artifact) => artifact.id);
  const sceneIds = composition.scenes.map((scene) => scene.id);
  const routeIds = composition.routes.map((route) => route.id);
  for (const [kind, ids] of [
    ['map module', moduleIds],
    ['artifact', artifactIds],
    ['scene', sceneIds],
    ['route', routeIds]
  ] as const) {
    if (hasDuplicates(ids)) issues.push(`Duplicate ${kind} ids are not composable.`);
  }

  for (const module of composition.mapModules) {
    if ('nestedModuleIds' in module) {
      issues.push(`Map module ${module.id} declares nested map modules; map modules must be flat references.`);
    }
    if (module.map.version.mode === 'pinned' && !module.map.version.id) {
      issues.push(`Pinned map module ${module.id} is missing a version id.`);
    }
    if (!module.selection.nodeIds.length) issues.push(`Map module ${module.id} has no selected nodes.`);
  }

  for (const scene of composition.scenes) {
    if (!scene.mapModuleIds.length) issues.push(`Scene ${scene.id} has no reusable map module.`);
    if (scene.motion.cue === 'none') issues.push(`Scene ${scene.id} has no motion cue.`);
    if (scene.motion.reducedMotion !== 'static-emphasis') {
      issues.push(`Scene ${scene.id} must define a static reduced-motion equivalent.`);
    }
    const layouts: AtlasPresentationLayout[] = [
      'statement',
      'split',
      'capabilities',
      'image',
      'code',
      'map',
      'decision',
      'branches',
      'demo',
      'proof'
    ];
    if (!layouts.includes(scene.presentation.layout)) {
      issues.push(`Scene ${scene.id} has an unsupported presentation layout.`);
    }
    if (
      !scene.presentation.reader.heading.trim() ||
      !scene.presentation.reader.explanation.trim() ||
      !scene.presentation.reader.takeaway.trim()
    ) {
      issues.push(`Scene ${scene.id} must define complete reader-facing presentation copy.`);
    }
    if (
      !scene.presentation.reader.stakeholders.length ||
      scene.presentation.reader.stakeholders.some(
        (stakeholder) => !stakeholder.role.trim() || !stakeholder.meaning.trim()
      )
    ) {
      issues.push(`Scene ${scene.id} must explain what it means for at least one stakeholder.`);
    }
    if ((scene.presentation.layout === 'split' || scene.presentation.layout === 'image') && !scene.presentation.media) {
      issues.push(`Scene ${scene.id} requires a media composition.`);
    }
    if (scene.presentation.media) {
      const media = composition.artifacts.find((artifact) => artifact.id === scene.presentation.media?.artifactId);
      if (!media || media.kind !== 'media') {
        issues.push(`Scene ${scene.id} references an invalid media composition artifact.`);
      }
    }
    if (scene.presentation.layout === 'code' && !scene.presentation.code) {
      issues.push(`Scene ${scene.id} requires a code composition.`);
    }
    if (
      scene.presentation.layout === 'capabilities' &&
      (scene.presentation.capabilities?.length ?? 0) < 2
    ) {
      issues.push(`Scene ${scene.id} requires at least two capability explanations.`);
    }
    if (scene.presentation.code && !scene.presentation.code.content.trim()) {
      issues.push(`Scene ${scene.id} has an empty code composition.`);
    }
    if (scene.presentation.layout === 'branches' && (scene.presentation.branches?.length ?? 0) < 2) {
      issues.push(`Scene ${scene.id} requires at least two visible branches.`);
    }
    if (scene.presentation.layout === 'map' && !scene.presentation.relationships?.length) {
      issues.push(`Scene ${scene.id} requires at least one visible map relationship.`);
    }
    const selectedNodeIds = new Set(
      scene.mapModuleIds.flatMap(
        (moduleId) => composition.mapModules.find((module) => module.id === moduleId)?.selection.nodeIds ?? []
      )
    );
    for (const relationship of scene.presentation.relationships ?? []) {
      if (!relationship.label.trim()) {
        issues.push(`Scene ${scene.id} has an unlabeled map relationship.`);
      }
      for (const nodeId of [relationship.fromNodeId, relationship.toNodeId]) {
        if (!scene.focusNodeIds.includes(nodeId)) {
          issues.push(`Scene ${scene.id} relationship must connect a focused node: ${nodeId}.`);
        } else if (!selectedNodeIds.has(nodeId)) {
          issues.push(`Scene ${scene.id} relationship references a node outside its shared map module: ${nodeId}.`);
        }
      }
    }
    for (const capability of scene.presentation.capabilities ?? []) {
      if (
        !capability.title.trim() ||
        !capability.can.trim() ||
        !capability.produces.trim() ||
        !capability.boundary.trim()
      ) {
        issues.push(`Scene ${scene.id} capability explanations must define a complete reader contract.`);
      }
      if (!scene.focusNodeIds.includes(capability.nodeId)) {
        issues.push(`Scene ${scene.id} capability must describe a focused node: ${capability.nodeId}.`);
      } else if (!selectedNodeIds.has(capability.nodeId)) {
        issues.push(
          `Scene ${scene.id} capability references a node outside its shared map module: ${capability.nodeId}.`
        );
      }
    }
    for (const id of scene.mapModuleIds) {
      if (!moduleIds.includes(id)) issues.push(`Scene ${scene.id} references unknown map module ${id}.`);
    }
    for (const id of scene.artifactIds) {
      if (!artifactIds.includes(id)) issues.push(`Scene ${scene.id} references unknown artifact ${id}.`);
    }
  }

  for (const route of composition.routes) {
    if (!route.sceneIds.length) issues.push(`Route ${route.id} contains no scenes.`);
    for (const id of route.sceneIds) {
      if (!sceneIds.includes(id)) issues.push(`Route ${route.id} references unknown scene ${id}.`);
    }
  }

  return { ok: issues.length === 0, issues };
}

function registryArcNodeId(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'step';
}

/**
 * Project a registered Playbook or Runbook into the shared presentation
 * contract. The source registry remains authoritative; this adapter creates no
 * second workflow record, permission model, or execution state.
 */
export function createRegistryArcComposition(
  definition: AtlasRegistryArcDefinition
): AtlasComposition {
  if (definition.steps.length < 2) {
    throw new Error(`Registry Arc ${definition.id} requires at least two steps.`);
  }

  const compositionId = registryArcNodeId(definition.id);
  const mapModuleId = `${compositionId}-map`;
  const stepNodeIds = definition.steps.map(
    (step, index) => `${compositionId}-step-${index + 1}-${registryArcNodeId(step.id)}`
  );
  const gateNodeId = `${compositionId}-operator-gate`;
  const receiptNodeId = `${compositionId}-proof-receipt`;
  const nodeIds = [...stepNodeIds, gateNodeId, receiptNodeId];
  const relationshipPairs = nodeIds.slice(0, -1).map((fromNodeId, index) => ({
    fromNodeId,
    label:
      index === stepNodeIds.length - 1
        ? 'waits for'
        : index === stepNodeIds.length
          ? 'records'
          : 'hands off',
    toNodeId: nodeIds[index + 1]
  }));
  const artifactId = `${compositionId}-source`;
  const receiptArtifactId = `${compositionId}-receipt-contract`;

  const scenes: AtlasCompositionScene[] = [
    {
      id: `${compositionId}-orient`,
      kind: 'signal',
      label: 'Orient',
      title: definition.title,
      summary: definition.description,
      detail: `${definition.description} The registered source remains authoritative while this Arc explains the operating route.`,
      artifactIds: [artifactId],
      evidence: [`Registered source: ${definition.source}`],
      mapModuleIds: [mapModuleId],
      focusNodeIds: [stepNodeIds[0]],
      presentation: {
        layout: 'statement',
        eyebrow: '01 / Orient',
        reader: {
          heading: definition.title,
          explanation: definition.description,
          takeaway: 'Start from the registered operating method',
          stakeholders: [
            {
              role: 'Leadership',
              meaning: 'You can see the intended outcome and accountable route before work begins.'
            }
          ]
        },
        callout: {
          label: 'Owner',
          value: definition.owner,
          detail: 'The source registry names the method; the Arc makes its route legible.'
        }
      },
      motion: {
        cue: 'signal-reveal',
        reducedMotion: 'static-emphasis',
        source: 'agent-authored-structured-data'
      }
    },
    {
      id: `${compositionId}-map`,
      kind: 'map',
      label: 'Shared map',
      title: 'One route carries the work from signal to proof.',
      summary: `${definition.steps.length} registered steps, one operator gate, and one proof receipt.`,
      detail:
        'The Arc, Playbook, and Runbook reuse this flat map module rather than creating separate workflow graphs.',
      artifactIds: [artifactId],
      evidence: [
        `${definition.steps.length} steps are projected directly from ${definition.source}.`
      ],
      mapModuleIds: [mapModuleId],
      focusNodeIds: nodeIds,
      presentation: {
        layout: 'map',
        eyebrow: '02 / Map',
        reader: {
          heading: 'See the whole operating route.',
          explanation:
            'Each handoff stays ordered, the human boundary stays visible, and proof remains the terminal state.',
          takeaway: `${definition.steps.length} steps · one gate · one receipt`,
          stakeholders: [
            {
              role: 'Creator',
              meaning: 'You can inspect the expected sequence before running it.'
            },
            { role: 'Reviewer', meaning: 'You can see where judgment remains human-owned.' }
          ]
        },
        relationships: relationshipPairs,
        callout: {
          label: 'Shared module',
          value: `${definition.steps.length} registered steps`,
          detail: definition.boundary
        }
      },
      motion: {
        cue: 'handoff-trace',
        reducedMotion: 'static-emphasis',
        source: 'agent-authored-structured-data'
      }
    },
    {
      id: `${compositionId}-runbook`,
      kind: 'runbook',
      label: 'Runbook',
      title: 'Execute the registered route in order.',
      summary: 'The Runbook is the executable route through the Playbook, not a second copy of it.',
      detail: definition.steps
        .map((step, index) => `${index + 1}. ${step.title}: ${step.detail}`)
        .join('\n'),
      artifactIds: [artifactId],
      evidence: definition.steps.map((step) => step.title),
      mapModuleIds: [mapModuleId],
      focusNodeIds: stepNodeIds,
      presentation: {
        layout: 'branches',
        eyebrow: '03 / Runbook',
        reader: {
          heading: 'Follow the route without losing the boundary.',
          explanation:
            'The ordered steps carry the operating detail. Each remains traceable to the typed source registry.',
          takeaway: `${definition.steps.length} executable steps`,
          stakeholders: [
            { role: 'Creator', meaning: 'You get the exact sequence and handoff context.' },
            {
              role: 'Reviewer',
              meaning: 'You can stop or redirect the route at the named boundary.'
            }
          ]
        },
        branches: definition.steps.map((step, index) => ({
          explanation: step.detail,
          label: `${String(index + 1).padStart(2, '0')} · ${step.title}`,
          next: definition.steps[index + 1]?.title ?? 'Operator gate'
        })),
        callout: {
          label: 'Route',
          value: 'Run in order',
          detail: 'Nothing here grants new execution authority.'
        }
      },
      motion: {
        cue: 'module-focus',
        reducedMotion: 'static-emphasis',
        source: 'agent-authored-structured-data'
      }
    },
    {
      id: `${compositionId}-gate`,
      kind: 'judgment',
      label: 'Decision gate',
      title: 'Authority stays with the named operator.',
      summary: definition.boundary,
      detail: `Owner: ${definition.owner}. ${definition.boundary}`,
      artifactIds: [artifactId],
      evidence: [definition.boundary],
      mapModuleIds: [mapModuleId],
      focusNodeIds: [gateNodeId],
      presentation: {
        layout: 'decision',
        eyebrow: '04 / Judgment',
        reader: {
          heading: 'Pause at the decision boundary.',
          explanation: definition.boundary,
          takeaway: `Owner: ${definition.owner}`,
          stakeholders: [
            {
              role: 'Reviewer',
              meaning: 'You retain the authority to approve, redirect, or stop the route.'
            }
          ]
        },
        callout: { label: 'Human boundary', value: definition.owner, detail: definition.boundary }
      },
      motion: {
        cue: 'decision-gate',
        reducedMotion: 'static-emphasis',
        source: 'agent-authored-structured-data'
      }
    },
    {
      id: `${compositionId}-proof`,
      kind: 'receipt',
      label: 'Proof',
      title: 'Close with inspectable proof.',
      summary: definition.proof,
      detail:
        'The Arc describes the expected proof contract. It does not fabricate a completed run or receipt.',
      artifactIds: [receiptArtifactId],
      evidence: [definition.proof],
      mapModuleIds: [mapModuleId],
      focusNodeIds: [receiptNodeId],
      presentation: {
        layout: 'proof',
        eyebrow: '05 / Proof',
        reader: {
          heading: 'Return evidence, not a status claim.',
          explanation: definition.proof,
          takeaway: 'The expected receipt is named before execution',
          stakeholders: [
            {
              role: 'Leadership',
              meaning: 'You know what evidence should exist when the route completes.'
            }
          ]
        },
        callout: { label: 'Expected proof', value: 'Receipt required', detail: definition.proof }
      },
      motion: {
        cue: 'proof-stamp',
        reducedMotion: 'static-emphasis',
        source: 'agent-authored-structured-data'
      }
    }
  ];

  return {
    schema: ATLAS_COMPOSITION_SCHEMA,
    id: compositionId,
    title: definition.title,
    description: definition.description,
    mode: 'local-fixture',
    mapModules: [
      {
        id: mapModuleId,
        title: `${definition.title} map`,
        description:
          'A read-only projection of the registered route reused by the Arc, Playbook, and Runbook.',
        map: { mapId: `registry:${definition.id}`, version: { id: 'registry-v1', mode: 'pinned' } },
        selection: {
          nodeIds,
          edgeIds: relationshipPairs.map(
            (relationship, index) => `${compositionId}-edge-${index + 1}`
          )
        }
      }
    ],
    artifacts: [
      {
        id: artifactId,
        kind: 'guide',
        title: `${definition.title} source`,
        summary: 'The typed registry entry that owns this Arc content.',
        provenance: {
          alt: `Registered source for ${definition.title}.`,
          costUsd: 0,
          model: 'not-applicable—typed registry adapter',
          promptReference: 'registry-arc-adapter.v1',
          rights: 'First-party CREATE SOMETHING registry content.',
          source: definition.source
        }
      },
      {
        id: receiptArtifactId,
        kind: 'receipt',
        title: 'Expected proof contract',
        summary: definition.proof,
        provenance: {
          alt: `Expected proof contract for ${definition.title}.`,
          costUsd: 0,
          model: 'not-applicable—read-only proof specification',
          promptReference: 'registry-arc-adapter.v1',
          rights: 'First-party CREATE SOMETHING composition contract.',
          source: definition.source
        }
      }
    ],
    routes: [
      {
        id: `${compositionId}-arc`,
        kind: 'arc',
        title: `${definition.title} Arc`,
        description: `Understand ${definition.title} from orientation through proof.`,
        sceneIds: scenes.map((scene) => scene.id)
      },
      {
        id: `${compositionId}-playbook`,
        kind: 'playbook',
        title: `${definition.title} Playbook`,
        description: 'Reuse the method, boundary, and proof contract.',
        sceneIds: [scenes[0].id, scenes[1].id, scenes[3].id, scenes[4].id]
      },
      {
        id: `${compositionId}-runbook-route`,
        kind: 'runbook',
        title: `${definition.title} Runbook`,
        description: 'Execute the ordered steps while preserving the named decision gate.',
        sceneIds: [scenes[0].id, scenes[2].id, scenes[3].id, scenes[4].id]
      }
    ],
    scenes
  };
}

export function resolveMapModule(
  composition: AtlasComposition,
  moduleId: string,
  getMap: (mapId: string) => AtlasMapSnapshot
): AtlasMapModuleResolution {
  const module = findById(composition.mapModules, moduleId, 'Map module');
  const map = getMap(module.map.mapId);
  if (map.mapId !== module.map.mapId) {
    throw new Error(`Map resolver returned ${map.mapId} for module ${module.id}.`);
  }

  const resolvedVersion =
    module.map.version.mode === 'pinned' ? module.map.version.id : map.latestVersion;
  if (!resolvedVersion) throw new Error(`Map module ${module.id} has no resolvable version.`);
  if (!map.versions.includes(resolvedVersion)) {
    throw new Error(`Map version ${resolvedVersion} is unavailable for ${map.mapId}.`);
  }

  return { map, module, resolvedVersion, versionMode: module.map.version.mode };
}

export function toAtlasStoryAdapter(
  composition: AtlasComposition,
  routeId: string
): {
  ephemeral: true;
  route: AtlasCompositionRoute;
  schema: typeof ATLAS_STORY_ADAPTER_SCHEMA;
  scenes: Array<{
    id: string;
    motionCue: 'highlight-nodes' | 'trace-handoff' | 'reveal-proof';
    presentation: AtlasScenePresentation;
    title: string;
  }>;
} {
  const route = findById(composition.routes, routeId, 'Composition route');
  const motionCueBySceneCue: Record<Exclude<AtlasMotionCue, 'none'>, 'highlight-nodes' | 'trace-handoff' | 'reveal-proof'> = {
    'signal-reveal': 'highlight-nodes',
    'module-focus': 'highlight-nodes',
    'handoff-trace': 'trace-handoff',
    'decision-gate': 'highlight-nodes',
    'recovery-loop': 'trace-handoff',
    'proof-stamp': 'reveal-proof'
  };

  return {
    ephemeral: true,
    route,
    schema: ATLAS_STORY_ADAPTER_SCHEMA,
    scenes: route.sceneIds.map((sceneId) => {
      const scene = findById(composition.scenes, sceneId, 'Composition scene');
      if (scene.motion.cue === 'none') throw new Error(`Scene ${scene.id} has no adapter motion cue.`);
      return {
        id: scene.id,
        motionCue: motionCueBySceneCue[scene.motion.cue],
        presentation: scene.presentation,
        title: scene.title
      };
    })
  };
}

export function proposeArcAction(
  composition: AtlasComposition,
  input: { proposedBy: string }
): AtlasActionProposal {
  const validation = validateAtlasComposition(composition);
  if (!validation.ok) throw new Error(`Invalid composition: ${validation.issues.join(' ')}`);
  if (!input.proposedBy.trim()) throw new Error('An agent identity is required to propose an action.');

  return {
    actionId: 'send-creator-requested-changes-summary',
    arcId: composition.id,
    title: 'Send the creator the requested-changes summary',
    description:
      'Prepare a local preview of the requested-changes summary and record the intended handoff. No message is sent and no external system is read or written.',
    gate: 'approval',
    proposedBy: input.proposedBy.trim(),
    status: 'proposed',
    boundaries: [
      'Local fixture only.',
      'No Airtable, Slack, Zendesk, D1, or production mutation.',
      'A rejected proposal cannot execute.'
    ]
  };
}

export function decideArcAction(
  proposal: AtlasActionProposal,
  input: { decidedBy: string; decision: 'approved' | 'rejected' }
): AtlasActionProposal {
  if (proposal.status !== 'proposed') throw new Error(`Only proposed actions can be decided; received ${proposal.status}.`);
  if (!input.decidedBy.trim()) throw new Error('An operator identity is required to decide an action.');

  return {
    ...proposal,
    status: input.decision,
    decision: { decidedBy: input.decidedBy.trim(), value: input.decision }
  };
}

export function executeArcAction(
  action: AtlasActionProposal,
  input: { executor: string }
): { action: Omit<AtlasActionProposal, 'status'> & { status: 'completed' }; receipt: AtlasActionReceipt } {
  if (action.status !== 'approved') {
    throw new Error(`Action ${action.actionId} must be approved before it can execute.`);
  }
  if (!input.executor.trim()) throw new Error('A runtime identity is required to issue a receipt.');

  return {
    action: { ...action, status: 'completed' },
    receipt: {
      id: `receipt-${action.actionId}`,
      actionId: action.actionId,
      kind: 'proof',
      issuer: input.executor.trim(),
      mode: 'local-fixture',
      status: 'recorded',
      evidence: 'Local fixture recorded a simulated requested-changes handoff; no message was sent and no external system was read or written.'
    }
  };
}
