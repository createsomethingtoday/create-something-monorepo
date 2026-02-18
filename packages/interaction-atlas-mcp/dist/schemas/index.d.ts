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
}, "strip", z.ZodTypeAny, {
    workflow_id: string;
}, {
    workflow_id: string;
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
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    slug?: string | undefined;
    url?: string | undefined;
}, {
    name?: string | undefined;
    slug?: string | undefined;
    url?: string | undefined;
}>;
export type McpMapInput = z.infer<typeof McpMapSchema>;
//# sourceMappingURL=index.d.ts.map