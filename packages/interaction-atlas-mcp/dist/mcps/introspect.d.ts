export type McpToolInfo = {
    name: string;
    description?: string;
};
export type McpIntrospection = {
    url: string;
    tools: McpToolInfo[];
    resources: Array<{
        uri: string;
        name?: string;
        description?: string;
        mimeType?: string;
    }>;
    prompts: Array<{
        name: string;
        description?: string;
    }>;
};
export type McpIntrospectionResult = {
    ok: true;
    value: McpIntrospection;
} | {
    ok: false;
    error: string;
    url: string;
};
export declare function introspectMcpServer(url: string, options?: {
    headers?: Record<string, string>;
    cacheTtlMs?: number;
}): Promise<McpIntrospectionResult>;
//# sourceMappingURL=introspect.d.ts.map