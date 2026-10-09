import { createServer } from "node:http";
import { readFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { openStore, principals, contract, invoke, Fault } from "./store.mjs";
import { openRuntime } from "./runtime.mjs";

export function start({
  port = 4319,
  dbPath = new URL("./.local/pilot.sqlite", import.meta.url),
  quiet = false,
  repositoryHome,
  runtimeOptions,
  reviewerBoundary,
  projectRegistry,
} = {}) {
  if (process.env.NODE_ENV === "production")
    throw new Error("Synthetic pilot cannot run in production");
  if (reviewerBoundary && !repositoryHome)
    throw Error("verified_boundary_requires_repository_runtime");
  if (projectRegistry && !reviewerBoundary)
    throw Error("project_registry_requires_verified_identity");
  mkdirSync(new URL("./.local/", import.meta.url), { recursive: true });
  const store = repositoryHome
    ? openRuntime(repositoryHome, {
        ...runtimeOptions,
        ...(reviewerBoundary
          ? { authorizePrincipal: reviewerBoundary.accepts }
          : {}),
      }).store
    : openStore(dbPath instanceof URL ? fileURLToPath(dbPath) : dbPath);
  const csrf = randomBytes(24).toString("hex");
  const assets = {
    "/": ["public/index.html", "text/html"],
    "/app.js": ["public/app.js", "text/javascript"],
    "/style.css": ["public/style.css", "text/css"],
    "/canon.css": [
      "../../packages/canon/src/lib/styles/tokens.css",
      "text/css",
    ],
  };
  const server = createServer(async (req, res) => {
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
    );
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "no-store");
    const origin = `http://127.0.0.1:${server.address().port}`;
    const send = (status, data, type = "application/json") => {
      res.writeHead(status, { "Content-Type": type });
      res.end(type === "application/json" ? JSON.stringify(data) : data);
    };
    try {
      if (req.headers.host !== `127.0.0.1:${server.address().port}`)
        throw new Fault("host_rejected", 403);
      if (req.headers.origin && req.headers.origin !== origin)
        throw new Fault("origin_rejected", 403);
      if (req.method === "GET" && assets[req.url]) {
        const [path, type] = assets[req.url];
        return send(200, readFileSync(new URL(path, import.meta.url)), type);
      }
      const reviewer = reviewerBoundary
        ? await reviewerBoundary.resolve(
            new Request(origin + req.url, {
              headers: new Headers(
                Object.entries(req.headers).filter(
                  ([, v]) => typeof v === "string",
                ),
              ),
            }),
          )
        : principals.reviewer;
      if (!reviewer) throw new Fault("verified_membership_required", 401);
      if (req.method === "GET" && req.url === "/api/context")
        return send(200, {
          ...store.context(reviewer),
          csrf,
          identity: {
            mode: reviewerBoundary
              ? "verified fixture claims; server-owned membership"
              : "synthetic reviewer",
            chatgpt: "disabled — partner registration required",
          },
        });
      if (req.method === "GET" && req.url === "/api/contract")
        return send(200, contract);
      if (req.method === "GET" && req.url === "/api/releases")
        return send(200, store.releaseContext(reviewer));
      if (req.method !== "POST") throw new Fault("not_found", 404);
      if (
        req.headers.origin !== origin ||
        req.headers["content-type"] !== "application/json"
      )
        throw new Fault("request_rejected", 403);
      const provided = Buffer.from(req.headers["x-review-csrf"] || "");
      if (
        provided.length !== csrf.length ||
        !timingSafeEqual(provided, Buffer.from(csrf))
      )
        throw new Fault("csrf_rejected", 403);
      let raw = "";
      for await (const chunk of req) {
        raw += chunk;
        if (Buffer.byteLength(raw) > 8192)
          throw new Fault("body_too_large", 413);
      }
      let a;
      try {
        a = JSON.parse(raw);
      } catch {
        throw new Fault("invalid_json", 400);
      }
      if (!a || typeof a !== "object" || Array.isArray(a))
        throw new Fault("invalid_input", 400);
      if (req.url === "/api/feedback")
        return send(200, store.feedback(reviewer, a));
      if (req.url === "/api/tools/call")
        if (reviewerBoundary)
          throw new Fault("use_separate_agent_transport", 403);
      if (req.url === "/api/tools/call")
        return send(200, invoke(store, principals.agent, a.name, a.arguments));
      if (req.url === "/api/review")
        return send(200, store.review(reviewer, a));
      if (req.url === "/api/promote")
        return send(200, store.promote(reviewer, a));
      if (req.url === "/api/releases/preview")
        return send(200, store.requestPreview(reviewer, a));
      if (req.url === "/api/releases/production-approval")
        return send(200, store.approveProduction(reviewer, a));
      if (req.url === "/api/projects/resolve") {
        if (!projectRegistry || Object.keys(a).some((k) => k !== "url"))
          throw new Fault("project_unavailable", 403);
        return send(200, projectRegistry.resolve(a.url, reviewer));
      }
      throw new Fault("not_found", 404);
    } catch (e) {
      send(e instanceof Fault ? e.status : 503, {
        error: e instanceof Fault ? e.message : "storage_unavailable",
        recovery:
          "Refresh context before retrying. Reuse the request ID for an uncertain result.",
      });
    }
  });
  server.listen(port, "127.0.0.1", () => {
    if (!quiet)
      console.log(
        `Synthetic collaboration pilot: http://127.0.0.1:${server.address().port}`,
      );
  });
  server.on("close", () => store.close());
  return server;
}
if (process.argv[1] === fileURLToPath(import.meta.url))
  start({ repositoryHome: process.env.COLLABORATION_HOME });
