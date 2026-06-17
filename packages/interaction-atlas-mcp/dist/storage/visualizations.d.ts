import type { D1Database } from '@create-something/mcp-core';
import type { JudgmentDecisionType } from '../judgment/types.js';
export interface VisualizationRecordInput {
    accountId: string;
    versionId: string;
    sourceType: 'workflow_get' | 'workflow_mermaid' | 'workflow_map_from_tool_sequence' | 'mcp_map_to_workflow';
    sourceKey: string;
    decision: JudgmentDecisionType;
    decisionReason: string;
    workflowJson: unknown;
    mermaidText?: string;
    pagePath: string;
    estimateReportId?: string;
}
export declare function recordVisualization(db: D1Database | undefined, input: VisualizationRecordInput): Promise<string>;
//# sourceMappingURL=visualizations.d.ts.map