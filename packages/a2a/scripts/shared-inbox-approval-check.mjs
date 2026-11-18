// Local only. Start shared-inbox-fixture.ts with A2A_FIXTURE_PORT=4188.
// Run with ego-browser nodejs; close the printed task space after reviewing output.
const task = await taskSpace('Shared inbox PR review');
const page = task.page('p1');
await page.goto('http://127.0.0.1:4188/inboxes.html');
await page.waitForSelector('textarea[name=text]');
await page.click('loc=role:button[name*="Second fixture inbox"]');
await page.waitForFunction(() => document.body.textContent.includes('Approval fixture cancel'));
const fixture = JSON.parse((await page.fetch('/fixture/state')).body);
const [reassign, cancel] = fixture.approvalMessageIds;
const assert = (value, message) => {
  if (!value) throw new Error(message);
};
assert(
  await page.evaluate(
    (ids) =>
      ids.every((id) => {
        const article = document.getElementById(`message-${id}`);
        return (
        article?.innerText.includes('approval required') &&
          [...article.querySelectorAll('button')].some((b) => b.textContent === 'Reassign') &&
          [...article.querySelectorAll('button')].some((b) => b.textContent === 'Cancel request')
        );
      }),
    [reassign, cancel]
  ),
  'Approval-required requests must expose owner resolution actions'
);
await page.cdp('Emulation.setDeviceMetricsOverride', {
  width: 390,
  height: 1000,
  deviceScaleFactor: 1,
  mobile: false
});
await page.screenshot({ path: '/tmp/cre-2448-ui-evidence/approval-required.png', fullPage: true });
await page.click(`#message-${reassign} button:text-is("Reassign")`);
await page.waitForFunction(
  (id) => document.getElementById(`message-${id}`)?.innerText.includes('Work: pending'),
  reassign
);
await page.click(`#message-${cancel} button:text-is("Cancel request")`);
await page.waitForSelector('#review-dialog[open]');
await page.click('#review-confirm');
await page.waitForFunction(
  (id) => document.getElementById(`message-${id}`)?.innerText.includes('Work: cancelled'),
  cancel
);
const response = await page.fetch(`/api/v2/inboxes/${fixture.secondInboxId}/messages`);
const messages = JSON.parse(response.body).items;
assert(
  messages.find((m) => m.id === reassign)?.state === 'pending',
  'Reassignment was not committed'
);
assert(
  messages.find((m) => m.id === cancel)?.state === 'cancelled',
  'Cancellation was not committed'
);
console.log({
  pass: true,
  taskSpace: task.spaceId,
  scope: 'actual local HTTP/SQLite, synthetic owner; no production writes'
});
console.log(await page.snapshot({ scope: 'full_page' }));
