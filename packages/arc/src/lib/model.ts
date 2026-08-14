import {
  APP_REVIEW_GOVERNANCE_COMPOSITION,
  validateAtlasComposition,
  type AtlasComposition,
  type AtlasCompositionScene,
  type AtlasPresentationLayout
} from '@create-something/atlas-composition';

export const ARC_DOCUMENT_SCHEMA = 'create-something/arc-document@1' as const;
export const ARC_CUSTOMER_OWNER = 'Ejohnson@jandjhomehealth.com' as const;

export type ArcLifecycleStatus =
  | 'draft'
  | 'review'
  | 'approved'
  | 'published'
  | 'superseded'
  | 'archived';

export type ArcSceneMeta = {
  locked: boolean;
  hidden: boolean;
  notes: string;
  provenance: {
    author: 'human' | 'agent';
    model: string | null;
    prompt: string | null;
    createdAt: string;
  };
};

export type ArcProposal = {
  id: string;
  sceneId: string;
  kind: 'copy' | 'layout' | 'motion' | 'map-focus' | 'image' | 'speaker-notes';
  summary: string;
  patch: ArcScenePatch;
  model: string;
  prompt: string;
  status: 'proposed' | 'accepted' | 'rejected';
  createdAt: string;
};

export type ArcComment = {
  id: string;
  sceneId: string | null;
  author: string;
  body: string;
  resolved: boolean;
  createdAt: string;
};

export type ArcDocument = {
  schema: typeof ARC_DOCUMENT_SCHEMA;
  id: string;
  ownerContact: string;
  title: string;
  description: string;
  status: ArcLifecycleStatus;
  revision: number;
  publishedRevision: number | null;
  createdAt: string;
  updatedAt: string;
  composition: AtlasComposition;
  sceneMeta: Record<string, ArcSceneMeta>;
  proposals: ArcProposal[];
  comments: ArcComment[];
};

export type ArcScenePatch = {
  label?: string;
  heading?: string;
  explanation?: string;
  takeaway?: string;
  layout?: AtlasPresentationLayout;
  notes?: string;
  focusNodeIds?: string[];
  motionCue?: AtlasCompositionScene['motion']['cue'];
  callout?: {
    label: string;
    value: string;
    detail: string;
  };
  code?: {
    filename: string;
    language: 'json' | 'typescript';
    content: string;
  };
};

export type ArcCommand =
  | { type: 'add_scene'; afterSceneId?: string; routeId?: string }
  | { type: 'duplicate_scene'; sceneId: string }
  | { type: 'remove_scene'; sceneId: string }
  | { type: 'reorder_scene'; sceneId: string; toIndex: number; routeId?: string }
  | { type: 'patch_scene'; sceneId: string; patch: ArcScenePatch }
  | { type: 'set_scene_lock'; sceneId: string; locked: boolean }
  | { type: 'set_scene_hidden'; sceneId: string; hidden: boolean }
  | {
      type: 'propose_scene_patch';
      sceneId: string;
      kind: ArcProposal['kind'];
      summary: string;
      patch: ArcScenePatch;
      model: string;
      prompt: string;
    }
  | { type: 'decide_scene_proposal'; proposalId: string; decision: 'accepted' | 'rejected' }
  | { type: 'add_comment'; sceneId?: string; body: string }
  | { type: 'resolve_comment'; commentId: string }
  | { type: 'request_review' }
  | { type: 'approve'; reason: string }
  | { type: 'reject'; reason: string }
  | { type: 'publish' }
  | { type: 'archive' }
  | { type: 'recover' };

export type ArcCommandContext = {
  actor: string;
  now: string;
  id: () => string;
};

export type ArcCommandResult = {
  document: ArcDocument;
  summary: string;
  changedSceneIds: string[];
};

const editableStatuses = new Set<ArcLifecycleStatus>(['draft', 'review']);

function clone<T>(value: T): T {
  return structuredClone(value);
}

function sceneById(document: ArcDocument, sceneId: string): AtlasCompositionScene {
  const scene = document.composition.scenes.find((candidate) => candidate.id === sceneId);
  if (!scene) throw new Error(`Scene not found: ${sceneId}. Refresh the Arc and choose a visible scene.`);
  return scene;
}

function routeById(document: ArcDocument, routeId = 'app-review-governance-arc') {
  const route = document.composition.routes.find((candidate) => candidate.id === routeId);
  if (!route) throw new Error(`Route not found: ${routeId}. Inspect the Arc routes resource first.`);
  return route;
}

function assertEditable(document: ArcDocument) {
  if (!editableStatuses.has(document.status)) {
    throw new Error(`Arc is ${document.status}. Recover it to a draft before editing scenes.`);
  }
}

function assertUnlocked(document: ArcDocument, sceneId: string) {
  if (document.sceneMeta[sceneId]?.locked) {
    throw new Error(`Scene ${sceneId} is locked. Unlock it before changing or moving it.`);
  }
}

function cleanText(value: string, label: string, max = 4_000): string {
  const clean = value.trim();
  if (!clean) throw new Error(`${label} cannot be empty.`);
  if (clean.length > max) throw new Error(`${label} must be ${max} characters or fewer.`);
  return clean;
}

function newScene(id: string, now: string): AtlasCompositionScene {
  return {
    id,
    kind: 'signal',
    label: 'New scene',
    title: 'New scene',
    summary: 'Explain the next part of the operating story.',
    detail: 'Write the plain-language explanation before adding technical evidence.',
    artifactIds: [],
    evidence: [],
    mapModuleIds: ['app-review-governance-map'],
    focusNodeIds: [],
    presentation: {
      layout: 'statement',
      eyebrow: 'Draft scene',
      reader: {
        heading: 'What should the audience understand here?',
        explanation: 'Explain what happens, why it matters, what a person decides, and what proof remains.',
        takeaway: 'One clear idea',
        stakeholders: [
          {
            role: 'Reviewer',
            meaning: 'Use this scene to make the next decision and its evidence clear.'
          }
        ]
      },
      callout: {
        label: 'Draft',
        value: 'One clear idea',
        detail: 'Replace this draft with the smallest useful part of the story.'
      }
    },
    motion: {
      cue: 'signal-reveal',
      reducedMotion: 'static-emphasis',
      source: 'agent-authored-structured-data'
    }
  };
}

function defaultSceneMeta(now: string, author: 'human' | 'agent' = 'human'): ArcSceneMeta {
  return {
    locked: false,
    hidden: false,
    notes: '',
    provenance: { author, model: null, prompt: null, createdAt: now }
  };
}

export function createAppReviewArcDocument(now = new Date().toISOString()): ArcDocument {
  const composition = clone(APP_REVIEW_GOVERNANCE_COMPOSITION);
  return {
    schema: ARC_DOCUMENT_SCHEMA,
    id: composition.id,
    ownerContact: ARC_CUSTOMER_OWNER,
    title: composition.title,
    description: composition.description,
    status: 'draft',
    revision: 1,
    publishedRevision: null,
    createdAt: now,
    updatedAt: now,
    composition,
    sceneMeta: Object.fromEntries(
      composition.scenes.map((scene) => [scene.id, defaultSceneMeta(now, 'agent')])
    ),
    proposals: [],
    comments: []
  };
}

export function validateArcDocument(document: ArcDocument): string[] {
  const issues: string[] = [];
  if (document.schema !== ARC_DOCUMENT_SCHEMA) issues.push(`Unsupported Arc schema: ${document.schema}`);
  if (!document.ownerContact) issues.push('Customer owner contact is required.');
  issues.push(...validateAtlasComposition(document.composition).issues);
  const sceneIds = new Set(document.composition.scenes.map((scene) => scene.id));
  for (const sceneId of sceneIds) {
    if (!document.sceneMeta[sceneId]) issues.push(`Scene metadata missing: ${sceneId}`);
  }
  for (const sceneId of Object.keys(document.sceneMeta)) {
    if (!sceneIds.has(sceneId)) issues.push(`Orphaned scene metadata: ${sceneId}`);
  }
  return issues;
}

function patchScene(document: ArcDocument, sceneId: string, patch: ArcScenePatch) {
  assertUnlocked(document, sceneId);
  const scene = sceneById(document, sceneId);
  if (patch.label !== undefined) scene.label = cleanText(patch.label, 'Scene label', 80);
  if (patch.heading !== undefined) scene.presentation.reader.heading = cleanText(patch.heading, 'Heading', 240);
  if (patch.explanation !== undefined) {
    scene.presentation.reader.explanation = cleanText(patch.explanation, 'Explanation');
  }
  if (patch.takeaway !== undefined) {
    scene.presentation.reader.takeaway = cleanText(patch.takeaway, 'Takeaway', 160);
  }
  if (patch.layout !== undefined) scene.presentation.layout = patch.layout;
  if (patch.focusNodeIds !== undefined) scene.focusNodeIds = [...new Set(patch.focusNodeIds)];
  if (patch.motionCue !== undefined) scene.motion.cue = patch.motionCue;
  if (patch.callout !== undefined) {
    scene.presentation.callout = {
      label: cleanText(patch.callout.label, 'Callout label', 80),
      value: cleanText(patch.callout.value, 'Callout value', 240),
      detail: cleanText(patch.callout.detail, 'Callout detail')
    };
  }
  if (patch.code !== undefined) {
    scene.presentation.code = {
      filename: cleanText(patch.code.filename, 'Filename', 160),
      language: patch.code.language,
      content: cleanText(patch.code.content, 'Code', 16_000)
    };
  }
  if (patch.notes !== undefined) document.sceneMeta[sceneId].notes = patch.notes.trim().slice(0, 8_000);
}

export function applyArcCommand(
  source: ArcDocument,
  command: ArcCommand,
  context: ArcCommandContext
): ArcCommandResult {
  const document = clone(source);
  let summary = '';
  let changedSceneIds: string[] = [];

  if (command.type === 'add_scene') {
    assertEditable(document);
    const route = routeById(document, command.routeId);
    const id = `scene-${context.id()}`;
    const scene = newScene(id, context.now);
    document.composition.scenes.push(scene);
    document.sceneMeta[id] = defaultSceneMeta(context.now);
    const afterIndex = command.afterSceneId ? route.sceneIds.indexOf(command.afterSceneId) : -1;
    route.sceneIds.splice(afterIndex >= 0 ? afterIndex + 1 : route.sceneIds.length, 0, id);
    changedSceneIds = [id];
    summary = `Added scene ${id}.`;
  } else if (command.type === 'duplicate_scene') {
    assertEditable(document);
    assertUnlocked(document, command.sceneId);
    const sourceScene = sceneById(document, command.sceneId);
    const id = `${sourceScene.id}-copy-${context.id()}`;
    const duplicate = clone(sourceScene);
    duplicate.id = id;
    duplicate.label = `${sourceScene.label} copy`;
    document.composition.scenes.push(duplicate);
    document.sceneMeta[id] = { ...clone(document.sceneMeta[sourceScene.id]), locked: false };
    for (const route of document.composition.routes) {
      const index = route.sceneIds.indexOf(sourceScene.id);
      if (index >= 0) route.sceneIds.splice(index + 1, 0, id);
    }
    changedSceneIds = [id];
    summary = `Duplicated ${sourceScene.label}.`;
  } else if (command.type === 'remove_scene') {
    assertEditable(document);
    assertUnlocked(document, command.sceneId);
    sceneById(document, command.sceneId);
    document.composition.scenes = document.composition.scenes.filter((scene) => scene.id !== command.sceneId);
    for (const route of document.composition.routes) {
      route.sceneIds = route.sceneIds.filter((sceneId) => sceneId !== command.sceneId);
      if (route.sceneIds.length === 0) throw new Error(`Cannot remove the final scene from ${route.title}.`);
    }
    delete document.sceneMeta[command.sceneId];
    changedSceneIds = [command.sceneId];
    summary = `Removed scene ${command.sceneId}.`;
  } else if (command.type === 'reorder_scene') {
    assertEditable(document);
    assertUnlocked(document, command.sceneId);
    const route = routeById(document, command.routeId);
    const from = route.sceneIds.indexOf(command.sceneId);
    if (from < 0) throw new Error(`Scene ${command.sceneId} is not part of ${route.title}.`);
    const to = Math.max(0, Math.min(command.toIndex, route.sceneIds.length - 1));
    route.sceneIds.splice(from, 1);
    route.sceneIds.splice(to, 0, command.sceneId);
    changedSceneIds = [command.sceneId];
    summary = `Moved scene ${command.sceneId} to position ${to + 1}.`;
  } else if (command.type === 'patch_scene') {
    assertEditable(document);
    patchScene(document, command.sceneId, command.patch);
    changedSceneIds = [command.sceneId];
    summary = `Updated scene ${command.sceneId}.`;
  } else if (command.type === 'set_scene_lock') {
    assertEditable(document);
    sceneById(document, command.sceneId);
    document.sceneMeta[command.sceneId].locked = command.locked;
    changedSceneIds = [command.sceneId];
    summary = `${command.locked ? 'Locked' : 'Unlocked'} scene ${command.sceneId}.`;
  } else if (command.type === 'set_scene_hidden') {
    assertEditable(document);
    assertUnlocked(document, command.sceneId);
    sceneById(document, command.sceneId);
    document.sceneMeta[command.sceneId].hidden = command.hidden;
    changedSceneIds = [command.sceneId];
    summary = `${command.hidden ? 'Hid' : 'Revealed'} scene ${command.sceneId}.`;
  } else if (command.type === 'propose_scene_patch') {
    assertEditable(document);
    assertUnlocked(document, command.sceneId);
    sceneById(document, command.sceneId);
    const proposal: ArcProposal = {
      id: `proposal-${context.id()}`,
      sceneId: command.sceneId,
      kind: command.kind,
      summary: cleanText(command.summary, 'Proposal summary', 500),
      patch: clone(command.patch),
      model: cleanText(command.model, 'Model', 160),
      prompt: cleanText(command.prompt, 'Prompt', 4_000),
      status: 'proposed',
      createdAt: context.now
    };
    document.proposals.push(proposal);
    changedSceneIds = [command.sceneId];
    summary = `Prepared ${command.kind} proposal ${proposal.id}; no scene content changed.`;
  } else if (command.type === 'decide_scene_proposal') {
    assertEditable(document);
    const proposal = document.proposals.find((candidate) => candidate.id === command.proposalId);
    if (!proposal) throw new Error(`Proposal not found: ${command.proposalId}. Refresh proposals first.`);
    if (proposal.status !== 'proposed') throw new Error(`Proposal ${proposal.id} is already ${proposal.status}.`);
    proposal.status = command.decision;
    if (command.decision === 'accepted') {
      patchScene(document, proposal.sceneId, proposal.patch);
      document.sceneMeta[proposal.sceneId].provenance = {
        author: 'agent',
        model: proposal.model,
        prompt: proposal.prompt,
        createdAt: context.now
      };
    }
    changedSceneIds = [proposal.sceneId];
    summary = `${command.decision === 'accepted' ? 'Accepted' : 'Rejected'} proposal ${proposal.id}.`;
  } else if (command.type === 'add_comment') {
    if (command.sceneId) sceneById(document, command.sceneId);
    const comment: ArcComment = {
      id: `comment-${context.id()}`,
      sceneId: command.sceneId ?? null,
      author: context.actor,
      body: cleanText(command.body, 'Comment', 2_000),
      resolved: false,
      createdAt: context.now
    };
    document.comments.push(comment);
    changedSceneIds = comment.sceneId ? [comment.sceneId] : [];
    summary = `Added comment ${comment.id}.`;
  } else if (command.type === 'resolve_comment') {
    const comment = document.comments.find((candidate) => candidate.id === command.commentId);
    if (!comment) throw new Error(`Comment not found: ${command.commentId}.`);
    comment.resolved = true;
    changedSceneIds = comment.sceneId ? [comment.sceneId] : [];
    summary = `Resolved comment ${comment.id}.`;
  } else if (command.type === 'request_review') {
    if (document.status !== 'draft') throw new Error('Only a draft can be sent for review.');
    document.status = 'review';
    summary = 'Requested human review.';
  } else if (command.type === 'approve') {
    if (document.status !== 'review') throw new Error('Arc must be in review before it can be approved.');
    if (document.comments.some((comment) => !comment.resolved)) {
      throw new Error('Resolve open review comments before approval.');
    }
    cleanText(command.reason, 'Approval reason', 1_000);
    document.status = 'approved';
    summary = `Approved Arc: ${command.reason.trim()}`;
  } else if (command.type === 'reject') {
    if (document.status !== 'review') throw new Error('Arc must be in review before changes can be requested.');
    cleanText(command.reason, 'Rejection reason', 1_000);
    document.status = 'draft';
    summary = `Returned Arc to draft: ${command.reason.trim()}`;
  } else if (command.type === 'publish') {
    if (document.status !== 'approved') throw new Error('Only an approved Arc can be published.');
    document.status = 'published';
    document.publishedRevision = document.revision + 1;
    summary = 'Published an immutable approved Arc version.';
  } else if (command.type === 'archive') {
    if (document.status === 'archived') throw new Error('Arc is already archived.');
    document.status = 'archived';
    summary = 'Archived the Arc; no content was deleted.';
  } else if (command.type === 'recover') {
    if (!['published', 'archived', 'superseded'].includes(document.status)) {
      throw new Error(`A ${document.status} Arc does not need recovery.`);
    }
    document.status = 'draft';
    summary = 'Recovered a new editable draft from the retained Arc.';
  }

  document.revision += 1;
  document.updatedAt = context.now;
  const issues = validateArcDocument(document);
  if (issues.length) throw new Error(`Arc preflight failed: ${issues.join(' ')}`);
  return { document, summary, changedSceneIds };
}

export function visibleComposition(document: ArcDocument, routeId: string): AtlasComposition {
  const composition = clone(document.composition);
  const route = composition.routes.find((candidate) => candidate.id === routeId);
  if (!route) throw new Error(`Route not found: ${routeId}.`);
  route.sceneIds = route.sceneIds.filter((sceneId) => !document.sceneMeta[sceneId]?.hidden);
  return composition;
}
