import type { AtlasSession } from './types.js';
export type AtlasProductionBindingProfile = 'template-system';
export type AtlasHealSummary = {
    profile: AtlasProductionBindingProfile;
    checkedAt: string;
    nodesChecked: number;
    bindingsChecked: number;
    synced: number;
    partial: number;
    missing: number;
    unbound: number;
};
export type AtlasHealResult = {
    profile: AtlasProductionBindingProfile;
    summary: AtlasHealSummary;
    session: AtlasSession;
};
export declare function applyProductionBindings(session: AtlasSession, options?: {
    profile?: AtlasProductionBindingProfile;
    cwd?: string;
}): Promise<{
    session: AtlasSession;
    summary: AtlasHealSummary;
}>;
export declare function healSessionProductionBindings(sessionId: string, options?: {
    profile?: AtlasProductionBindingProfile;
    cwd?: string;
}): Promise<AtlasHealResult>;
//# sourceMappingURL=production-bindings.d.ts.map