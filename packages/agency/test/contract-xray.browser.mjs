/** Read-only browser acceptance against an isolated Chrome CDP profile. No new dependencies. */
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
const endpoint = process.env.XRAY_CDP || 'http://127.0.0.1:9334';
const target = process.env.XRAY_URL || 'http://127.0.0.1:4182/#contract-lesson-title';
const output = path.resolve(process.env.XRAY_EVIDENCE || 'test-results/contract-xray');
mkdirSync(output, { recursive: true });
const tabs = await (await fetch(endpoint + '/json/list')).json();
const ws = new WebSocket(tabs.find((t) => t.type === 'page').webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let sequence = 0;
const requests = new Map(),
  errors = [];
ws.onmessage = ({ data }) => {
  const m = JSON.parse(data);
  if (m.id) {
    requests.get(m.id)?.(m);
    requests.delete(m.id);
  }
  if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.text);
};
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const id = ++sequence;
    requests.set(id, (m) => (m.error ? reject(m.error) : resolve(m.result)));
    ws.send(JSON.stringify({ id, method, params }));
  });
const evaluate = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw Error(JSON.stringify(r.exceptionDetails));
  return r.result.value;
};
const pause = () => new Promise((r) => setTimeout(r, 100));
const $ = `document.querySelector('[data-contract-xray]')`;
const click = async (label) => {
  await evaluate(
    `(()=>{const b=[...${$}.querySelectorAll('button')].find(b=>(b.getAttribute('aria-label')||b.textContent.trim())===${JSON.stringify(label)});if(!b)throw Error('Missing control');b.click()})()`
  );
  await pause();
};
const shot = async (name, selector = '.contract-lesson') => {
  const rect = await evaluate(
    `(()=>{const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return {x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:Math.min(r.height,2400),scale:1}})()`
  );
  const result = await send('Page.captureScreenshot', {
    format: 'png',
    clip: rect,
    captureBeyondViewport: true
  });
  writeFileSync(path.join(output, name), Buffer.from(result.data, 'base64'));
};
await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setScriptExecutionDisabled', { value: false });
await send('Emulation.setDeviceMetricsOverride', {
  width: 1440,
  height: 1100,
  deviceScaleFactor: 1,
  mobile: false
});
await send('Page.navigate', { url: target });
let ready = false;
for (let i = 0; i < 100; i++) {
  ready = await evaluate(`!!${$}?.querySelector('button')`);
  if (ready) break;
  await pause();
}
assert(ready, 'Lesson must hydrate');
await evaluate(
  `document.getElementById('contract-lesson-title').scrollIntoView({behavior:'instant',block:'start'})`
);
await pause();
const results = { target, browser: await send('Browser.getVersion') };
results.initial = await evaluate(
  `({assemblies:${$}.querySelectorAll('[data-assembly]').length,selected:${$}.querySelector('.selected').getAttribute('data-assembly'),glass:${$}.querySelectorAll('.glass').length,lesson:document.querySelector('.lesson-parts').innerText})`
);
assert.equal(results.initial.assemblies, 4);
assert.equal(results.initial.selected, 'host');
assert.equal(results.initial.glass, 5);
assert(results.initial.lesson.includes('Markdown alone cannot grant access'));
assert(results.initial.lesson.includes('a receipt is not automatically signed'));
await shot('agency-xray-desktop.png');
await click('4. Receipt');
assert(
  (await evaluate(`${$}.querySelector('.inspection').textContent`)).includes('independent proof')
);
await click('Zoom in');
await click('Zoom in');
assert.equal(await evaluate(`${$}.querySelector('output').textContent`), '156%');
await click('Pan right');
results.zoom = await evaluate(`${$}.querySelector('.world').getAttribute('transform')`);
assert(results.zoom.includes('250 260'));
await shot('agency-xray-zoom.png', '.contract-lesson figure');
await evaluate(`${$}.querySelector('.viewport').focus()`);
await send('Input.dispatchKeyEvent', { type: 'keyDown', key: '0', code: 'Digit0' });
await pause();
assert.equal(await evaluate(`${$}.querySelector('output').textContent`), '100%');
results.wheel = await evaluate(
  `(()=>{const e=new WheelEvent('wheel',{deltaY:100,bubbles:true,cancelable:true});${$}.querySelector('.viewport').dispatchEvent(e);return e.defaultPrevented})()`
);
assert.equal(results.wheel, false);
await click('Cutaway');
assert.equal(await evaluate(`${$}.querySelectorAll('.glass').length`), 2);
await evaluate(
  `${$}.querySelector('select').value='front';${$}.querySelector('select').dispatchEvent(new Event('change',{bubbles:true}))`
);
await pause();
assert.equal(await evaluate(`${$}.querySelectorAll('[data-assembly]').length`), 4);
await click('Reset');
await send('Emulation.setEmulatedMedia', {
  features: [{ name: 'prefers-reduced-motion', value: 'reduce' }]
});
await send('Emulation.setDeviceMetricsOverride', {
  width: 390,
  height: 844,
  deviceScaleFactor: 1,
  mobile: true
});
await send('Emulation.setTouchEmulationEnabled', { enabled: true });
await evaluate(
  `document.querySelector('.contract-lesson figure').scrollIntoView({behavior:'instant',block:'start'})`
);
await pause();
results.mobile = await evaluate(
  `({overflow:document.documentElement.scrollWidth>innerWidth,minTarget:Math.min(...[...${$}.querySelectorAll('button,select')].map(b=>b.getBoundingClientRect().height)),touch:getComputedStyle(${$}.querySelector('.viewport')).touchAction})`
);
assert.equal(results.mobile.overflow, false);
assert(results.mobile.minTarget >= 44);
assert(results.mobile.touch.includes('pan-y'));
await shot('agency-xray-mobile.png', '.contract-lesson figure');
await send('Emulation.setDeviceMetricsOverride', {
  width: 390,
  height: 844,
  deviceScaleFactor: 1,
  mobile: true
});
await click('Pan & pinch');
await evaluate(
  `${$}.querySelector('.viewport').scrollIntoView({behavior:'instant',block:'center'})`
);
await pause();
const pos = await evaluate(
  `(()=>{const r=${$}.querySelector('.viewport').getBoundingClientRect();const x=r.x+r.width/2,y=r.y+r.height/2;if(!${$}.querySelector('.viewport').contains(document.elementFromPoint(x,y)))throw Error('Gesture target is offscreen');return {x,y}})()`
);
await send('Input.dispatchTouchEvent', {
  type: 'touchStart',
  touchPoints: [
    { x: pos.x - 30, y: pos.y, id: 1 },
    { x: pos.x + 30, y: pos.y, id: 2 }
  ]
});
await send('Input.dispatchTouchEvent', {
  type: 'touchMove',
  touchPoints: [
    { x: pos.x - 55, y: pos.y, id: 1 },
    { x: pos.x + 55, y: pos.y, id: 2 }
  ]
});
await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
await pause();
results.pinch = await evaluate(`${$}.querySelector('output').textContent`);
assert(parseInt(results.pinch) > 100);
await shot('agency-xray-mobile-zoom.png', '.contract-lesson figure');
await send('Emulation.setDeviceMetricsOverride', {
  width: 320,
  height: 844,
  deviceScaleFactor: 1,
  mobile: false
});
results.narrow = await evaluate(
  `({overflow:document.documentElement.scrollWidth>innerWidth,label:parseFloat(getComputedStyle(${$}.querySelector('.annotation text')).fontSize)*${$}.querySelector('svg').getBoundingClientRect().width/440})`
);
assert.equal(results.narrow.overflow, false);
assert(results.narrow.label >= 12);
await send('Emulation.setDeviceMetricsOverride', {
  width: 1440,
  height: 1100,
  deviceScaleFactor: 1,
  mobile: false
});
await click('Fit');
await click('Zoom in');
const pdf = await send('Page.printToPDF', { printBackground: true });
writeFileSync(path.join(output, 'agency-xray-print.pdf'), Buffer.from(pdf.data, 'base64'));
await pause();
assert.equal(await evaluate(`${$}.querySelector('output').textContent`), '125%');
await send('Emulation.setScriptExecutionDisabled', { value: true });
await send('Page.reload');
await new Promise((r) => setTimeout(r, 1000));
results.nojs = await evaluate(
  `({assemblies:${$}.querySelectorAll('[data-assembly]').length,controls:${$}.querySelectorAll('button').length,parts:document.querySelectorAll('.lesson-parts ol>li').length})`
);
assert.equal(results.nojs.assemblies, 4);
assert.equal(results.nojs.controls, 0);
assert.equal(results.nojs.parts, 4);
await shot('agency-xray-nojs.png');
results.errors = errors;
assert.equal(errors.length, 0);
writeFileSync(path.join(output, 'browser-results.json'), JSON.stringify(results, null, 2));
console.log(JSON.stringify(results, null, 2));
await send('Emulation.setScriptExecutionDisabled', { value: false });
ws.close();
