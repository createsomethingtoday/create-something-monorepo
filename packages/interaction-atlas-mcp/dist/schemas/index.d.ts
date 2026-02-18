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
//# sourceMappingURL=index.d.ts.map