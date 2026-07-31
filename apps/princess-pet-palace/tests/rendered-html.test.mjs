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
  assert.match(html, /<title>Princess Pet Palace \| Free Preschool Learning Game<\/title>/i);
  assert.match(html, /rel="canonical" href="https:\/\/princess-pet-palace\.createsomethingtoday\.chatgpt\.site\/?"/i);
  assert.match(html, /rel="manifest" href="https:\/\/princess-pet-palace\.createsomethingtoday\.chatgpt\.site\/site\.webmanifest"/i);
  assert.match(html, /rel="apple-touch-icon"[^>]+href="https:\/\/princess-pet-palace\.createsomethingtoday\.chatgpt\.site\/apple-touch-icon\.png"/i);
  assert.match(html, /name="robots" content="index, follow/i);
  const structuredDataMatch = html.match(
    /<script id="princess-pet-palace-structured-data" type="application\/ld\+json">([\s\S]*?)<\/script>/i,
  );
  assert.ok(structuredDataMatch, "renders JSON-LD discovery data");
  const structuredData = JSON.parse(structuredDataMatch[1]);
  const application = structuredData.find((item) => item["@type"] === "SoftwareApplication");
  const faqPage = structuredData.find((item) => item["@type"] === "FAQPage");
  assert.equal(application?.applicationCategory, "EducationalApplication");
  assert.equal(application?.isAccessibleForFree, true);
  assert.equal(application?.isFamilyFriendly, true);
  assert.equal(faqPage?.mainEntity.length, 4);
  assert.match(html, /Stella(?:&#x27;|')s princess adventure/);
  assert.match(html, /Stella, open the palace doors/);
  assert.match(html, /six magical rooms/);
  assert.match(html, /Play with the princess/);
  assert.match(html, /The princess says hi to Stella and is ready to play/);
  assert.match(html, /data-testid="mobile-royal-invite"/);
  assert.match(html, /data-testid="adventure-guide"/);
  assert.match(html, /Six short rooms in about four playful minutes/);
  assert.match(html, /Listen for first sounds/);
  assert.match(html, /Count one by one/);
  assert.match(html, /Balance and big movement/);
  assert.match(html, /Letter Garden/);
  assert.match(html, /Pet Parade/);
  assert.match(html, /Royal Gym/);
  assert.match(html, /No ads, accounts, or tracking/);
  assert.match(html, /AI-generated voice, not a human voice/i);
  assert.match(html, /data-testid="grownup-guide"/);
  assert.match(html, /For grown-ups/);
  assert.match(html, /What does Princess Pet Palace teach\?/);
  assert.match(html, /What age is Princess Pet Palace for\?/);
  assert.match(html, /How does camera magic work\?/);
  assert.doesNotMatch(html, /starts only after a grown-up tap|Learning goals, privacy/i);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|Your site is taking shape/i);
  assert.match(html, /data-testid="start-game"/);
});
