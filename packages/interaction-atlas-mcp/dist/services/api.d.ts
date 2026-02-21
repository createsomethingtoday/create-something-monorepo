/**
 * Interaction Atlas — API Client
 *
 * Uses TokenProvider from AccountContext for authentication.
 * Never use vendor SDK for data operations — all data flows through
 * your own client, returning your own types.
 *
 * See sdk-auth-patterns.md: "Vendor SDK for Data Ops: Never"
 */
import type { TokenProvider } from '@create-something/mcp-core';
export declare class APIClient {
    private readonly tokenProvider;
    constructor(tokenProvider: TokenProvider);
    private getHeaders;
    get<T>(path: string): Promise<T>;
    post<T>(path: string, body: unknown): Promise<T>;
}
//# sourceMappingURL=api.d.ts.map