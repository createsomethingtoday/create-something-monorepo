import type { D1Database } from '@create-something/mcp-core';
import type { AtlasEntityType } from './versions.js';
export interface JudgmentDashboardSummaryInput {
    accountId: string;
    entityType?: AtlasEntityType;
    entityId?: string;
    recentLimit?: number;
}
export interface JudgmentDashboardSummary {
    accountId: string;
    generatedAt: number;
    scope: {
        level: 'account';
    } | {
        level: 'entity';
        entity_type: AtlasEntityType;
        entity_id: string;
    };
    policies: {
        versionsTotal: number;
        entitiesTracked: number;
        activeSelections: number;
        byStatus: Record<string, number>;
    };
    estimates: {
        reportsTotal: number;
        reports24h: number;
        latest: Array<{
            id: string;
            entity_type: AtlasEntityType;
            entity_id: string;
            before_policy_version_id: string | null;
            after_policy_version_id: string;
            summary: unknown;
            created_at: number;
        }>;
    };
    automations: {
        activeContracts: number;
        byStatus: Record<string, number>;
        byExecutionMode: Record<string, number>;
        latest: Array<{
            automation_id: string;
            name: string;
            status: string;
            execution_mode: string;
            approval_mode: string;
            trigger_type: string;
            version: number;
            created_at: number;
        }>;
    };
    runs: {
        total: number;
        last24h: number;
        failed24h: number;
        awaitingApproval: number;
        byState: Record<string, number>;
    };
    approvals: {
        pending: number;
        byState: Record<string, number>;
        latestPending: Array<{
            approval_id: string;
            run_id: string;
            automation_id: string;
            action_type: string;
            reason: string | null;
            requested_at: number;
            expires_at: number | null;
        }>;
    };
    engineHealth: {
        decisionLatency: {
            p50Ms: number;
            p95Ms: number;
        };
        shadowParity: {
            mismatchRate: number;
        };
        fallbackUsage: {
            rate: number;
        };
        decisionMix: Record<string, number>;
        sampleSize24h: number;
        businessKpis: {
            unreviewed_risky_actions_prevented: number;
            approval_turnaround: number | null;
            incident_rate_trend: number;
            governed_workflow_coverage: number;
        };
    };
}
export declare function getJudgmentDashboardSummary(db: D1Database | undefined, input: JudgmentDashboardSummaryInput): Promise<JudgmentDashboardSummary>;
//# sourceMappingURL=dashboard.d.ts.map