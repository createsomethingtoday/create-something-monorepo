/**
 * Interaction Atlas — Schemas
 *
 * Typed Artifacts for Atlas lookup + workflow mapping.
 */
import { z } from 'zod';
export declare const AtlasSearchSchema: z.ZodObject<{
    query: z.ZodString;
    dimensions: z.ZodOptional<z.ZodArray<z.ZodEnum<["ai", "human", "system", "data", "constraints", "touchpoints"]>, "many">>;
    limit: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    query: string;
    dimensions?: ("system" | "constraints" | "data" | "ai" | "human" | "touchpoints")[] | undefined;
    limit?: number | undefined;
}, {
    query: string;
    dimensions?: ("system" | "constraints" | "data" | "ai" | "human" | "touchpoints")[] | undefined;
    limit?: number | undefined;
}>;
export type AtlasSearchInput = z.infer<typeof AtlasSearchSchema>;
export declare const AtlasGetSchema: z.ZodObject<{
    id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
}, {
    id: string;
}>;
export type AtlasGetInput = z.infer<typeof AtlasGetSchema>;
export declare const WorkflowIdSchema: z.ZodObject<{
    workflow_id: z.ZodString;
    versionId: z.ZodOptional<z.ZodString>;
    commitSha: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    workflow_id: string;
    versionId?: string | undefined;
    commitSha?: string | undefined;
}, {
    workflow_id: string;
    versionId?: string | undefined;
    commitSha?: string | undefined;
}>;
export type WorkflowIdInput = z.infer<typeof WorkflowIdSchema>;
export declare const WorkflowToolSequenceItemSchema: z.ZodObject<{
    server: z.ZodOptional<z.ZodString>;
    tool: z.ZodString;
}, "strip", z.ZodTypeAny, {
    tool: string;
    server?: string | undefined;
}, {
    tool: string;
    server?: string | undefined;
}>;
export declare const WorkflowMapFromToolSequenceSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    workflow_id: z.ZodOptional<z.ZodString>;
    primaryUseCase: z.ZodOptional<z.ZodString>;
    touchpoints: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    constraints: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    sequence: z.ZodArray<z.ZodObject<{
        server: z.ZodOptional<z.ZodString>;
        tool: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        tool: string;
        server?: string | undefined;
    }, {
        tool: string;
        server?: string | undefined;
    }>, "many">;
    add_synthesis: z.ZodOptional<z.ZodBoolean>;
    add_verification: z.ZodOptional<z.ZodBoolean>;
    add_human_review: z.ZodOptional<z.ZodBoolean>;
    versionId: z.ZodOptional<z.ZodString>;
    commitSha: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    sequence: {
        tool: string;
        server?: string | undefined;
    }[];
    constraints?: string[] | undefined;
    name?: string | undefined;
    primaryUseCase?: string | undefined;
    touchpoints?: string[] | undefined;
    workflow_id?: string | undefined;
    versionId?: string | undefined;
    commitSha?: string | undefined;
    add_synthesis?: boolean | undefined;
    add_verification?: boolean | undefined;
    add_human_review?: boolean | undefined;
}, {
    sequence: {
        tool: string;
        server?: string | undefined;
    }[];
    constraints?: string[] | undefined;
    name?: string | undefined;
    primaryUseCase?: string | undefined;
    touchpoints?: string[] | undefined;
    workflow_id?: string | undefined;
    versionId?: string | undefined;
    commitSha?: string | undefined;
    add_synthesis?: boolean | undefined;
    add_verification?: boolean | undefined;
    add_human_review?: boolean | undefined;
}>;
export type WorkflowMapFromToolSequenceInput = z.infer<typeof WorkflowMapFromToolSequenceSchema>;
export declare const AtlasStudioPortalStartSchema: z.ZodObject<{
    session_id: z.ZodOptional<z.ZodString>;
    client: z.ZodOptional<z.ZodString>;
    workflow: z.ZodOptional<z.ZodString>;
    owner: z.ZodOptional<z.ZodString>;
    restart: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    session_id?: string | undefined;
    client?: string | undefined;
    workflow?: string | undefined;
    owner?: string | undefined;
    restart?: boolean | undefined;
}, {
    session_id?: string | undefined;
    client?: string | undefined;
    workflow?: string | undefined;
    owner?: string | undefined;
    restart?: boolean | undefined;
}>;
export declare const AtlasStudioSessionCreateSchema: z.ZodObject<{
    client: z.ZodString;
    workflow: z.ZodString;
    owner: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    client: string;
    workflow: string;
    owner?: string | undefined;
}, {
    client: string;
    workflow: string;
    owner?: string | undefined;
}>;
export declare const AtlasStudioSessionIdSchema: z.ZodObject<{
    session_id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    session_id: string;
}, {
    session_id: string;
}>;
export declare const AtlasStudioObserveSchema: z.ZodObject<{
    session_id: z.ZodString;
    text: z.ZodString;
    suggest: z.ZodOptional<z.ZodBoolean>;
    operator: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    session_id: string;
    text: string;
    operator?: boolean | undefined;
    suggest?: boolean | undefined;
}, {
    session_id: string;
    text: string;
    operator?: boolean | undefined;
    suggest?: boolean | undefined;
}>;
export declare const AtlasStudioNodeAddSchema: z.ZodObject<{
    session_id: z.ZodString;
    kind: z.ZodEnum<["actor", "human", "ai", "system", "data", "constraint", "touchpoint"]>;
    label: z.ZodOptional<z.ZodString>;
    atlas_id: z.ZodOptional<z.ZodString>;
    x: z.ZodOptional<z.ZodNumber>;
    y: z.ZodOptional<z.ZodNumber>;
    owner: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<["run", "wait", "stop", "unknown"]>>;
    notes: z.ZodOptional<z.ZodString>;
    evidence: z.ZodOptional<z.ZodString>;
    operator: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    session_id: string;
    kind: "system" | "data" | "constraint" | "touchpoint" | "actor" | "ai" | "human";
    operator?: boolean | undefined;
    notes?: string | undefined;
    label?: string | undefined;
    status?: "unknown" | "run" | "wait" | "stop" | undefined;
    owner?: string | undefined;
    atlas_id?: string | undefined;
    x?: number | undefined;
    y?: number | undefined;
    evidence?: string | undefined;
}, {
    session_id: string;
    kind: "system" | "data" | "constraint" | "touchpoint" | "actor" | "ai" | "human";
    operator?: boolean | undefined;
    notes?: string | undefined;
    label?: string | undefined;
    status?: "unknown" | "run" | "wait" | "stop" | undefined;
    owner?: string | undefined;
    atlas_id?: string | undefined;
    x?: number | undefined;
    y?: number | undefined;
    evidence?: string | undefined;
}>;
export declare const AtlasStudioEdgeAddSchema: z.ZodObject<{
    session_id: z.ZodString;
    source: z.ZodString;
    target: z.ZodString;
    label: z.ZodOptional<z.ZodString>;
    evidence: z.ZodOptional<z.ZodString>;
    operator: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    session_id: string;
    source: string;
    target: string;
    operator?: boolean | undefined;
    label?: string | undefined;
    evidence?: string | undefined;
}, {
    session_id: string;
    source: string;
    target: string;
    operator?: boolean | undefined;
    label?: string | undefined;
    evidence?: string | undefined;
}>;
export declare const AtlasStudioSuggestionAcceptSchema: z.ZodObject<{
    session_id: z.ZodString;
    suggestion_id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    session_id: string;
    suggestion_id: string;
}, {
    session_id: string;
    suggestion_id: string;
}>;
export declare const AtlasStudioStoryFocusSchema: z.ZodObject<{
    session_id: z.ZodString;
    title: z.ZodOptional<z.ZodString>;
    narration: z.ZodOptional<z.ZodString>;
    next_action: z.ZodOptional<z.ZodString>;
    focus_node_ids: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    focus_edge_ids: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    dim_unfocused: z.ZodOptional<z.ZodBoolean>;
    active_step_id: z.ZodOptional<z.ZodString>;
    steps: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodOptional<z.ZodString>;
        title: z.ZodString;
        summary: z.ZodString;
        focus_node_ids: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        focus_edge_ids: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        owner: z.ZodOptional<z.ZodString>;
        proof: z.ZodOptional<z.ZodString>;
        status: z.ZodOptional<z.ZodEnum<["current", "done", "next"]>>;
    }, "strip", z.ZodTypeAny, {
        title: string;
        summary: string;
        id?: string | undefined;
        status?: "current" | "done" | "next" | undefined;
        owner?: string | undefined;
        focus_node_ids?: string[] | undefined;
        focus_edge_ids?: string[] | undefined;
        proof?: string | undefined;
    }, {
        title: string;
        summary: string;
        id?: string | undefined;
        status?: "current" | "done" | "next" | undefined;
        owner?: string | undefined;
        focus_node_ids?: string[] | undefined;
        focus_edge_ids?: string[] | undefined;
        proof?: string | undefined;
    }>, "many">>;
    callout_node_id: z.ZodOptional<z.ZodString>;
    callout_text: z.ZodOptional<z.ZodString>;
    callout_severity: z.ZodOptional<z.ZodEnum<["info", "risk", "decision"]>>;
    operator: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    session_id: string;
    operator?: boolean | undefined;
    steps?: {
        title: string;
        summary: string;
        id?: string | undefined;
        status?: "current" | "done" | "next" | undefined;
        owner?: string | undefined;
        focus_node_ids?: string[] | undefined;
        focus_edge_ids?: string[] | undefined;
        proof?: string | undefined;
    }[] | undefined;
    title?: string | undefined;
    narration?: string | undefined;
    next_action?: string | undefined;
    focus_node_ids?: string[] | undefined;
    focus_edge_ids?: string[] | undefined;
    dim_unfocused?: boolean | undefined;
    active_step_id?: string | undefined;
    callout_node_id?: string | undefined;
    callout_text?: string | undefined;
    callout_severity?: "info" | "risk" | "decision" | undefined;
}, {
    session_id: string;
    operator?: boolean | undefined;
    steps?: {
        title: string;
        summary: string;
        id?: string | undefined;
        status?: "current" | "done" | "next" | undefined;
        owner?: string | undefined;
        focus_node_ids?: string[] | undefined;
        focus_edge_ids?: string[] | undefined;
        proof?: string | undefined;
    }[] | undefined;
    title?: string | undefined;
    narration?: string | undefined;
    next_action?: string | undefined;
    focus_node_ids?: string[] | undefined;
    focus_edge_ids?: string[] | undefined;
    dim_unfocused?: boolean | undefined;
    active_step_id?: string | undefined;
    callout_node_id?: string | undefined;
    callout_text?: string | undefined;
    callout_severity?: "info" | "risk" | "decision" | undefined;
}>;
export declare const AtlasStudioStoryQuestionAddSchema: z.ZodObject<{
    session_id: z.ZodString;
    question: z.ZodString;
    node_id: z.ZodOptional<z.ZodString>;
    owner: z.ZodOptional<z.ZodString>;
    operator: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    session_id: string;
    question: string;
    operator?: boolean | undefined;
    owner?: string | undefined;
    node_id?: string | undefined;
}, {
    session_id: string;
    question: string;
    operator?: boolean | undefined;
    owner?: string | undefined;
    node_id?: string | undefined;
}>;
export declare const AtlasStudioStoryStepActivateSchema: z.ZodObject<{
    session_id: z.ZodString;
    step_id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    session_id: string;
    step_id: string;
}, {
    session_id: string;
    step_id: string;
}>;
export declare const AtlasStudioHealSchema: z.ZodObject<{
    session_id: z.ZodString;
    profile: z.ZodOptional<z.ZodEnum<["template-system"]>>;
}, "strip", z.ZodTypeAny, {
    session_id: string;
    profile?: "template-system" | undefined;
}, {
    session_id: string;
    profile?: "template-system" | undefined;
}>;
export declare const AtlasStudioProposalSchema: z.ZodObject<{
    session_id: z.ZodString;
    profile: z.ZodOptional<z.ZodEnum<["template-system"]>>;
}, "strip", z.ZodTypeAny, {
    session_id: string;
    profile?: "template-system" | undefined;
}, {
    session_id: string;
    profile?: "template-system" | undefined;
}>;
export declare const AtlasStudioProposalActionReviewSchema: z.ZodObject<{
    session_id: z.ZodString;
    proposal_id: z.ZodString;
    action_id: z.ZodString;
    status: z.ZodEnum<["approved", "rejected", "proposed"]>;
    note: z.ZodOptional<z.ZodString>;
    operator: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    status: "approved" | "rejected" | "proposed";
    session_id: string;
    proposal_id: string;
    action_id: string;
    operator?: boolean | undefined;
    note?: string | undefined;
}, {
    status: "approved" | "rejected" | "proposed";
    session_id: string;
    proposal_id: string;
    action_id: string;
    operator?: boolean | undefined;
    note?: string | undefined;
}>;
export declare const AtlasStudioProposalHandoffSchema: z.ZodObject<{
    session_id: z.ZodString;
    proposal_id: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    session_id: string;
    proposal_id?: string | undefined;
}, {
    session_id: string;
    proposal_id?: string | undefined;
}>;
export declare const McpCatalogListSchema: z.ZodObject<{
    category: z.ZodOptional<z.ZodEnum<["create-something", "workway", "third-party", "all"]>>;
}, "strip", z.ZodTypeAny, {
    category?: "create-something" | "workway" | "third-party" | "all" | undefined;
}, {
    category?: "create-something" | "workway" | "third-party" | "all" | undefined;
}>;
export type McpCatalogListInput = z.infer<typeof McpCatalogListSchema>;
export declare const McpIntrospectSchema: z.ZodObject<{
    slug: z.ZodOptional<z.ZodString>;
    url: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    slug?: string | undefined;
    url?: string | undefined;
}, {
    slug?: string | undefined;
    url?: string | undefined;
}>;
export type McpIntrospectInput = z.infer<typeof McpIntrospectSchema>;
export declare const McpMapSchema: z.ZodObject<{
    slug: z.ZodOptional<z.ZodString>;
    url: z.ZodOptional<z.ZodString>;
    name: z.ZodOptional<z.ZodString>;
    versionId: z.ZodOptional<z.ZodString>;
    commitSha: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    versionId?: string | undefined;
    commitSha?: string | undefined;
    slug?: string | undefined;
    url?: string | undefined;
}, {
    name?: string | undefined;
    versionId?: string | undefined;
    commitSha?: string | undefined;
    slug?: string | undefined;
    url?: string | undefined;
}>;
export type McpMapInput = z.infer<typeof McpMapSchema>;
export declare const VersionSelectionGetSchema: z.ZodObject<{
    entity_type: z.ZodEnum<["mcp", "agent"]>;
    entity_id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    entity_type: "mcp" | "agent";
    entity_id: string;
}, {
    entity_type: "mcp" | "agent";
    entity_id: string;
}>;
export type VersionSelectionGetInput = z.infer<typeof VersionSelectionGetSchema>;
export declare const VersionSelectionSetSchema: z.ZodObject<{
    entity_type: z.ZodEnum<["mcp", "agent"]>;
    entity_id: z.ZodString;
    version_id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    entity_type: "mcp" | "agent";
    entity_id: string;
    version_id: string;
}, {
    entity_type: "mcp" | "agent";
    entity_id: string;
    version_id: string;
}>;
export type VersionSelectionSetInput = z.infer<typeof VersionSelectionSetSchema>;
export declare const JudgmentPolicySchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    guardrails: z.ZodOptional<z.ZodObject<{
        maxReviewDelta: z.ZodOptional<z.ZodNumber>;
        maxBlockDelta: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        maxReviewDelta?: number | undefined;
        maxBlockDelta?: number | undefined;
    }, {
        maxReviewDelta?: number | undefined;
        maxBlockDelta?: number | undefined;
    }>>;
    rules: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        priority: z.ZodNumber;
        when: z.ZodObject<{
            toolNames: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            hasWriteIntent: z.ZodOptional<z.ZodBoolean>;
            hasHumanReviewStep: z.ZodOptional<z.ZodBoolean>;
            introspectionOk: z.ZodOptional<z.ZodBoolean>;
            accountIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        }, "strip", z.ZodTypeAny, {
            toolNames?: string[] | undefined;
            hasWriteIntent?: boolean | undefined;
            hasHumanReviewStep?: boolean | undefined;
            introspectionOk?: boolean | undefined;
            accountIds?: string[] | undefined;
        }, {
            toolNames?: string[] | undefined;
            hasWriteIntent?: boolean | undefined;
            hasHumanReviewStep?: boolean | undefined;
            introspectionOk?: boolean | undefined;
            accountIds?: string[] | undefined;
        }>;
        then: z.ZodObject<{
            decision: z.ZodEnum<["allow", "require_human_review", "block"]>;
            reason: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            reason: string;
            decision: "allow" | "require_human_review" | "block";
        }, {
            reason: string;
            decision: "allow" | "require_human_review" | "block";
        }>;
    }, "strip", z.ZodTypeAny, {
        then: {
            reason: string;
            decision: "allow" | "require_human_review" | "block";
        };
        id: string;
        priority: number;
        when: {
            toolNames?: string[] | undefined;
            hasWriteIntent?: boolean | undefined;
            hasHumanReviewStep?: boolean | undefined;
            introspectionOk?: boolean | undefined;
            accountIds?: string[] | undefined;
        };
    }, {
        then: {
            reason: string;
            decision: "allow" | "require_human_review" | "block";
        };
        id: string;
        priority: number;
        when: {
            toolNames?: string[] | undefined;
            hasWriteIntent?: boolean | undefined;
            hasHumanReviewStep?: boolean | undefined;
            introspectionOk?: boolean | undefined;
            accountIds?: string[] | undefined;
        };
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    rules: {
        then: {
            reason: string;
            decision: "allow" | "require_human_review" | "block";
        };
        id: string;
        priority: number;
        when: {
            toolNames?: string[] | undefined;
            hasWriteIntent?: boolean | undefined;
            hasHumanReviewStep?: boolean | undefined;
            introspectionOk?: boolean | undefined;
            accountIds?: string[] | undefined;
        };
    }[];
    description?: string | undefined;
    guardrails?: {
        maxReviewDelta?: number | undefined;
        maxBlockDelta?: number | undefined;
    } | undefined;
}, {
    id: string;
    name: string;
    rules: {
        then: {
            reason: string;
            decision: "allow" | "require_human_review" | "block";
        };
        id: string;
        priority: number;
        when: {
            toolNames?: string[] | undefined;
            hasWriteIntent?: boolean | undefined;
            hasHumanReviewStep?: boolean | undefined;
            introspectionOk?: boolean | undefined;
            accountIds?: string[] | undefined;
        };
    }[];
    description?: string | undefined;
    guardrails?: {
        maxReviewDelta?: number | undefined;
        maxBlockDelta?: number | undefined;
    } | undefined;
}>;
export declare const JudgmentPolicyGetSchema: z.ZodObject<{
    entity_type: z.ZodEnum<["mcp", "agent"]>;
    entity_id: z.ZodString;
    policy_version_id: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    entity_type: "mcp" | "agent";
    entity_id: string;
    policy_version_id?: string | undefined;
}, {
    entity_type: "mcp" | "agent";
    entity_id: string;
    policy_version_id?: string | undefined;
}>;
export declare const JudgmentPolicySaveSchema: z.ZodObject<{
    entity_type: z.ZodEnum<["mcp", "agent"]>;
    entity_id: z.ZodString;
    policy: z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        guardrails: z.ZodOptional<z.ZodObject<{
            maxReviewDelta: z.ZodOptional<z.ZodNumber>;
            maxBlockDelta: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            maxReviewDelta?: number | undefined;
            maxBlockDelta?: number | undefined;
        }, {
            maxReviewDelta?: number | undefined;
            maxBlockDelta?: number | undefined;
        }>>;
        rules: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            priority: z.ZodNumber;
            when: z.ZodObject<{
                toolNames: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                hasWriteIntent: z.ZodOptional<z.ZodBoolean>;
                hasHumanReviewStep: z.ZodOptional<z.ZodBoolean>;
                introspectionOk: z.ZodOptional<z.ZodBoolean>;
                accountIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            }, "strip", z.ZodTypeAny, {
                toolNames?: string[] | undefined;
                hasWriteIntent?: boolean | undefined;
                hasHumanReviewStep?: boolean | undefined;
                introspectionOk?: boolean | undefined;
                accountIds?: string[] | undefined;
            }, {
                toolNames?: string[] | undefined;
                hasWriteIntent?: boolean | undefined;
                hasHumanReviewStep?: boolean | undefined;
                introspectionOk?: boolean | undefined;
                accountIds?: string[] | undefined;
            }>;
            then: z.ZodObject<{
                decision: z.ZodEnum<["allow", "require_human_review", "block"]>;
                reason: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                reason: string;
                decision: "allow" | "require_human_review" | "block";
            }, {
                reason: string;
                decision: "allow" | "require_human_review" | "block";
            }>;
        }, "strip", z.ZodTypeAny, {
            then: {
                reason: string;
                decision: "allow" | "require_human_review" | "block";
            };
            id: string;
            priority: number;
            when: {
                toolNames?: string[] | undefined;
                hasWriteIntent?: boolean | undefined;
                hasHumanReviewStep?: boolean | undefined;
                introspectionOk?: boolean | undefined;
                accountIds?: string[] | undefined;
            };
        }, {
            then: {
                reason: string;
                decision: "allow" | "require_human_review" | "block";
            };
            id: string;
            priority: number;
            when: {
                toolNames?: string[] | undefined;
                hasWriteIntent?: boolean | undefined;
                hasHumanReviewStep?: boolean | undefined;
                introspectionOk?: boolean | undefined;
                accountIds?: string[] | undefined;
            };
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        id: string;
        name: string;
        rules: {
            then: {
                reason: string;
                decision: "allow" | "require_human_review" | "block";
            };
            id: string;
            priority: number;
            when: {
                toolNames?: string[] | undefined;
                hasWriteIntent?: boolean | undefined;
                hasHumanReviewStep?: boolean | undefined;
                introspectionOk?: boolean | undefined;
                accountIds?: string[] | undefined;
            };
        }[];
        description?: string | undefined;
        guardrails?: {
            maxReviewDelta?: number | undefined;
            maxBlockDelta?: number | undefined;
        } | undefined;
    }, {
        id: string;
        name: string;
        rules: {
            then: {
                reason: string;
                decision: "allow" | "require_human_review" | "block";
            };
            id: string;
            priority: number;
            when: {
                toolNames?: string[] | undefined;
                hasWriteIntent?: boolean | undefined;
                hasHumanReviewStep?: boolean | undefined;
                introspectionOk?: boolean | undefined;
                accountIds?: string[] | undefined;
            };
        }[];
        description?: string | undefined;
        guardrails?: {
            maxReviewDelta?: number | undefined;
            maxBlockDelta?: number | undefined;
        } | undefined;
    }>;
    status: z.ZodOptional<z.ZodEnum<["draft", "active", "archived"]>>;
}, "strip", z.ZodTypeAny, {
    policy: {
        id: string;
        name: string;
        rules: {
            then: {
                reason: string;
                decision: "allow" | "require_human_review" | "block";
            };
            id: string;
            priority: number;
            when: {
                toolNames?: string[] | undefined;
                hasWriteIntent?: boolean | undefined;
                hasHumanReviewStep?: boolean | undefined;
                introspectionOk?: boolean | undefined;
                accountIds?: string[] | undefined;
            };
        }[];
        description?: string | undefined;
        guardrails?: {
            maxReviewDelta?: number | undefined;
            maxBlockDelta?: number | undefined;
        } | undefined;
    };
    entity_type: "mcp" | "agent";
    entity_id: string;
    status?: "draft" | "active" | "archived" | undefined;
}, {
    policy: {
        id: string;
        name: string;
        rules: {
            then: {
                reason: string;
                decision: "allow" | "require_human_review" | "block";
            };
            id: string;
            priority: number;
            when: {
                toolNames?: string[] | undefined;
                hasWriteIntent?: boolean | undefined;
                hasHumanReviewStep?: boolean | undefined;
                introspectionOk?: boolean | undefined;
                accountIds?: string[] | undefined;
            };
        }[];
        description?: string | undefined;
        guardrails?: {
            maxReviewDelta?: number | undefined;
            maxBlockDelta?: number | undefined;
        } | undefined;
    };
    entity_type: "mcp" | "agent";
    entity_id: string;
    status?: "draft" | "active" | "archived" | undefined;
}>;
export declare const JudgmentPolicyActivateSchema: z.ZodObject<{
    entity_type: z.ZodEnum<["mcp", "agent"]>;
    entity_id: z.ZodString;
    policy_version_id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    entity_type: "mcp" | "agent";
    entity_id: string;
    policy_version_id: string;
}, {
    entity_type: "mcp" | "agent";
    entity_id: string;
    policy_version_id: string;
}>;
export declare const JudgmentPolicyEstimateSchema: z.ZodObject<{
    entity_type: z.ZodEnum<["mcp", "agent"]>;
    entity_id: z.ZodString;
    before_policy_version_id: z.ZodOptional<z.ZodString>;
    policy: z.ZodOptional<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        guardrails: z.ZodOptional<z.ZodObject<{
            maxReviewDelta: z.ZodOptional<z.ZodNumber>;
            maxBlockDelta: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            maxReviewDelta?: number | undefined;
            maxBlockDelta?: number | undefined;
        }, {
            maxReviewDelta?: number | undefined;
            maxBlockDelta?: number | undefined;
        }>>;
        rules: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            priority: z.ZodNumber;
            when: z.ZodObject<{
                toolNames: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                hasWriteIntent: z.ZodOptional<z.ZodBoolean>;
                hasHumanReviewStep: z.ZodOptional<z.ZodBoolean>;
                introspectionOk: z.ZodOptional<z.ZodBoolean>;
                accountIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            }, "strip", z.ZodTypeAny, {
                toolNames?: string[] | undefined;
                hasWriteIntent?: boolean | undefined;
                hasHumanReviewStep?: boolean | undefined;
                introspectionOk?: boolean | undefined;
                accountIds?: string[] | undefined;
            }, {
                toolNames?: string[] | undefined;
                hasWriteIntent?: boolean | undefined;
                hasHumanReviewStep?: boolean | undefined;
                introspectionOk?: boolean | undefined;
                accountIds?: string[] | undefined;
            }>;
            then: z.ZodObject<{
                decision: z.ZodEnum<["allow", "require_human_review", "block"]>;
                reason: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                reason: string;
                decision: "allow" | "require_human_review" | "block";
            }, {
                reason: string;
                decision: "allow" | "require_human_review" | "block";
            }>;
        }, "strip", z.ZodTypeAny, {
            then: {
                reason: string;
                decision: "allow" | "require_human_review" | "block";
            };
            id: string;
            priority: number;
            when: {
                toolNames?: string[] | undefined;
                hasWriteIntent?: boolean | undefined;
                hasHumanReviewStep?: boolean | undefined;
                introspectionOk?: boolean | undefined;
                accountIds?: string[] | undefined;
            };
        }, {
            then: {
                reason: string;
                decision: "allow" | "require_human_review" | "block";
            };
            id: string;
            priority: number;
            when: {
                toolNames?: string[] | undefined;
                hasWriteIntent?: boolean | undefined;
                hasHumanReviewStep?: boolean | undefined;
                introspectionOk?: boolean | undefined;
                accountIds?: string[] | undefined;
            };
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        id: string;
        name: string;
        rules: {
            then: {
                reason: string;
                decision: "allow" | "require_human_review" | "block";
            };
            id: string;
            priority: number;
            when: {
                toolNames?: string[] | undefined;
                hasWriteIntent?: boolean | undefined;
                hasHumanReviewStep?: boolean | undefined;
                introspectionOk?: boolean | undefined;
                accountIds?: string[] | undefined;
            };
        }[];
        description?: string | undefined;
        guardrails?: {
            maxReviewDelta?: number | undefined;
            maxBlockDelta?: number | undefined;
        } | undefined;
    }, {
        id: string;
        name: string;
        rules: {
            then: {
                reason: string;
                decision: "allow" | "require_human_review" | "block";
            };
            id: string;
            priority: number;
            when: {
                toolNames?: string[] | undefined;
                hasWriteIntent?: boolean | undefined;
                hasHumanReviewStep?: boolean | undefined;
                introspectionOk?: boolean | undefined;
                accountIds?: string[] | undefined;
            };
        }[];
        description?: string | undefined;
        guardrails?: {
            maxReviewDelta?: number | undefined;
            maxBlockDelta?: number | undefined;
        } | undefined;
    }>>;
    after_policy_version_id: z.ZodOptional<z.ZodString>;
    scenarios: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        toolName: z.ZodString;
        hasWriteIntent: z.ZodOptional<z.ZodBoolean>;
        hasHumanReviewStep: z.ZodOptional<z.ZodBoolean>;
        introspectionOk: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        toolName: string;
        hasWriteIntent?: boolean | undefined;
        hasHumanReviewStep?: boolean | undefined;
        introspectionOk?: boolean | undefined;
    }, {
        id: string;
        toolName: string;
        hasWriteIntent?: boolean | undefined;
        hasHumanReviewStep?: boolean | undefined;
        introspectionOk?: boolean | undefined;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    entity_type: "mcp" | "agent";
    entity_id: string;
    policy?: {
        id: string;
        name: string;
        rules: {
            then: {
                reason: string;
                decision: "allow" | "require_human_review" | "block";
            };
            id: string;
            priority: number;
            when: {
                toolNames?: string[] | undefined;
                hasWriteIntent?: boolean | undefined;
                hasHumanReviewStep?: boolean | undefined;
                introspectionOk?: boolean | undefined;
                accountIds?: string[] | undefined;
            };
        }[];
        description?: string | undefined;
        guardrails?: {
            maxReviewDelta?: number | undefined;
            maxBlockDelta?: number | undefined;
        } | undefined;
    } | undefined;
    before_policy_version_id?: string | undefined;
    after_policy_version_id?: string | undefined;
    scenarios?: {
        id: string;
        toolName: string;
        hasWriteIntent?: boolean | undefined;
        hasHumanReviewStep?: boolean | undefined;
        introspectionOk?: boolean | undefined;
    }[] | undefined;
}, {
    entity_type: "mcp" | "agent";
    entity_id: string;
    policy?: {
        id: string;
        name: string;
        rules: {
            then: {
                reason: string;
                decision: "allow" | "require_human_review" | "block";
            };
            id: string;
            priority: number;
            when: {
                toolNames?: string[] | undefined;
                hasWriteIntent?: boolean | undefined;
                hasHumanReviewStep?: boolean | undefined;
                introspectionOk?: boolean | undefined;
                accountIds?: string[] | undefined;
            };
        }[];
        description?: string | undefined;
        guardrails?: {
            maxReviewDelta?: number | undefined;
            maxBlockDelta?: number | undefined;
        } | undefined;
    } | undefined;
    before_policy_version_id?: string | undefined;
    after_policy_version_id?: string | undefined;
    scenarios?: {
        id: string;
        toolName: string;
        hasWriteIntent?: boolean | undefined;
        hasHumanReviewStep?: boolean | undefined;
        introspectionOk?: boolean | undefined;
    }[] | undefined;
}>;
export declare const JudgmentPolicyCompareReportGetSchema: z.ZodObject<{
    report_id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    report_id: string;
}, {
    report_id: string;
}>;
export declare const JudgmentEngineRolloutGetSchema: z.ZodObject<{
    entity_type: z.ZodEnum<["mcp", "agent"]>;
    entity_id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    entity_type: "mcp" | "agent";
    entity_id: string;
}, {
    entity_type: "mcp" | "agent";
    entity_id: string;
}>;
export declare const JudgmentEngineRolloutSetSchema: z.ZodObject<{
    entity_type: z.ZodEnum<["mcp", "agent"]>;
    entity_id: z.ZodString;
    mode: z.ZodEnum<["legacy_enforce", "shadow", "polar_enforce"]>;
    canary_percent: z.ZodDefault<z.ZodNumber>;
    mismatch_threshold: z.ZodOptional<z.ZodNumber>;
    fallback_rate_threshold: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    mode: "legacy_enforce" | "shadow" | "polar_enforce";
    entity_type: "mcp" | "agent";
    entity_id: string;
    canary_percent: number;
    mismatch_threshold?: number | undefined;
    fallback_rate_threshold?: number | undefined;
}, {
    mode: "legacy_enforce" | "shadow" | "polar_enforce";
    entity_type: "mcp" | "agent";
    entity_id: string;
    canary_percent?: number | undefined;
    mismatch_threshold?: number | undefined;
    fallback_rate_threshold?: number | undefined;
}>;
export declare const JudgmentSecurityStatusGetSchema: z.ZodObject<{
    limit: z.ZodOptional<z.ZodNumber>;
    status: z.ZodOptional<z.ZodEnum<["open", "resolved"]>>;
}, "strip", z.ZodTypeAny, {
    status?: "open" | "resolved" | undefined;
    limit?: number | undefined;
}, {
    status?: "open" | "resolved" | undefined;
    limit?: number | undefined;
}>;
export declare const JudgmentSecurityAccessSetSchema: z.ZodObject<{
    mode: z.ZodEnum<["normal", "read_only", "off"]>;
    reason: z.ZodString;
    expires_at: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    mode: "normal" | "read_only" | "off";
    reason: string;
    expires_at?: number | undefined;
}, {
    mode: "normal" | "read_only" | "off";
    reason: string;
    expires_at?: number | undefined;
}>;
export declare const JudgmentSecurityIncidentResolveSchema: z.ZodObject<{
    incident_id: z.ZodString;
    decision: z.ZodEnum<["dismiss", "monitor", "enforce_read_only", "enforce_off"]>;
    note: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    incident_id: string;
    decision: "dismiss" | "monitor" | "enforce_read_only" | "enforce_off";
    note?: string | undefined;
}, {
    incident_id: string;
    decision: "dismiss" | "monitor" | "enforce_read_only" | "enforce_off";
    note?: string | undefined;
}>;
export declare const JudgmentSecurityIncidentReviewNextSchema: z.ZodObject<{
    claim_ttl_seconds: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    claim_ttl_seconds?: number | undefined;
}, {
    claim_ttl_seconds?: number | undefined;
}>;
export declare const JudgmentDashboardSummaryParamsSchema: z.ZodObject<{
    entity_type: z.ZodOptional<z.ZodEnum<["mcp", "agent"]>>;
    entity_id: z.ZodOptional<z.ZodString>;
    recent_limit: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    entity_type?: "mcp" | "agent" | undefined;
    entity_id?: string | undefined;
    recent_limit?: number | undefined;
}, {
    entity_type?: "mcp" | "agent" | undefined;
    entity_id?: string | undefined;
    recent_limit?: number | undefined;
}>;
export declare const JudgmentDashboardSummarySchema: z.ZodEffects<z.ZodObject<{
    entity_type: z.ZodOptional<z.ZodEnum<["mcp", "agent"]>>;
    entity_id: z.ZodOptional<z.ZodString>;
    recent_limit: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    entity_type?: "mcp" | "agent" | undefined;
    entity_id?: string | undefined;
    recent_limit?: number | undefined;
}, {
    entity_type?: "mcp" | "agent" | undefined;
    entity_id?: string | undefined;
    recent_limit?: number | undefined;
}>, {
    entity_type?: "mcp" | "agent" | undefined;
    entity_id?: string | undefined;
    recent_limit?: number | undefined;
}, {
    entity_type?: "mcp" | "agent" | undefined;
    entity_id?: string | undefined;
    recent_limit?: number | undefined;
}>;
export declare const AutomationContractGetSchema: z.ZodObject<{
    automation_id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    automation_id: string;
}, {
    automation_id: string;
}>;
export declare const AutomationContractUpsertSchema: z.ZodObject<{
    automation_id: z.ZodString;
    name: z.ZodString;
    status: z.ZodDefault<z.ZodEnum<["enabled", "disabled", "paused", "archived"]>>;
    owner_type: z.ZodDefault<z.ZodEnum<["user", "service"]>>;
    owner_id: z.ZodString;
    execution_mode: z.ZodEnum<["direct", "guided", "autonomous"]>;
    policy_pack_id: z.ZodString;
    policy_version_id: z.ZodString;
    approval_mode: z.ZodEnum<["untrusted", "on-failure", "on-request", "never"]>;
    trigger_type: z.ZodEnum<["schedule", "event", "manual"]>;
    trigger_cron: z.ZodOptional<z.ZodString>;
    trigger_timezone: z.ZodOptional<z.ZodString>;
    mcp_profile_id: z.ZodString;
    labels: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    is_active: z.ZodOptional<z.ZodBoolean>;
    spec: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    agent_assignment: z.ZodOptional<z.ZodObject<{
        mode: z.ZodEnum<["none", "pinned", "routed", "hybrid"]>;
        primary_agent_id: z.ZodOptional<z.ZodString>;
        routing_policy_id: z.ZodOptional<z.ZodString>;
        fallback_agent_ids: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        mode: "none" | "pinned" | "routed" | "hybrid";
        primary_agent_id?: string | undefined;
        routing_policy_id?: string | undefined;
        fallback_agent_ids?: string[] | undefined;
    }, {
        mode: "none" | "pinned" | "routed" | "hybrid";
        primary_agent_id?: string | undefined;
        routing_policy_id?: string | undefined;
        fallback_agent_ids?: string[] | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    status: "disabled" | "archived" | "enabled" | "paused";
    policy_version_id: string;
    automation_id: string;
    owner_type: "user" | "service";
    owner_id: string;
    execution_mode: "direct" | "guided" | "autonomous";
    policy_pack_id: string;
    approval_mode: "never" | "untrusted" | "on-failure" | "on-request";
    trigger_type: "schedule" | "event" | "manual";
    mcp_profile_id: string;
    spec: Record<string, unknown>;
    trigger_cron?: string | undefined;
    trigger_timezone?: string | undefined;
    labels?: string[] | undefined;
    is_active?: boolean | undefined;
    agent_assignment?: {
        mode: "none" | "pinned" | "routed" | "hybrid";
        primary_agent_id?: string | undefined;
        routing_policy_id?: string | undefined;
        fallback_agent_ids?: string[] | undefined;
    } | undefined;
}, {
    name: string;
    policy_version_id: string;
    automation_id: string;
    owner_id: string;
    execution_mode: "direct" | "guided" | "autonomous";
    policy_pack_id: string;
    approval_mode: "never" | "untrusted" | "on-failure" | "on-request";
    trigger_type: "schedule" | "event" | "manual";
    mcp_profile_id: string;
    status?: "disabled" | "archived" | "enabled" | "paused" | undefined;
    owner_type?: "user" | "service" | undefined;
    trigger_cron?: string | undefined;
    trigger_timezone?: string | undefined;
    labels?: string[] | undefined;
    is_active?: boolean | undefined;
    spec?: Record<string, unknown> | undefined;
    agent_assignment?: {
        mode: "none" | "pinned" | "routed" | "hybrid";
        primary_agent_id?: string | undefined;
        routing_policy_id?: string | undefined;
        fallback_agent_ids?: string[] | undefined;
    } | undefined;
}>;
export declare const AutomationRunStartSchema: z.ZodObject<{
    automation_id: z.ZodString;
    trigger_source: z.ZodOptional<z.ZodEnum<["schedule", "event", "manual", "retry"]>>;
}, "strip", z.ZodTypeAny, {
    automation_id: string;
    trigger_source?: "schedule" | "event" | "manual" | "retry" | undefined;
}, {
    automation_id: string;
    trigger_source?: "schedule" | "event" | "manual" | "retry" | undefined;
}>;
export declare const ApprovalInboxDecideSchema: z.ZodObject<{
    approval_id: z.ZodString;
    decision: z.ZodEnum<["approved", "denied"]>;
    comment: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    decision: "approved" | "denied";
    approval_id: string;
    comment?: string | undefined;
}, {
    decision: "approved" | "denied";
    approval_id: string;
    comment?: string | undefined;
}>;
//# sourceMappingURL=index.d.ts.map