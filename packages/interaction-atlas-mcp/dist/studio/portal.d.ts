type BrowserPortalOptions = {
    client?: string;
    workflow?: string;
    owner?: string;
    sessionId?: string;
    restart?: boolean;
    cwd?: string;
};
export type AtlasBrowserPortalRuntime = {
    host: string;
    port: number;
    url: string;
    sessionId: string;
    sessionUrl: string;
    pid: number;
    atlasHome: string;
    logPath: string;
    launchedAt?: string;
    updatedAt?: string;
    mode: 'codex-browser-portal';
};
export declare function getAtlasStudioAppHome(): string;
export declare function getAtlasPortalRuntimePath(): string;
export declare function readAtlasPortalRuntime(): AtlasBrowserPortalRuntime | undefined;
export declare function getAtlasBrowserPortalStatus(): {
    active: boolean;
    runtime: AtlasBrowserPortalRuntime | null;
};
export declare function stopAtlasBrowserPortal(): {
    stopped: boolean;
    runtime: AtlasBrowserPortalRuntime | null;
};
export declare function startAtlasBrowserPortal(options?: BrowserPortalOptions): Promise<AtlasBrowserPortalRuntime>;
export {};
//# sourceMappingURL=portal.d.ts.map