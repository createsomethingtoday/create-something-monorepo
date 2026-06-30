import type { AtlasCanvasEdge, AtlasCanvasNode, AtlasCanvasNodeKind, AtlasCanvasNodeStatus, AtlasGovernanceRecordRef, AtlasGovernanceProductAttachment, AtlasSession, AtlasSessionActor, AtlasStoryCallout, AtlasStoryQuestion, AtlasStoryStep } from './types.js';
type CreateSessionInput = {
    client: string;
    workflow: string;
    owner?: string;
};
type AddNodeInput = {
    kind: AtlasCanvasNodeKind;
    label?: string;
    atlasId?: string;
    x?: number;
    y?: number;
    owner?: string;
    status?: AtlasCanvasNodeStatus;
    notes?: string;
    evidence?: string;
    products?: AtlasGovernanceProductAttachment[];
    createdBy?: AtlasSessionActor;
};
type UpdateNodeInput = Partial<Omit<AtlasCanvasNode, 'id' | 'createdBy'>>;
type AttachGovernanceRecordInput = Omit<AtlasGovernanceRecordRef, 'attachedAt' | 'attachedBy'> & {
    attachedBy?: AtlasSessionActor;
};
export type RemoveNodeResult = {
    removedEdges: AtlasCanvasEdge[];
    removedNode: AtlasCanvasNode;
    session: AtlasSession;
};
type AddEdgeInput = {
    source: string;
    target: string;
    label?: string;
    evidence?: string;
    createdBy?: AtlasSessionActor;
};
type UpdateEdgeInput = Partial<Omit<AtlasCanvasEdge, 'id' | 'createdBy' | 'source' | 'target'>>;
type AddObservationInput = {
    text: string;
    source?: AtlasSessionActor;
    suggest?: boolean;
};
type SetStoryInput = {
    activeStepId?: string;
    callouts?: Array<Omit<AtlasStoryCallout, 'id'> & {
        id?: string;
    }>;
    dimUnfocused?: boolean;
    focusEdgeIds?: string[];
    focusNodeIds?: string[];
    narration?: string;
    nextAction?: string;
    questions?: Array<Omit<AtlasStoryQuestion, 'id' | 'status'> & {
        id?: string;
        status?: AtlasStoryQuestion['status'];
    }>;
    steps?: Array<Omit<AtlasStoryStep, 'id'> & {
        id?: string;
    }>;
    title?: string;
    updatedBy?: AtlasSessionActor;
};
type AddStoryQuestionInput = Omit<AtlasStoryQuestion, 'id' | 'status'> & {
    updatedBy?: AtlasSessionActor;
};
type StoryStepDirection = 'next' | 'previous';
export declare function getStudioHome(cwd?: string): string;
export declare function getSessionPath(sessionId: string, cwd?: string): string;
export declare function createSession(input: CreateSessionInput, cwd?: string): Promise<AtlasSession>;
export declare function readSession(sessionId: string, cwd?: string): Promise<AtlasSession>;
export declare function writeSession(session: AtlasSession, cwd?: string): Promise<AtlasSession>;
export declare function listSessions(cwd?: string): Promise<AtlasSession[]>;
export declare function addNode(sessionId: string, input: AddNodeInput, cwd?: string): Promise<AtlasSession>;
export declare function updateNode(sessionId: string, nodeId: string, input: UpdateNodeInput, cwd?: string): Promise<AtlasSession>;
export declare function attachGovernanceRecord(sessionId: string, nodeId: string, input: AttachGovernanceRecordInput, cwd?: string): Promise<AtlasSession>;
export declare function updateNodes(sessionId: string, inputs: Array<{
    id: string;
} & UpdateNodeInput>, cwd?: string): Promise<AtlasSession>;
export declare function removeNode(sessionId: string, nodeId: string, cwd?: string): Promise<RemoveNodeResult>;
export declare function addEdge(sessionId: string, input: AddEdgeInput, cwd?: string): Promise<AtlasSession>;
export declare function updateEdge(sessionId: string, edgeId: string, input: UpdateEdgeInput, cwd?: string): Promise<AtlasSession>;
export declare function addObservation(sessionId: string, input: AddObservationInput, cwd?: string): Promise<AtlasSession>;
export declare function setStoryFocus(sessionId: string, input: SetStoryInput, cwd?: string): Promise<AtlasSession>;
export declare function activateStoryStep(sessionId: string, stepId: string, cwd?: string): Promise<AtlasSession>;
export declare function advanceStoryStep(sessionId: string, direction: StoryStepDirection, cwd?: string): Promise<AtlasSession>;
export declare function addStoryQuestion(sessionId: string, input: AddStoryQuestionInput, cwd?: string): Promise<AtlasSession>;
export declare function clearStoryFocus(sessionId: string, input?: {
    updatedBy?: AtlasSessionActor;
}, cwd?: string): Promise<AtlasSession>;
export declare function acceptSuggestion(sessionId: string, suggestionId: string, cwd?: string): Promise<AtlasSession>;
export declare function exportSessionMarkdown(session: AtlasSession): string;
export {};
//# sourceMappingURL=store.d.ts.map