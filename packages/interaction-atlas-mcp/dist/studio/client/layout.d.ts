import type { AtlasCanvasNode, AtlasSession } from '../types.js';
export type CanvasDetailMode = 'compact' | 'standard' | 'detail';
type ActivitySummary = {
    message: string;
    nodeIds: string[];
};
type TidyUpdate = {
    id: string;
    width: number;
    x: number;
    y: number;
};
type TidyLayoutOptions = {
    viewportWidth?: number;
};
export declare function detailModeForZoom(zoom: number): CanvasDetailMode;
export declare function nodeWidthForMode(node: AtlasCanvasNode, mode: CanvasDetailMode): number;
export declare function agentActivityFromSessionChange(previous: AtlasSession | null, next: AtlasSession): ActivitySummary | null;
export declare function tidyNodeUpdates(session: AtlasSession, options?: TidyLayoutOptions): TidyUpdate[];
export {};
//# sourceMappingURL=layout.d.ts.map