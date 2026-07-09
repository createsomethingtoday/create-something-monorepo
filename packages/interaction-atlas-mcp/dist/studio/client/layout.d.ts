import type { AtlasCanvasNode, AtlasCanvasNodeKind, AtlasSession } from '../types.js';
export type CanvasDetailMode = 'compact' | 'standard' | 'detail';
type ActivitySummary = {
    message: string;
    nodeIds: string[];
};
type TidyUpdate = {
    height?: number;
    id: string;
    width: number;
    x: number;
    y: number;
};
type TidyLayoutOptions = {
    viewportWidth?: number;
};
export type LargeTopologyLayoutNode = TidyUpdate & {
    section: TopologyBoardSectionKey;
};
export type LargeTopologySectionSummary = {
    count: number;
    height: number;
    key: TopologyBoardSectionKey;
    label: string;
    width: number;
    x: number;
    y: number;
};
export type StoryFocusedNodeSummary = {
    id: string;
    label: string;
    kind: AtlasCanvasNodeKind;
    owner: string;
    status: AtlasCanvasNode['status'];
    notes?: string;
    evidence?: string;
    callouts: Array<{
        severity: 'decision' | 'info' | 'risk';
        text: string;
    }>;
    questions: Array<{
        owner?: string;
        question: string;
        status: 'answered' | 'open';
    }>;
};
export declare const LARGE_MAP_THRESHOLD = 96;
export type TopologyBoardSectionKey = 'core' | 'runtime' | 'agent_plane' | 'judgment';
export declare function detailModeForZoom(zoom: number): CanvasDetailMode;
export declare function shouldRenderInteractiveMiniMap(nodeCount: number): boolean;
export declare function nodeWidthForMode(node: AtlasCanvasNode, mode: CanvasDetailMode): number;
export declare function topologyBoardSectionForNode(node: AtlasCanvasNode): TopologyBoardSectionKey;
export declare function largeTopologyLayoutNodes(session: AtlasSession): LargeTopologyLayoutNode[];
export declare function largeTopologySectionSummaries(session: AtlasSession): LargeTopologySectionSummary[];
export declare function agentActivityFromSessionChange(previous: AtlasSession | null, next: AtlasSession): ActivitySummary | null;
export declare function focusedStoryNodeSummaries(session: AtlasSession): StoryFocusedNodeSummary[];
export declare function storyPresenterNodeIds(session: AtlasSession): Set<string> | null;
export declare function intersectNodeIdSets(first: Set<string> | null, second: Set<string> | null): Set<string> | null;
export declare function tidyNodeUpdates(session: AtlasSession, options?: TidyLayoutOptions): TidyUpdate[];
export {};
//# sourceMappingURL=layout.d.ts.map