const fs = require("node:fs/promises");
const path = require("node:path");
const { chromium } = require(
  require.resolve("playwright", { paths: [process.env.PLAYWRIGHT_PATH || process.cwd()] }),
);
(async () => {
  const dir = path.join(__dirname, "stills", process.argv[2] || "r01");
  await fs.mkdir(dir, { recursive: true });
  const browser = await chromium.launch({
    channel: "chrome",
    headless: true,
  });
  try {
    for (const width of [320, 390, 768, 1024, 1025, 1440]) {
      const page = await browser.newPage({
        viewport: { width, height: width < 768 ? 844 : 900 },
        reducedMotion: "reduce",
        javaScriptEnabled: false,
      });
      const errors = [];
      page.on("response", (res) => {
        if (res.status() >= 400) errors.push(res.url());
      });
      await page.goto(process.env.CRM_URL || "http://127.0.0.1:18536/", { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
      const result = await page.evaluate(() => ({
        width: innerWidth,
        scroll: document.documentElement.scrollWidth,
        heading: document.querySelector("h1")?.innerText,
        joinedWords: /thana place|tostore/.test(document.body.innerText),
        anchors: [...document.links]
          .filter(
            (a) =>
              a.hash &&
              a.origin === location.origin &&
              !document.getElementById(a.hash.slice(1)),
          )
          .map((a) => a.hash),
        images: [...document.images].map(
          (i) => i.complete && i.naturalWidth > 0,
        ),
        inquiries: [...document.links].filter(
          (a) =>
            a.hostname === "createsomething.agency" &&
            a.pathname === "/contact",
        ).length,
      }));
      await page.screenshot({
        path: path.join(dir, width + "-full.png"),
        fullPage: true,
      });
      if (width === 390 || width === 1440)
        await page.screenshot({ path: path.join(dir, width + "-hero.png") });
      await page.keyboard.press("Tab");
      result.firstFocus = await page.evaluate(() =>
        document.activeElement.textContent.trim(),
      );
      console.log(JSON.stringify({ ...result, errors }));
      if (
        result.width !== result.scroll ||
        result.joinedWords ||
        result.firstFocus !== "Skip to content" ||
        !result.heading ||
        result.anchors.length ||
        result.images.includes(false) ||
        !result.inquiries ||
        errors.length
      )
        process.exitCode = 1;
      await page.close();
    }
  } finally {
    await browser.close();
  }
})().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
