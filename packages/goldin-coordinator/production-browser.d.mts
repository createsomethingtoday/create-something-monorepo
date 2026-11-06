export function bounded(stream: ReadableStream<Uint8Array> | null, limit: number): Promise<Uint8Array>;
export function invokeProductionCoordinator(request: Request, cookies: { get(name: string): string | undefined }, env: Record<string, unknown>): Promise<Response>;
