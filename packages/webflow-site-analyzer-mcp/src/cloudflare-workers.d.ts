declare module 'cloudflare:workers' {
  export class DurableObject<Env = unknown> {
    protected ctx: DurableObjectState;
    protected env: Env;

    constructor(ctx: DurableObjectState, env: Env);
  }
}

interface DurableObjectNamespace<Stub = DurableObjectStub> {
  getByName(name: string): Stub;
}

interface DurableObjectStub {}

interface DurableObjectState {
  blockConcurrencyWhile(callback: () => void | Promise<void>): void;
  storage: DurableObjectStorage;
}

interface DurableObjectStorage {
  sql: DurableObjectSqlStorage;
}

interface DurableObjectSqlStorage {
  exec<Row = Record<string, unknown>>(
    query: string,
    ...bindings: unknown[]
  ): DurableObjectSqlResult<Row>;
}

interface DurableObjectSqlResult<Row> {
  one(): Row;
  toArray(): Row[];
}
