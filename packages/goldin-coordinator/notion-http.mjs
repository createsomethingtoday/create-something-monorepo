import { ProjectionError } from "./notion.mjs";

const blocked = () => {
  throw new ProjectionError("blocked", "Notion transport policy denied");
};
// Candidate transport only: the deployed Worker deliberately does not construct it.
// Credential provisioning, destination verification and deployment need separate approval.
export class NotionHttpTransport {
  #credential;
  #fetch;
  #clock;
  #grant;
  #pages = new Set();
  #authorize;
  #production;
  constructor({
    credential,
    grant,
    tenant,
    production = false,
    fetcher = (request) => fetch(request),
    clock = Date.now,
    authorize = () => true,
  }) {
    this.#production = production;
    this.#credential = credential;
    this.#fetch = fetcher;
    this.#clock = clock;
    this.#grant = structuredClone(grant);
    this.tenant = tenant;
    this.#authorize = authorize;
  }
  permitsRead(mapping) {
    const g = this.#grant;
    return Boolean(
      g?.enabled === true &&
      this.#authorize() === true &&
      (this.#production
        ? g.productionOnly === true && g.syntheticOnly !== true
        : g.syntheticOnly === true && g.productionOnly !== true) &&
      g.tenant === this.tenant &&
      g.dataSourceId === mapping?.dataSourceId &&
      typeof g.approvedBy === "string" &&
      g.approvedBy &&
      Number.isSafeInteger(g.expiresAt) &&
      Number.isSafeInteger(g.issuedAt) &&
      g.issuedAt <= this.#clock() &&
      this.#clock() < g.expiresAt &&
      g.expiresAt > g.issuedAt &&
      g.expiresAt - g.issuedAt <= (this.#production ? 86400000 : 1800000) &&
      typeof this.#credential === "string" &&
      this.#credential.length > 0,
    );
  }
  permits(mapping) {
    const g = this.#grant;
    return (
      this.permitsRead(mapping) &&
      Object.keys(g.fields ?? {}).length === 5 &&
      new Set(Object.values(g.fields)).size === 5 &&
      ["source", "payment", "production", "delivery", "receipt"].every(
        (k) =>
          typeof g.fields[k] === "string" &&
          g.fields[k].length > 0 &&
          g.fields[k] === mapping?.fields?.[k],
      )
    );
  }
  async fetch(request) {
    const g = this.#grant;
    const u = new URL(request.url);
    const schemaRead =
      request.method === "GET" &&
      u.pathname === `/v1/data_sources/${encodeURIComponent(g?.dataSourceId)}`;
    this.assertWritable(g, schemaRead);
    if (
      u.origin !== "https://api.notion.com" ||
      u.search ||
      u.hash ||
      request.headers.has("authorization")
    )
      blocked();
    const ds = `/v1/data_sources/${encodeURIComponent(g.dataSourceId)}`;
    const method = request.method;
    const raw = method === "GET" ? undefined : await request.text();
    if (raw && new TextEncoder().encode(raw).length > 65536) blocked();
    let body;
    try {
      body = raw ? JSON.parse(raw) : undefined;
    } catch {
      blocked();
    }
    const query = method === "POST" && u.pathname === ds + "/query";
    const create = method === "POST" && u.pathname === "/v1/pages";
    const update =
      method === "PATCH" &&
      this.#pages.has(u.pathname.slice("/v1/pages/".length)) &&
      u.pathname.startsWith("/v1/pages/");
    if (
      !(method === "GET" && u.pathname === ds) &&
      !query &&
      !create &&
      !update
    )
      blocked();
    if (
      query &&
      (!body?.filter?.rich_text?.equals ||
        (g.sourcePrefix &&
          !body.filter.rich_text.equals.startsWith(g.sourcePrefix)) ||
        body.filter.property !== g.fields?.source ||
        body.page_size !== 2 ||
        Object.keys(body).some((k) => !["filter", "page_size"].includes(k)) ||
        Object.keys(body.filter).some(
          (k) => !["property", "rich_text"].includes(k),
        ) ||
        Object.keys(body.filter.rich_text).some((k) => k !== "equals"))
    )
      blocked();
    if (create && this.#production) blocked();
    if (
      create &&
      (body?.parent?.type !== "data_source_id" ||
        body.parent.data_source_id !== g.dataSourceId)
    )
      blocked();
    if (create || update) {
      if (
        Object.keys(body).some((k) => !["parent", "properties"].includes(k)) ||
        (update && body.parent)
      )
        blocked();
      const ids = Object.values(g.fields ?? {});
      if (
        g.sourcePrefix &&
        !body.properties?.[
          g.fields.source
        ]?.rich_text?.[0]?.text?.content?.startsWith(g.sourcePrefix)
      )
        blocked();
      if (
        ids.length !== 5 ||
        new Set(ids).size !== 5 ||
        Object.keys(body.properties ?? {}).length !== 5 ||
        Object.entries(body.properties).some(
          ([id, p]) =>
            !ids.includes(id) ||
            Object.keys(p).some((k) => k !== "rich_text") ||
            !Array.isArray(p.rich_text) ||
            p.rich_text.length !== 1 ||
            p.rich_text[0]?.type !== "text" ||
            typeof p.rich_text[0]?.text?.content !== "string" ||
            p.rich_text[0].text.content.length > 2000,
        )
      )
        blocked();
    }
    // Recheck after asynchronous body reading; never follow credential-bearing redirects.
    this.assertWritable(g, schemaRead);
    const response = await this.#fetch(
      new Request(u, {
        method,
        body: raw,
        redirect: "manual",
        signal: AbortSignal.timeout(5000),
        headers: {
          Authorization: `Bearer ${this.#credential}`,
          "Content-Type": "application/json",
          "Notion-Version": "2025-09-03",
        },
      }),
    );
    if (response.status >= 300 && response.status < 400) {
      await response.body?.cancel();
      blocked();
    }
    const reader = response.body?.getReader();
    const parts = [];
    let size = 0;
    if (reader)
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > 262144) {
          await reader.cancel();
          throw new ProjectionError(
            query || method === "GET" ? "retry" : "uncertain",
            "Notion response too large",
          );
        }
        parts.push(value);
      }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const part of parts) {
      bytes.set(part, offset);
      offset += part.length;
    }
    if (query && response.ok) {
      let result;
      try {
        result = JSON.parse(new TextDecoder().decode(bytes));
      } catch {
        blocked();
      }
      if (
        !Array.isArray(result.results) ||
        result.has_more ||
        result.results.length > 1
      )
        blocked();
      for (const page of result.results) {
        if (
          page.parent?.data_source_id !== g.dataSourceId ||
          typeof page.id !== "string"
        )
          blocked();
        this.#pages.add(page.id);
      }
    }
    // No upstream headers or error bodies are included in receipts/logs.
    return new Response(bytes, {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });
  }
  assertWritable(mapping, readOnly = false) {
    if (this.#authorize() !== true)
      throw new ProjectionError("retry", "dispatch paused before request");
    if (!(readOnly ? this.permitsRead(mapping) : this.permits(mapping)))
      blocked();
  }
}
