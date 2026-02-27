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
    dimensions?: ("constraints" | "data" | "system" | "ai" | "human" | "touchpoints")[] | undefined;
    limit?: number | undefined;
}, {
    query: string;
    dimensions?: ("constraints" | "data" | "system" | "ai" | "human" | "touchpoints")[] | undefined;
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
            decision: "allow" | "require_human_review" | "block";
            reason: string;
        }, {
            decision: "allow" | "require_human_review" | "block";
            reason: string;
        }>;
    }, "strip", z.ZodTypeAny, {
        then: {
            decision: "allow" | "require_human_review" | "block";
            reason: string;
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
            decision: "allow" | "require_human_review" | "block";
            reason: string;
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
            decision: "allow" | "require_human_review" | "block";
            reason: string;
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
            decision: "allow" | "require_human_review" | "block";
            reason: string;
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
                decision: "allow" | "require_human_review" | "block";
                reason: string;
            }, {
                decision: "allow" | "require_human_review" | "block";
                reason: string;
            }>;
        }, "strip", z.ZodTypeAny, {
            then: {
                decision: "allow" | "require_human_review" | "block";
                reason: string;
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
                decision: "allow" | "require_human_review" | "block";
                reason: string;
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
                decision: "allow" | "require_human_review" | "block";
                reason: string;
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
                decision: "allow" | "require_human_review" | "block";
                reason: string;
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
                decision: "allow" | "require_human_review" | "block";
                reason: string;
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
                decision: "allow" | "require_human_review" | "block";
                reason: string;
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
                decision: "allow" | "require_human_review" | "block";
                reason: string;
            }, {
                decision: "allow" | "require_human_review" | "block";
                reason: string;
            }>;
        }, "strip", z.ZodTypeAny, {
            then: {
                decision: "allow" | "require_human_review" | "block";
                reason: string;
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
                decision: "allow" | "require_human_review" | "block";
                reason: string;
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
                decision: "allow" | "require_human_review" | "block";
                reason: string;
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
                decision: "allow" | "require_human_review" | "block";
                reason: string;
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
                decision: "allow" | "require_human_review" | "block";
                reason: string;
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
                decision: "allow" | "require_human_review" | "block";
                reason: string;
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
    entity_type: "mcp" | "agent";
    entity_id: string;
    mode: "legacy_enforce" | "shadow" | "polar_enforce";
    canary_percent: number;
    mismatch_threshold?: number | undefined;
    fallback_rate_threshold?: number | undefined;
}, {
    entity_type: "mcp" | "agent";
    entity_id: string;
    mode: "legacy_enforce" | "shadow" | "polar_enforce";
    canary_percent?: number | undefined;
    mismatch_threshold?: number | undefined;
    fallback_rate_threshold?: number | undefined;
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