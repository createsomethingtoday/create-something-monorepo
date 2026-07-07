import {
  activateStoryStep,
  addStoryQuestion,
  advanceStoryStep,
  clearStoryFocus,
  readSession,
  setStoryFocus,
  type AddStoryQuestionInput,
  type SetStoryInput,
  type StoryStepDirection
} from './store.js';
import type { AtlasSession, AtlasSessionActor, AtlasStoryState } from './types.js';

export const ATLAS_STORY_API_VERSION = 1;

type StoryApiRecord = Record<string, unknown>;

export type AtlasStoryApiSource = 'http' | 'mcp' | 'tauri' | 'cli' | 'agent';

export type CanonStoryChapterLike = {
  id?: string;
  sequence?: number;
  kind?: string;
  eyebrow?: string;
  title?: string;
  body?: string;
  focusNodeIds?: string[];
  focus_node_ids?: string[];
  relationshipIds?: string[];
  relationship_ids?: string[];
  proofLabel?: string;
  proof_label?: string;
  state?: string;
};

export type CanonStoryArtifactLike = {
  version?: number;
  headline?: string;
  summary?: string;
  accessibilitySummary?: string;
  accessibility_summary?: string;
  chapters?: CanonStoryChapterLike[];
};

export type AtlasStoryApiFocusInput = SetStoryInput & {
  active_step_id?: string;
  callout_node_id?: string;
  callout_severity?: 'info' | 'risk' | 'decision';
  callout_text?: string;
  dim_unfocused?: boolean;
  focus_edge_ids?: string[];
  focus_node_ids?: string[];
  next_action?: string;
  operator?: boolean;
  storyArtifact?: CanonStoryArtifactLike;
  story_artifact?: CanonStoryArtifactLike;
};

export type AtlasStoryApiQuestionInput = AddStoryQuestionInput & {
  node_id?: string;
  operator?: boolean;
};

export type AtlasStoryApiMeta = {
  apiVersion: typeof ATLAS_STORY_API_VERSION;
  source: AtlasStoryApiSource;
  invalidFocusNodeIds: string[];
  invalidFocusEdgeIds: string[];
  storyContract: 'atlas-story-v1';
};

export type AtlasStoryApiResult = {
  meta: AtlasStoryApiMeta;
  session: AtlasSession;
  story: AtlasStoryState | undefined;
};

function asRecord(value: unknown): StoryApiRecord {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as StoryApiRecord)
    : {};
}

function firstString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value;
  }
  return undefined;
}

function firstBoolean(...values: unknown[]): boolean | undefined {
  for (const value of values) {
    if (typeof value === 'boolean') return value;
  }
  return undefined;
}

function firstArray(...values: unknown[]): unknown[] | undefined {
  for (const value of values) {
    if (Array.isArray(value)) return value;
  }
  return undefined;
}

function stringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.filter((item): item is string => typeof item === 'string' && item.length > 0);
}

function storyActor(input: StoryApiRecord): AtlasSessionActor {
  return input.operator === true || input.updatedBy === 'operator' || input.updated_by === 'operator'
    ? 'operator'
    : 'agent';
}

function normalizeCallouts(input: StoryApiRecord): SetStoryInput['callouts'] | undefined {
  const explicit = firstArray(input.callouts);
  if (explicit) {
    return explicit.map((item) => {
      const callout = asRecord(item);
      return {
        id: firstString(callout.id),
        nodeId: firstString(callout.nodeId, callout.node_id),
        severity:
          callout.severity === 'risk' || callout.severity === 'decision' ? callout.severity : 'info',
        text: firstString(callout.text) ?? ''
      };
    });
  }

  const text = firstString(input.calloutText, input.callout_text);
  if (!text) return undefined;
  return [
    {
      nodeId: firstString(input.calloutNodeId, input.callout_node_id),
      severity:
        input.calloutSeverity === 'risk' ||
        input.callout_severity === 'risk' ||
        input.calloutSeverity === 'decision' ||
        input.callout_severity === 'decision'
          ? ((input.calloutSeverity ?? input.callout_severity) as 'risk' | 'decision')
          : 'info',
      text
    }
  ];
}

function normalizeQuestions(input: StoryApiRecord): SetStoryInput['questions'] | undefined {
  const questions = firstArray(input.questions);
  if (!questions) return undefined;
  return questions.map((item) => {
    const question = asRecord(item);
    return {
      id: firstString(question.id),
      nodeId: firstString(question.nodeId, question.node_id),
      owner: firstString(question.owner),
      question: firstString(question.question) ?? '',
      status: question.status === 'answered' ? 'answered' : 'open'
    };
  });
}

function normalizeSteps(input: StoryApiRecord): SetStoryInput['steps'] | undefined {
  const steps = firstArray(input.steps);
  if (!steps) return undefined;
  return steps.map((item) => {
    const step = asRecord(item);
    const status = step.status === 'done' || step.status === 'current' || step.status === 'next'
      ? step.status
      : undefined;
    return {
      id: firstString(step.id),
      focusEdgeIds: stringArray(firstArray(step.focusEdgeIds, step.focus_edge_ids)),
      focusNodeIds: stringArray(firstArray(step.focusNodeIds, step.focus_node_ids)),
      owner: firstString(step.owner),
      proof: firstString(step.proof),
      status,
      summary: firstString(step.summary, step.body) ?? '',
      title: firstString(step.title) ?? ''
    };
  });
}

function normalizeCanonStoryArtifact(input: StoryApiRecord): Partial<SetStoryInput> {
  const artifact = asRecord(input.storyArtifact ?? input.story_artifact);
  const chapters = firstArray(artifact.chapters);
  if (!chapters) return {};

  const steps = chapters.map((item, index) => {
    const chapter = asRecord(item);
    return {
      id: firstString(chapter.id) ?? `chapter-${index + 1}`,
      focusEdgeIds: stringArray(firstArray(chapter.relationshipIds, chapter.relationship_ids)),
      focusNodeIds: stringArray(firstArray(chapter.focusNodeIds, chapter.focus_node_ids)),
      owner: firstString(chapter.eyebrow),
      proof: firstString(chapter.proofLabel, chapter.proof_label),
      status: index === 0 ? 'current' : 'next',
      summary: firstString(chapter.body) ?? '',
      title: firstString(chapter.title) ?? ''
    } satisfies NonNullable<SetStoryInput['steps']>[number];
  });

  return {
    activeStepId: steps[0]?.id,
    focusEdgeIds: steps[0]?.focusEdgeIds,
    focusNodeIds: steps[0]?.focusNodeIds,
    narration: firstString(steps[0]?.summary, artifact.summary, artifact.accessibilitySummary),
    steps,
    title: firstString(artifact.headline)
  };
}

export function normalizeStoryFocusInput(input: unknown): SetStoryInput {
  const record = asRecord(input);
  const artifactDefaults = normalizeCanonStoryArtifact(record);
  return {
    ...artifactDefaults,
    activeStepId: firstString(record.activeStepId, record.active_step_id) ?? artifactDefaults.activeStepId,
    callouts: normalizeCallouts(record),
    dimUnfocused:
      firstBoolean(record.dimUnfocused, record.dim_unfocused) ?? artifactDefaults.dimUnfocused,
    focusEdgeIds:
      stringArray(firstArray(record.focusEdgeIds, record.focus_edge_ids)) ?? artifactDefaults.focusEdgeIds,
    focusNodeIds:
      stringArray(firstArray(record.focusNodeIds, record.focus_node_ids)) ?? artifactDefaults.focusNodeIds,
    narration: firstString(record.narration) ?? artifactDefaults.narration,
    nextAction: firstString(record.nextAction, record.next_action) ?? artifactDefaults.nextAction,
    questions: normalizeQuestions(record),
    steps: normalizeSteps(record) ?? artifactDefaults.steps,
    title: firstString(record.title) ?? artifactDefaults.title,
    updatedBy: storyActor(record)
  };
}

export function normalizeStoryQuestionInput(input: unknown): AddStoryQuestionInput {
  const record = asRecord(input);
  return {
    nodeId: firstString(record.nodeId, record.node_id),
    owner: firstString(record.owner),
    question: firstString(record.question) ?? '',
    updatedBy: storyActor(record)
  };
}

function storyMeta(
  session: AtlasSession,
  source: AtlasStoryApiSource
): AtlasStoryApiMeta {
  const story = session.story;
  const nodeIds = new Set(session.canvas.nodes.map((node) => node.id));
  const edgeIds = new Set(session.canvas.edges.map((edge) => edge.id));
  return {
    apiVersion: ATLAS_STORY_API_VERSION,
    invalidFocusEdgeIds: (story?.focusEdgeIds ?? []).filter((id) => !edgeIds.has(id)),
    invalidFocusNodeIds: (story?.focusNodeIds ?? []).filter((id) => !nodeIds.has(id)),
    source,
    storyContract: 'atlas-story-v1'
  };
}

function storyResult(session: AtlasSession, source: AtlasStoryApiSource): AtlasStoryApiResult {
  return {
    meta: storyMeta(session, source),
    session,
    story: session.story
  };
}

export async function focusStory(
  sessionId: string,
  input: unknown,
  source: AtlasStoryApiSource,
  cwd = process.cwd()
): Promise<AtlasStoryApiResult> {
  const session = await setStoryFocus(sessionId, normalizeStoryFocusInput(input), cwd);
  return storyResult(session, source);
}

export async function addStoryApiQuestion(
  sessionId: string,
  input: unknown,
  source: AtlasStoryApiSource,
  cwd = process.cwd()
): Promise<AtlasStoryApiResult> {
  const session = await addStoryQuestion(sessionId, normalizeStoryQuestionInput(input), cwd);
  return storyResult(session, source);
}

export async function clearStory(
  sessionId: string,
  source: AtlasStoryApiSource,
  cwd = process.cwd()
): Promise<AtlasStoryApiResult> {
  const session = await clearStoryFocus(sessionId, {}, cwd);
  return storyResult(session, source);
}

export async function activateStoryApiStep(
  sessionId: string,
  stepId: string,
  source: AtlasStoryApiSource,
  cwd = process.cwd()
): Promise<AtlasStoryApiResult> {
  const session = await activateStoryStep(sessionId, stepId, cwd);
  return storyResult(session, source);
}

export async function advanceStoryApiStep(
  sessionId: string,
  direction: StoryStepDirection,
  source: AtlasStoryApiSource,
  cwd = process.cwd()
): Promise<AtlasStoryApiResult> {
  const session = await advanceStoryStep(sessionId, direction, cwd);
  return storyResult(session, source);
}

export async function getStory(
  sessionId: string,
  source: AtlasStoryApiSource,
  cwd = process.cwd()
): Promise<AtlasStoryApiResult> {
  const session = await readSession(sessionId, cwd);
  return storyResult(session, source);
}

export function storySessionPayload(result: AtlasStoryApiResult): {
  meta: AtlasStoryApiMeta;
  session: AtlasSession;
  story: AtlasStoryState | undefined;
} {
  return {
    meta: result.meta,
    session: result.session,
    story: result.story
  };
}
