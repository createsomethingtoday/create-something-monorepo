import assert from "node:assert/strict";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the Princess Pet Palace game", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Princess Pet Palace<\/title>/i);
  assert.match(html, /A new adventure every time/);
  assert.match(html, /Open the palace doors/);
  assert.match(html, /six magical rooms/);
  assert.match(html, /Start adventure/);
  assert.match(html, /Letter Garden/);
  assert.match(html, /Pet Parade/);
  assert.match(html, /Royal Gym/);
  assert.match(html, /No ads, accounts, or tracking/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|Your site is taking shape/i);
  assert.match(html, /data-testid="start-game"/);
});
