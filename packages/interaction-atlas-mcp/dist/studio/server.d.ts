import http from 'node:http';
type StudioServerOptions = {
    host: string;
    port: number;
    sessionId?: string;
    cwd?: string;
};
export declare function startStudioServer(options: StudioServerOptions): Promise<http.Server>;
export {};
//# sourceMappingURL=server.d.ts.map