import { type AtlasProductionBindingProfile } from './production-bindings.js';
import type { AtlasSessionActor, AtlasSession, AtlasWritebackAction, AtlasWritebackActionStatus, AtlasWritebackProposal, AtlasWritebackProposalSummary } from './types.js';
export type AtlasWritebackProposalResult = {
    profile: AtlasProductionBindingProfile;
    proposal: AtlasWritebackProposal;
    summary: AtlasWritebackProposalSummary;
    session: AtlasSession;
};
export type AtlasWritebackActionReviewResult = {
    action: AtlasWritebackAction;
    proposal: AtlasWritebackProposal;
    summary: AtlasWritebackProposalSummary;
    session: AtlasSession;
};
export type AtlasWritebackHandoffOptions = {
    proposalId?: string;
};
export declare function exportWritebackProposalHandoff(session: AtlasSession, options?: AtlasWritebackHandoffOptions): string;
export declare function exportWritebackProposalHandoffForSession(sessionId: string, options?: AtlasWritebackHandoffOptions & {
    cwd?: string;
}): Promise<string>;
export declare function createWritebackProposal(sessionId: string, options?: {
    profile?: AtlasProductionBindingProfile;
    cwd?: string;
}): Promise<AtlasWritebackProposalResult>;
export declare function reviewWritebackProposalAction(sessionId: string, input: {
    actionId: string;
    proposalId: string;
    status: Exclude<AtlasWritebackActionStatus, 'applied'>;
    actor?: AtlasSessionActor;
    note?: string;
}, cwd?: string): Promise<AtlasWritebackActionReviewResult>;
//# sourceMappingURL=writeback-proposals.d.ts.map