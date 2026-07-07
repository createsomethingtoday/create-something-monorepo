import { type AddStoryQuestionInput, type SetStoryInput, type StoryStepDirection } from './store.js';
import type { AtlasSession, AtlasStoryState } from './types.js';
export declare const ATLAS_STORY_API_VERSION = 1;
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
export declare function normalizeStoryFocusInput(input: unknown): SetStoryInput;
export declare function normalizeStoryQuestionInput(input: unknown): AddStoryQuestionInput;
export declare function focusStory(sessionId: string, input: unknown, source: AtlasStoryApiSource, cwd?: string): Promise<AtlasStoryApiResult>;
export declare function addStoryApiQuestion(sessionId: string, input: unknown, source: AtlasStoryApiSource, cwd?: string): Promise<AtlasStoryApiResult>;
export declare function clearStory(sessionId: string, source: AtlasStoryApiSource, cwd?: string): Promise<AtlasStoryApiResult>;
export declare function activateStoryApiStep(sessionId: string, stepId: string, source: AtlasStoryApiSource, cwd?: string): Promise<AtlasStoryApiResult>;
export declare function advanceStoryApiStep(sessionId: string, direction: StoryStepDirection, source: AtlasStoryApiSource, cwd?: string): Promise<AtlasStoryApiResult>;
export declare function getStory(sessionId: string, source: AtlasStoryApiSource, cwd?: string): Promise<AtlasStoryApiResult>;
export declare function storySessionPayload(result: AtlasStoryApiResult): {
    meta: AtlasStoryApiMeta;
    session: AtlasSession;
    story: AtlasStoryState | undefined;
};
//# sourceMappingURL=story-api.d.ts.map