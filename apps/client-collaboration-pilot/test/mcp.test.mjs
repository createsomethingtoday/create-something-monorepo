import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { openRuntime } from "../runtime.mjs";
import { principals } from "../store.mjs";

test("actual SDK stdio MCP lifecycle: request → proposal → reviewer → Git application, with replay", async (t) => {
  const home = mkdtempSync(join(tmpdir(), "collab-mcp-"));
  const runtime = openRuntime(home);
  const client = new Client(
    { name: "synthetic-acceptance-client", version: "1.0.0" },
    { capabilities: {} },
  );
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [fileURLToPath(new URL("../mcp-server.mjs", import.meta.url))],
    env: {
      PATH: process.env.PATH,
      HOME: process.env.HOME,
      COLLABORATION_HOME: home,
    },
    stderr: "pipe",
  });
  t.after(async () => {
    await client.close();
    runtime.store.close();
    rmSync(home, { recursive: true, force: true });
  });
  await client.connect(transport);
  assert.equal(
    client.getServerVersion().name,
    "create-something-client-collaboration",
  );
  const tools = await client.listTools();
  assert.deepEqual(
    tools.tools.map((x) => x.name),
    ["feedback.add", "proposal.create"],
  );
  const resources = await client.listResources();
  const uri = resources.resources[0].uri;
  const read = async () =>
    JSON.parse((await client.readResource({ uri })).contents[0].text);
  const c = await read();
  assert.equal(c.repositoryMode, true);
  await assert.rejects(
    client.readResource({ uri: "collaboration://other-client/context" }),
  );
  const call = async (name, args) => client.callTool({ name, arguments: args });
  assert.equal((await call("proposal.review", {})).isError, true);
  assert.equal(
    (await call("proposal.create", { tenant: "other-client" })).isError,
    true,
  );
  const a = {
    page: "/",
    component: "hero.headline",
    baseVersion: c.source.version,
    baseHash: c.sourceHash,
  };
  const request = await call("feedback.add", {
    ...a,
    requestId: "request",
    text: "Clarify chemistry outcomes.",
  });
  const f = JSON.parse(request.content[0].text);
  const args = {
    ...a,
    requestId: "proposal",
    feedbackId: f.id,
    replacement: "Chemistry engineered for measurable outcomes.",
    reason: "Describe the outcome clearly.",
  };
  const response = await call("proposal.create", args);
  assert.notEqual(response.isError, true);
  const q = JSON.parse(response.content[0].text);
  assert.equal(q.status, "pending");
  assert.equal(q.content.baseCommit, c.source.baseCommit);
  assert.deepEqual(await call("proposal.create", args), response);
  assert.equal(
    (await call("proposal.create", { ...args, replacement: "Different" }))
      .isError,
    true,
  );
  assert.equal(runtime.repositories.maverickx.snapshot().text, c.source.text);
  runtime.store.review(principals.reviewer, {
    id: q.id,
    digest: q.digest,
    decision: "approved",
    requestId: "review",
  });
  const receipt = runtime.store.promote(principals.reviewer, {
    id: q.id,
    digest: q.digest,
    requestId: "apply",
  });
  const updated = await read();
  assert.equal(updated.source.text, args.replacement);
  assert.equal(updated.source.baseCommit, receipt.commit);
  assert.equal(updated.outbox[0].deployment, "not-authorized");
  await client.ping();
});
