// LOCAL ONLY: start shared-inbox-fixture.ts, then `ego-browser nodejs < this-file`.
// Exercises actual app.fetch + ephemeral SQLite using synthetic owner cookies.
// Does not establish real Identity login, host operation or external delivery.
// Run the printed task.finish command in a separate ego-browser script afterward.
const task = await taskSpace('Shared inbox local regression');
const page = task.page('p1');
console.log({
  taskSpaceId: task.spaceId,
  finish: `const task = await taskSpace(${task.spaceId}); await task.finish({keep:[]});`
});
const assert = (value, message) => {
  if (!value) throw new Error(message);
};
const base = 'http://127.0.0.1:4176';
await page.goto(base + '/inboxes.html');
await page.waitForSelector('textarea[name=text]');
const fixture = JSON.parse((await page.fetch('/fixture/state')).body);
await page.click('loc=role:button[name*="Long history fixture"]');
await page.waitForSelector('text="Load more messages"');
for (const width of [320, 390, 768, 1024, 1025, 1440]) {
  await page.cdp('Emulation.setDeviceMetricsOverride', {
    width,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false
  });
  const metrics = await page.evaluate(() => ({
    width: innerWidth,
    scroll: document.documentElement.scrollWidth,
    unlabeled: [...document.querySelectorAll('input,textarea,select')].filter(
      (n) => n.offsetParent && !n.labels?.length
    ).length
  }));
  assert(metrics.scroll <= metrics.width, `Horizontal overflow at ${width}`);
  assert(metrics.unlabeled === 0, `Unlabeled visible control at ${width}`);
  const header = await page.evaluate(() => {
    const a = document.querySelector('#account-email').getBoundingClientRect(),
      b = document.querySelector('.account-area a').getBoundingClientRect();
    return {
      overlap:
        Math.min(a.right, b.right) > Math.max(a.left, b.left) &&
        Math.min(a.bottom, b.bottom) > Math.max(a.top, b.top)
    };
  });
  assert(!header.overlap, `Account email overlaps header navigation at ${width}`);
  console.log({ width, ...metrics });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `/tmp/cre-2448-ui-evidence/actual-conversation-${width}.png` });
}
await page.cdp('Emulation.setEmulatedMedia', {
  features: [{ name: 'prefers-reduced-motion', value: 'reduce' }]
});
const unique = `Independent long-history post ${Date.now()}`;
await page.focus('textarea[name=text]');
await page.fill('textarea[name=text]', unique);
await page.focus('button[type=submit]:text-is("Post conversation →")');
await page.keyboard.press('Enter');
await page.waitForFunction(
  (text) => [...document.querySelectorAll('.message-text')].some((n) => n.textContent === text),
  unique
);
assert(
  await page.evaluate(
    (text) =>
      document.activeElement?.matches('article.shared-message') &&
      document.activeElement.innerText.includes(text),
    unique
  ),
  'Newly posted article did not receive focus'
);
assert(
  await page.evaluate(() => document.body.innerText.includes('Load more messages')),
  'Older pagination was lost after post'
);
await page.focus('text="Load more messages"');
await page.keyboard.press('Enter');
await page.waitForFunction(() => !document.body.innerText.includes('Load more messages'));
const dedup = await page.evaluate(
  (text) => ({
    count: [...document.querySelectorAll('.message-text')].filter((n) => n.textContent === text)
      .length,
    ids: [...document.querySelectorAll('article.shared-message')].map((n) => n.id)
  }),
  unique
);
assert(
  dedup.count === 1 && new Set(dedup.ids).size === dedup.ids.length,
  'Catch-up duplicated a posted message'
);
const audit = JSON.parse((await page.fetch('/fixture/audit')).body);
assert(
  audit.some(
    (a) =>
      a.path === `/inboxes/${fixture.inboxId}/messages` &&
      a.body?.kind === 'conversation' &&
      a.body?.idempotencyKey
  ),
  'Owner post payload missing'
);
// Delay one actual API post to switch inbox while the request is in flight.
await page.fetch('/fixture/delay-next-post');
const switching = `In-flight switch ${Date.now()}`;
await page.focus('textarea[name=text]');
await page.fill('textarea[name=text]', switching);
await page.focus('button[type=submit]:text-is("Post conversation →")');
await page.keyboard.press('Enter');
await page.focus('loc=role:button[name*="Second fixture inbox"]');
await page.keyboard.press('Enter');
// The submitted draft may still prompt on navigation; explicitly approve only this synthetic draft.
const open = await page.evaluate(() => !!document.querySelector('dialog[open]'));
if (open) {
  await page.focus('#review-confirm');
  await page.keyboard.press('Enter');
}
await page.waitForFunction(
  () => document.querySelector('.workspace-title')?.textContent === 'Second fixture inbox'
);
// A read of the first inbox waits behind its delayed mutation only in observable polling below.
await page.waitForFunction(
  async ({ id, text }) => {
    const r = await fetch(`/api/v2/inboxes/${id}/messages?after=50`);
    const d = await r.json();
    return d.items?.some((m) => m.text === text);
  },
  { id: fixture.inboxId, text: switching }
);
assert(
  await page.evaluate(
    (text) =>
      document.querySelector('.workspace-title')?.textContent === 'Second fixture inbox' &&
      !document.querySelector('.message-stream')?.innerText.includes(text),
    switching
  ),
  'Delayed post changed the newly selected inbox'
);
await page.click('text="Delivery & status"');
await page.waitForFunction(
  () =>
    document.body.textContent.includes('No event subscriptions recorded') ||
    document.body.textContent.includes('receipts are unavailable')
);
await page.keyboard.press('Tab');
assert(await page.evaluate(() => document.activeElement !== document.body), 'Keyboard focus lost');
console.log(
  'PASS: actual local HTTP/SQLite long-history post visibility, article focus, catch-up deduplication, inbox-switch guard, responsive widths and labels; synthetic sessions only.'
);
