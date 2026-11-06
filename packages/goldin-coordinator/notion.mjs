import { createHash } from "node:crypto";
export class ProjectionError extends Error {
  constructor(kind, message) {
    super(message);
    this.kind = kind;
  }
}
const fail = (message) => {
  throw new ProjectionError("blocked", message);
};
const text = (value) => ({
  rich_text: [{ type: "text", text: { content: String(value) } }],
});
const content = (p) =>
  p?.rich_text?.map((t) => t.plain_text ?? t.text?.content ?? "").join("");
const property = (page, id) =>
  Object.values(page.properties ?? {}).find((p) => p.id === id);
export class NotionAdapter {
  constructor({ mapping, transport, mode = "read-only" }) {
    this.mapping = mapping;
    this.transport = transport;
    this.mode = mode;
  }
  async request(path, body, method = "GET") {
    if (!this.transport) fail("Notion transport unconfigured");
    let response;
    try {
      response = await this.transport.fetch(
        new Request(`https://api.notion.com/v1/${path}`, {
          method,
          headers: {
            "Content-Type": "application/json",
            "Notion-Version": "2025-09-03",
          },
          body: body === undefined ? undefined : JSON.stringify(body),
          signal: AbortSignal.timeout(5000),
        }),
      );
    } catch (error) {
      if (error instanceof ProjectionError) throw error;
      throw new ProjectionError(
        method === "GET" || path.endsWith("/query") ? "retry" : "uncertain",
        "Notion transport failed",
      );
    }
    if (!response.ok) {
      const read = method === "GET" || path.endsWith("/query");
      throw new ProjectionError(
        response.status === 429 || (read && response.status >= 500)
          ? "retry"
          : !read && response.status >= 500
            ? "uncertain"
            : "blocked",
        `Notion status ${response.status}`,
      );
    }
    try {
      return await response.json();
    } catch {
      throw new ProjectionError(
        method === "GET" || path.endsWith("/query") ? "retry" : "uncertain",
        "invalid Notion response",
      );
    }
  }
  async validate() {
    const m = this.mapping;
    if (
      !m ||
      typeof m.dataSourceId !== "string" ||
      !m.dataSourceId ||
      !m.fields
    )
      fail("Notion mapping unconfigured");
    const required = ["source", "payment", "production", "delivery", "receipt"];
    if (
      Object.keys(m.fields).length !== required.length ||
      required.some((k) => typeof m.fields[k] !== "string" || !m.fields[k]) ||
      new Set(Object.values(m.fields)).size !== required.length
    )
      fail("unique complete property mapping required");
    const schema = await this.request(
      `data_sources/${encodeURIComponent(m.dataSourceId)}`,
    );
    if (!schema || schema.id !== m.dataSourceId || !schema.properties)
      fail("wrong data source");
    const properties = Object.values(schema.properties);
    for (const id of Object.values(m.fields))
      if (!properties.some((p) => p.id === id && p.type === "rich_text"))
        fail("mapping requires existing rich_text property IDs");
    return {
      valid: true,
      dataSourceId: schema.id,
      liveVerified: false,
      mode: this.mode,
    };
  }
  properties(item) {
    const b = item.body;
    const values = {
      source: b.source,
      payment: JSON.stringify(b.payment),
      production: JSON.stringify(b.production),
      delivery: b.delivery,
    };
    const digest = createHash("sha256")
      .update(JSON.stringify({ id: item.id, values }))
      .digest("hex");
    values.receipt = digest;
    const result = {};
    for (const [k, id] of Object.entries(this.mapping.fields)) {
      if (values[k].length > 2000) fail("projection exceeds property limit");
      result[id] = text(values[k]);
    }
    return { properties: result, digest };
  }
  async lookup(item) {
    const m = this.mapping;
    const data = await this.request(
      `data_sources/${encodeURIComponent(m.dataSourceId)}/query`,
      {
        filter: {
          property: m.fields.source,
          rich_text: { equals: item.source },
        },
        page_size: 2,
      },
      "POST",
    );
    if (
      !Array.isArray(data.results) ||
      data.has_more ||
      data.results.length > 1
    )
      fail("ambiguous source reconciliation");
    return data.results[0] ?? null;
  }
  matches(page, desired) {
    return Object.entries(desired.properties).every(
      ([id, value]) => content(property(page, id)) === content(value),
    );
  }
  async project(item) {
    if (["synthetic-http", "production-http"].includes(this.mode))
      this.transport?.assertWritable?.(this.mapping);
    const scoped =
      ["synthetic-http", "production-http"].includes(this.mode) &&
      this.transport?.permits?.(this.mapping);
    if (this.mode !== "mock-only" && !scoped)
      fail("production Notion writes disabled");
    await this.validate();
    const desired = this.properties(item);
    const existing = await this.lookup(item);
    if (existing && this.matches(existing, desired))
      return {
        mode: this.mode,
        pageId: existing.id,
        digest: desired.digest,
        reconciled: true,
        externalEffects: [],
      };
    if (!existing && this.mode === "production-http")
      fail("production requires a staff-linked existing canonical session");
    const page = await this.request(
      existing ? `pages/${encodeURIComponent(existing.id)}` : "pages",
      existing
        ? { properties: desired.properties }
        : {
            parent: {
              type: "data_source_id",
              data_source_id: this.mapping.dataSourceId,
            },
            properties: desired.properties,
          },
      existing ? "PATCH" : "POST",
    );
    if (typeof page.id !== "string" || !this.matches(page, desired))
      throw new ProjectionError("uncertain", "missing matching write receipt");
    return {
      mode: this.mode,
      pageId: page.id,
      digest: desired.digest,
      reconciled: false,
      [scoped ? "externalEffects" : "mockEffects"]: [
        { operation: existing ? "update" : "create", pageId: page.id },
      ],
      ...(!scoped ? { externalEffects: [] } : {}),
    };
  }
  async reconcile(item) {
    await this.validate();
    const desired = this.properties(item);
    const page = await this.lookup(item);
    if (page && this.matches(page, desired))
      return {
        mode: this.mode,
        pageId: page.id,
        digest: desired.digest,
        reconciled: true,
        externalEffects: [],
      };
    throw new ProjectionError("uncertain", "projection outcome unresolved");
  }
}
export async function dispatchProjection(core, actor, item, adapter) {
  try {
    return core.settle(actor, item.id, "done", await adapter.project(item));
  } catch (e) {
    const status = e instanceof ProjectionError ? e.kind : "uncertain";
    return core.settle(actor, item.id, status, {
      error: status,
      externalEffects: [],
    });
  }
}
