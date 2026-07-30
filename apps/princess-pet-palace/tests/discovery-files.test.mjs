import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const publicUrl = new URL("../public/", import.meta.url);
const siteUrl = "https://princess-pet-palace.createsomethingtoday.chatgpt.site";

async function pngSize(filename) {
  const image = await readFile(new URL(filename, publicUrl));
  assert.deepEqual([...image.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  return [image.readUInt32BE(16), image.readUInt32BE(20)];
}

test("publishes an installable web app manifest and correctly sized icons", async () => {
  const manifest = JSON.parse(await readFile(new URL("site.webmanifest", publicUrl), "utf8"));

  assert.equal(manifest.name, "Princess Pet Palace");
  assert.equal(manifest.start_url, "/");
  assert.equal(manifest.display, "standalone");
  assert.deepEqual(manifest.categories, ["education", "games"]);
  assert.ok(manifest.icons.some((icon) => icon.src === "/icon-192.png" && icon.sizes === "192x192"));
  assert.ok(manifest.icons.some((icon) => icon.src === "/icon-512.png" && icon.sizes === "512x512"));

  assert.deepEqual(await pngSize("favicon-32.png"), [32, 32]);
  assert.deepEqual(await pngSize("apple-touch-icon.png"), [180, 180]);
  assert.deepEqual(await pngSize("icon-192.png"), [192, 192]);
  assert.deepEqual(await pngSize("icon-512.png"), [512, 512]);
});

test("publishes crawl guidance and the canonical sitemap URL", async () => {
  const robots = await readFile(new URL("robots.txt", publicUrl), "utf8");
  const sitemap = await readFile(new URL("sitemap.xml", publicUrl), "utf8");

  assert.match(robots, /User-agent: \*/);
  assert.match(robots, /Allow: \//);
  assert.match(robots, new RegExp(`Sitemap: ${siteUrl.replaceAll(".", "\\.")}\\/sitemap\\.xml`));
  assert.match(sitemap, new RegExp(`<loc>${siteUrl.replaceAll(".", "\\.")}\\/?<\\/loc>`));
});
