import {
  productionProfile,
  productionCommand,
  assertProductionPrice,
} from "./production-profile.mjs";
import { operationalHealth, assertEnvironmentAction } from "./operations.mjs";
import { DurableObject } from "cloudflare:workers";
import { syntheticWindow, syntheticActor } from "./synthetic-access.mjs";
import { CoordinatorCore } from "./core.mjs";
import { authenticate } from "./authenticate.mjs";
import {
  NotionAdapter,
  dispatchProjection,
  ProjectionError,
} from "./notion.mjs";
import { reviewedIntake } from "./reviewed-intake.mjs";
import { NotionHttpTransport } from "./notion-http.mjs";

const json = (value, status = 200) =>
  Response.json(value, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
async function body(request) {
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    throw new Error("JSON required");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("body required");
  let size = 0,
    parts = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 65536) {
      await reader.cancel();
      throw new Error("body too large");
    }
    parts.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) {
    bytes.set(part, offset);
    offset += part.length;
  }
  return JSON.parse(new TextDecoder().decode(bytes));
}
export default {
  async fetch(request, env) {
    try {
      // Bearer-only API. Reject browser cookie/Origin access and never enable CORS.
      if (request.headers.has("Origin"))
        return json({ error: "origin not allowed" }, 403);
      const actor = await authenticate(request, env);
      if (request.method !== "POST")
        return json({ error: "method not allowed" }, 405);
      const command = await body(request);
      if (command.actor || command.tenant || command.operator)
        return json({ error: "identity comes from verified policy" }, 400);
      const routes = {
        price: "pricing",
        intake: "operator",
        "reviewed-intake": "operator",
        event: "operator",
        get: "operator",
        outbox: "operator",
        drain: "integration",
        schema: "integration",
        schema_inspect: "integration",
        reconcile: "integration",
        retry_reset: "integration",
        dispatch_start: "integration",
        dispatch_stop: "integration",
        dispatch_status: "integration",
        health: "integration",
      };
      if (!Object.hasOwn(routes, command.action))
        return json({ error: "unknown action" }, 400);
      if (!actor.roles.includes(routes[command.action]))
        return json({ error: "forbidden" }, 403);
      assertEnvironmentAction(env, command.action);
      if (
        env.ENVIRONMENT === "production" &&
        !["health", "dispatch_status", "dispatch_stop"].includes(command.action)
      ) {
        const p = productionCommand(env, actor, command);
        const u = new URL(request.url);
        if (u.origin !== p.coordinatorOrigin || u.pathname !== "/" || u.search)
          throw new Error("forbidden");
      }
      syntheticWindow(env);
      const stub = env.COORDINATOR.getByName(actor.tenant);
      const result = await stub.execute(actor, command);
      return json(result);
    } catch (e) {
      const message = e.message;
      const status =
        message === "unauthenticated"
          ? 401
          : message === "forbidden"
            ? 403
            : [
                  "identity unconfigured",
                  "production promotion unavailable",
                ].includes(message)
              ? 503
              : 400;
      return json(
        {
          error: status === 400 ? "invalid or conflicting operation" : message,
        },
        status,
      );
    }
  },
};
export class GoldinCoordinator extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    const sql = ctx.storage.sql;
    const db = {
      exec: (s) => sql.exec(s),
      prepare: (s) => ({
        run: (...p) => sql.exec(s, ...p),
        get: (...p) => sql.exec(s, ...p).toArray()[0],
        all: (...p) => sql.exec(s, ...p).toArray(),
      }),
    };
    this.core = new CoordinatorCore(db, Date.now, (fn) =>
      ctx.storage.transactionSync(fn),
    );
    sql.exec(
      "CREATE TABLE IF NOT EXISTS dispatch_config (singleton INTEGER PRIMARY KEY, actor TEXT)",
    );
    sql.exec(
      "CREATE TABLE IF NOT EXISTS synthetic_fault (singleton INTEGER PRIMARY KEY, fault TEXT)",
    );
  }
  async execute(actor, command) {
    if (["dispatch_start", "dispatch_stop"].includes(command.action))
      return this.ctx.storage.transaction(async () => {
        const result = await this.run(actor, command);
        await this.arm();
        return result;
      });
    const result = await this.run(actor, command);
    await this.arm();
    return result;
  }
  dispatchActor() {
    const row = this.ctx.storage.sql
      .exec("SELECT actor FROM dispatch_config WHERE singleton=1")
      .toArray()[0];
    if (!row) return null;
    const saved = JSON.parse(row.actor);
    const policies = JSON.parse(this.env.OPERATOR_POLICY || "{}");
    const policy = Object.hasOwn(policies, saved.operator)
      ? policies[saved.operator]
      : null;
    if (
      !policy ||
      policy.tenant !== saved.tenant ||
      !Array.isArray(policy.roles) ||
      !policy.roles.includes("operator") ||
      !policy.roles?.includes("integration")
    )
      return null;
    const actor = {
      tenant: policy.tenant,
      operator: saved.operator,
      roles: policy.roles,
      dispatchGeneration: saved.generation,
    };
    try {
      syntheticActor(this.env, actor);
      assertEnvironmentAction(this.env, "dispatch_start");
    } catch {
      return null;
    }
    try {
      return this.writable(actor) ? actor : null;
    } catch {
      return null;
    }
  }
  writable(actor) {
    const adapter = this.adapter(actor);
    return (
      adapter.mode === "mock-only" ||
      (["synthetic-http", "production-http"].includes(adapter.mode) &&
        adapter.transport.permits(adapter.mapping))
    );
  }
  ready(actor) {
    const seen = new Set();
    return this.core.outbox(actor).filter((item) => {
      const prefix = JSON.parse(
        this.env.NOTION_PROJECTION_GRANT || "null",
      )?.sourcePrefix;
      if (prefix && !item.source.startsWith(prefix)) return false;
      if (item.status === "done") return false;
      if (seen.has(item.source)) return false;
      seen.add(item.source);
      return ["pending", "retry", "sending"].includes(item.status);
    });
  }
  async arm() {
    const actor = this.dispatchActor();
    const items = actor ? this.ready(actor) : [];
    if (!actor) {
      await this.ctx.storage.deleteAlarm();
      return;
    }
    const next = items.length
      ? Math.max(Date.now() + 100, Math.min(...items.map((i) => i.next)))
      : Date.now() + 10000;
    const existing = await this.ctx.storage.getAlarm();
    if (existing === null || existing > next)
      await this.ctx.storage.setAlarm(next);
  }
  async alarm() {
    const actor = this.dispatchActor();
    if (!actor) {
      await this.ctx.storage.deleteAlarm();
      return;
    }
    this.core.recoverSending(actor);
    const item = this.ready(actor).find(
      (i) => i.status !== "sending" && i.next <= Date.now(),
    );
    if (!item) {
      await this.arm();
      return;
    }
    const claimed = this.core.claim(actor, item.id);
    // Persist a recovery wakeup before network I/O; interrupted writes become uncertain.
    await this.arm();
    await dispatchProjection(
      this.core,
      actor,
      claimed,
      this.adapter(actor, true),
    );
    await this.arm();
  }
  async run(actor, command) {
    // RPC is reachable only through this private namespace binding, never the public body.
    syntheticActor(this.env, actor);
    assertEnvironmentAction(this.env, command.action);
    if (
      this.env.ENVIRONMENT === "production" &&
      !["health", "dispatch_status", "dispatch_stop"].includes(command.action)
    )
      productionCommand(this.env, actor, command);
    const c = this.core;
    switch (command.action) {
      case "dispatch_start":
        if (!this.writable(actor))
          return { status: "disabled", externalEffects: [] };
        if (command.testFault) {
          if (
            this.env.SYNTHETIC_NOTION_FAULTS !== "true" ||
            !["synthetic", "local-test"].includes(this.env.ENVIRONMENT) ||
            !["read_retry_once", "drop_write_receipt_once"].includes(
              command.testFault,
            )
          )
            throw new Error("test fault disabled");
          this.ctx.storage.sql.exec(
            "INSERT OR REPLACE INTO synthetic_fault VALUES (1, ?)",
            command.testFault,
          );
        }
        this.ctx.storage.sql.exec(
          "INSERT OR REPLACE INTO dispatch_config VALUES (1, ?)",
          JSON.stringify({
            tenant: actor.tenant,
            operator: actor.operator,
            generation: crypto.randomUUID(),
          }),
        );
        return { status: "armed", externalEffects: [] };
      case "dispatch_stop":
        this.ctx.storage.sql.exec("DELETE FROM dispatch_config");
        this.ctx.storage.sql.exec("DELETE FROM synthetic_fault");
        await this.ctx.storage.deleteAlarm();
        return { status: "stopped", externalEffects: [] };
      case "health":
        return operationalHealth(c.outboxStatusCounts(actor), {
          enabled: Boolean(this.dispatchActor()),
          alarm: await this.ctx.storage.getAlarm(),
        });
      case "dispatch_status":
        return {
          enabled: Boolean(this.dispatchActor()),
          alarm: await this.ctx.storage.getAlarm(),
          externalEffects: [],
        };
      case "price":
        c.approvePrice(actor, command.price);
        return { approved: true, externalEffects: [] };
      case "intake":
        return c.intake(actor, command.input);
      case "reviewed-intake": {
        const input = reviewedIntake(actor, command.input);
        if (
          this.env.ENVIRONMENT === "production" &&
          !c.hasBooking(actor, input.source)
        )
          assertProductionPrice(
            this.env,
            actor,
            input.priceVersion,
            c.price(actor, input.priceVersion),
          );
        return c.intake(actor, input);
      }
      case "event":
        return c.event(actor, command.source, command.event);
      case "get": {
        const booking = c.get(actor, command.source);
        return { booking, eligibility: c.eligibility(booking) };
      }
      case "outbox":
        return c.outbox(actor);
      case "schema":
        return this.adapter(actor).validate();
      case "schema_inspect": {
        if (
          this.env.NOTION_SCHEMA_DISCOVERY !== "true" ||
          !["synthetic", "local-test"].includes(this.env.ENVIRONMENT)
        )
          throw new Error("schema discovery disabled");
        const grant = JSON.parse(this.env.NOTION_PROJECTION_GRANT || "null");
        if (grant?.approvedBy !== actor.operator) throw new Error("forbidden");
        const transport = new NotionHttpTransport({
          credential: this.env.NOTION_API_TOKEN,
          grant,
          tenant: actor.tenant,
          authorize: () => {
            try {
              syntheticActor(this.env, actor);
              return true;
            } catch {
              return false;
            }
          },
        });
        const response = await transport.fetch(
          new Request(
            `https://api.notion.com/v1/data_sources/${encodeURIComponent(grant.dataSourceId)}`,
          ),
        );
        if (!response.ok) throw new Error("Notion schema unavailable");
        const schema = await response.json();
        if (schema.id !== grant.dataSourceId || !schema.properties)
          throw new Error("wrong data source");
        return {
          dataSourceId: schema.id,
          properties: Object.entries(schema.properties).map(
            ([name, property]) => ({
              name,
              id: property.id,
              type: property.type,
            }),
          ),
          liveVerified: true,
          externalEffects: [],
        };
      }
      case "drain": {
        if (!this.writable(actor))
          return { status: "disabled", externalEffects: [] };
        const item = c.claim(actor, command.id);
        return dispatchProjection(c, actor, item, this.adapter(actor));
      }
      case "retry_reset":
        return c.resetRetry(actor, command.id, command.approval);
      case "reconcile": {
        const item = c.outbox(actor).find((r) => r.id === command.id);
        if (!item) throw new Error("missing item");
        return c.reconcileOutbox(
          actor,
          item.id,
          await this.adapter(actor).reconcile(item),
        );
      }
      default:
        throw new Error("unsupported command");
    }
  }
  adapter(actor, background = false) {
    const mappings = JSON.parse(this.env.NOTION_MAPPINGS || "{}");
    const ids = Object.values(mappings).map((m) => m.dataSourceId);
    if (new Set(ids).size !== ids.length)
      throw new Error("tenant Notion data sources must be distinct");
    const mapping = Object.hasOwn(mappings, actor.tenant)
      ? mappings[actor.tenant]
      : null;
    const authorize = () => {
      try {
        syntheticActor(this.env, actor);
        if (this.env.ENVIRONMENT === "production")
          productionProfile(this.env, actor);
        const policies = JSON.parse(this.env.OPERATOR_POLICY || "{}");
        const policy = Object.hasOwn(policies, actor.operator)
          ? policies[actor.operator]
          : null;
        if (
          policy?.tenant !== actor.tenant ||
          !Array.isArray(policy.roles) ||
          !policy.roles.includes("operator") ||
          !policy.roles.includes("integration")
        )
          return false;
        if (!background) return true;
        const row = this.ctx.storage.sql
          .exec("SELECT actor FROM dispatch_config WHERE singleton=1")
          .toArray()[0];
        const saved = row ? JSON.parse(row.actor) : null;
        return (
          saved?.generation === actor.dispatchGeneration &&
          saved?.operator === actor.operator &&
          saved?.tenant === actor.tenant
        );
      } catch {
        return false;
      }
    };
    const production = this.env.ENVIRONMENT === "production";
    if (
      (production && this.env.PROJECTION_WRITES === "production-http") ||
      (["synthetic", "local-test"].includes(this.env.ENVIRONMENT) &&
        this.env.PROJECTION_WRITES === "synthetic-http")
    ) {
      const grant = JSON.parse(this.env.NOTION_PROJECTION_GRANT || "null");
      if (production) {
        const p = productionProfile(this.env, actor);
        if (
          grant?.issuedAt !== p.issuedAt ||
          grant?.expiresAt !== p.expiresAt ||
          grant?.dataSourceId !== p.notion.dataSourceId ||
          grant?.sourcePrefix !== "pixieset-supervised:" ||
          JSON.stringify(grant?.fields) !== JSON.stringify(p.notion.fields)
        )
          throw new Error("production promotion unavailable");
      }
      const transport = new NotionHttpTransport({
        credential: this.env.NOTION_API_TOKEN,
        grant,
        tenant: actor.tenant,
        production,
        authorize,
        fetcher: async (request) => {
          const row =
            this.env.SYNTHETIC_NOTION_FAULTS === "true" && background
              ? this.ctx.storage.sql
                  .exec("SELECT fault FROM synthetic_fault WHERE singleton=1")
                  .toArray()[0]
              : null;
          const read =
            request.method === "GET" ||
            new URL(request.url).pathname.endsWith("/query");
          if (row?.fault === "read_retry_once" && read) {
            this.ctx.storage.sql.exec("DELETE FROM synthetic_fault");
            return Response.json({}, { status: 429 });
          }
          const response = await fetch(request);
          if (
            row?.fault === "drop_write_receipt_once" &&
            !read &&
            response.ok
          ) {
            this.ctx.storage.sql.exec("DELETE FROM synthetic_fault");
            await response.body?.cancel();
            throw new ProjectionError(
              "uncertain",
              "synthetic dropped write receipt",
            );
          }
          return response;
        },
      });
      return new NotionAdapter({
        mapping,
        transport,
        mode:
          grant?.approvedBy === actor.operator
            ? production
              ? "production-http"
              : "synthetic-http"
            : "read-only",
      });
    }
    return new NotionAdapter({
      mapping,
      transport: this.env.NOTION_MOCK
        ? {
            fetch: (request) => {
              if (!authorize())
                throw new ProjectionError(
                  "retry",
                  "dispatch paused before request",
                );
              return this.env.NOTION_MOCK.fetch(request);
            },
          }
        : undefined,
      mode:
        this.env.ENVIRONMENT === "local-test" &&
        this.env.PROJECTION_WRITES === "mock-only"
          ? "mock-only"
          : "read-only",
    });
  }
}
