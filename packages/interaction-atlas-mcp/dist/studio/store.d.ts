import type { AtlasCanvasNode, AtlasCanvasNodeKind, AtlasCanvasNodeStatus, AtlasSession, AtlasSessionActor } from './types.js';
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
    createdBy?: AtlasSessionActor;
};
type UpdateNodeInput = Partial<Omit<AtlasCanvasNode, 'id' | 'createdBy'>>;
type AddEdgeInput = {
    source: string;
    target: string;
    label?: string;
    evidence?: string;
    createdBy?: AtlasSessionActor;
};
type AddObservationInput = {
    text: string;
    source?: AtlasSessionActor;
    suggest?: boolean;
};
export declare function getStudioHome(cwd?: string): string;
export declare function getSessionPath(sessionId: string, cwd?: string): string;
export declare function createSession(input: CreateSessionInput, cwd?: string): Promise<AtlasSession>;
export declare function readSession(sessionId: string, cwd?: string): Promise<AtlasSession>;
export declare function writeSession(session: AtlasSession, cwd?: string): Promise<AtlasSession>;
export declare function listSessions(cwd?: string): Promise<AtlasSession[]>;
export declare function addNode(sessionId: string, input: AddNodeInput, cwd?: string): Promise<AtlasSession>;
export declare function updateNode(sessionId: string, nodeId: string, input: UpdateNodeInput, cwd?: string): Promise<AtlasSession>;
export declare function addEdge(sessionId: string, input: AddEdgeInput, cwd?: string): Promise<AtlasSession>;
export declare function addObservation(sessionId: string, input: AddObservationInput, cwd?: string): Promise<AtlasSession>;
export declare function acceptSuggestion(sessionId: string, suggestionId: string, cwd?: string): Promise<AtlasSession>;
export declare function exportSessionMarkdown(session: AtlasSession): string;
export {};
//# sourceMappingURL=store.d.ts.map