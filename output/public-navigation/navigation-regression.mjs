// Start the local SvelteKit dev server on 43127; run via ego-browser nodejs < this file.
const t = await taskSpace(globalThis.publicNavigationSpaceId ?? 'PRIVATE public navigation regression');
const p = t.page('p1');
const expected = ['/start','/field-engineering','/library','/paths','/join','/support','/signup','/privacy','/terms','/login'];
await p.cdp('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});
await p.goto('http://127.0.0.1:43127/');
await p.waitForSelector('.masthead.enhanced');
const links = await p.evaluate(()=>[...document.querySelectorAll('#primary-navigation a')].map(a=>({href:a.getAttribute('href'),text:a.textContent.trim()})));
const actual=links.map(l=>l.href);
const missing=expected.filter(h=>!actual.includes(h)),unexpected=actual.filter(h=>!expected.includes(h));
console.log(JSON.stringify({check:'complete anonymous navigation',expected,links,missing,unexpected,pass:!missing.length&&!unexpected.length}));
if(missing.length||unexpected.length) throw new Error('Anonymous navigation omits public destinations or exposes protected/utility destinations');


const results = [];
const record = (name, actual, pass) => {
  results.push({name,actual,pass}); console.log(JSON.stringify(results.at(-1)));
  if(!pass) throw new Error(`Navigation regression: ${name}`);
};
const directory = globalThis.publicNavigationEvidenceDirectory;
const shot = async (name) => {if(directory) await p.screenshot({path:`${directory}/screenshots/${name}.png`,fullPage:true});};
for (const width of (globalThis.publicNavigationWidths ?? [320,390,768,1100,1101,1280,1440])) {
  await p.cdp('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});
  await p.goto('http://127.0.0.1:43127/');
  await p.waitForSelector('.masthead.enhanced');
  await shot(`anonymous-closed-${width}`);
  if(width<=1100) {await p.focus('.menu-toggle');await p.keyboard.press('Enter');}
  await p.focus('.public-nav summary'); await p.keyboard.press('Enter');
  let a=await p.evaluate(()=>({open:document.querySelector('.public-nav').open, width:document.documentElement.scrollWidth,
    links:[...document.querySelectorAll('#primary-navigation a')].map(a=>({href:a.getAttribute('href'),visible:a.checkVisibility(),height:a.getBoundingClientRect().height})),
    wordmark:document.querySelector('.wordmark').getAttribute('href')}));
  record(`all-public-links-${width}`,a,a.open&&a.width===width&&a.wordmark==='/'&&a.links.length===expected.length&&a.links.every(l=>expected.includes(l.href)&&l.visible&&l.height>=44));
  await shot(`anonymous-open-${width}`);
  await p.keyboard.press('Space');
  a=await p.evaluate(()=>document.querySelector('.public-nav').open);
  record(`summary-space-close-${width}`,a,!a);
  await p.keyboard.press('Space');
  a=await p.evaluate(()=>document.querySelector('.public-nav').open);
  record(`summary-space-open-${width}`,a,a);
  await p.keyboard.press('Tab');
  a=await p.evaluate(()=>({href:document.activeElement.getAttribute('href'),outline:getComputedStyle(document.activeElement).outlineWidth}));
  record(`group-keyboard-focus-${width}`,a,a.href==='/join'&&a.outline==='3px');
  await p.keyboard.press('Escape');
  a=await p.evaluate(()=>({open:document.querySelector('.public-nav').open,summary:document.activeElement===document.querySelector('.public-nav summary')}));
  record(`group-escape-${width}`,a,!a.open&&a.summary);
  if(width<=1100) {
    await p.keyboard.press('Escape');
    a=await p.evaluate(()=>({expanded:document.querySelector('.menu-toggle').getAttribute('aria-expanded'),focus:document.activeElement===document.querySelector('.menu-toggle')}));
    record(`mobile-escape-${width}`,a,a.expanded==='false'&&a.focus);
    await p.keyboard.press('Enter');
  }
  await p.focus('.public-nav summary'); await p.keyboard.press('Enter');
  await p.evaluate(()=>{window.__navigationProbe='same-document';});
  await p.click('#primary-navigation a[href="/support"]');
  await p.waitForURL('http://127.0.0.1:43127/support');
  await p.waitForFunction(()=>!document.querySelector('.public-nav').open);
  a=await p.evaluate(()=>({sameDocument:window.__navigationProbe==='same-document',more:document.querySelector('.public-nav').open,
    menu:document.querySelector('.menu-toggle').getAttribute('aria-expanded'),current:document.querySelector('#primary-navigation a[aria-current="page"]')?.getAttribute('href')}));
  record(`client-navigation-closes-${width}`,a,a.sameDocument&&!a.more&&a.menu==='false'&&a.current==='/support');
  for(const role of ['member','admin']) {
    await p.goto(`http://127.0.0.1:43127/?fixtureRole=${role}`);
    await p.waitForSelector('.masthead.enhanced');
    if(width<=1100) await p.click('.menu-toggle');
    if(role==='admin') {await p.focus('.admin-nav summary');await p.keyboard.press('Enter');}
    a=await p.evaluate(()=>({links:[...document.querySelectorAll('#primary-navigation a')].map(a=>a.getAttribute('href')),width:document.documentElement.scrollWidth,publicGroup:!!document.querySelector('.public-nav')}));
    const expectedRole=['/field-engineering','/library','/collection','/remote-sessions','/dashboard',...(role==='admin'?['/review','/support-session','/impact']:[])];
    record(`${role}-preserved-${width}`,a,!a.publicGroup&&a.width===width&&JSON.stringify(a.links)===JSON.stringify(expectedRole));
    if(role==='admin') {
      await p.keyboard.press('Tab');await p.keyboard.press('Escape');
      a=await p.evaluate(()=>({open:document.querySelector('.admin-nav').open,focused:document.activeElement===document.querySelector('.admin-nav summary')}));
      record(`admin-escape-${width}`,a,!a.open&&a.focused);
    }
  }
}
// Every primary destination must identify itself; token-specific verification stays absent.
for(const path of expected) {
  await p.goto(`http://127.0.0.1:43127${path}`);await p.waitForSelector('.masthead.enhanced');
  const a=await p.evaluate(()=>[...document.querySelectorAll('#primary-navigation a[aria-current="page"]')].map(a=>a.getAttribute('href')));
  record(`aria-current-${path}`,a,JSON.stringify(a)===JSON.stringify([path]));
}
// CSP blocks all application scripts on this SSR response; agent inspection remains available.
for(const width of [320,390,768,1100,1101,1280,1440]) {
  await p.cdp('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});
  await p.goto('http://127.0.0.1:43127/?nojs');await p.waitForSelector('.public-nav summary');
  await p.click('.public-nav summary');
  const a=await p.evaluate(()=>({enhanced:document.querySelector('.masthead').classList.contains('enhanced'),open:document.querySelector('.public-nav').open,
    width:document.documentElement.scrollWidth,links:[...document.querySelectorAll('#primary-navigation a')].map(a=>({href:a.getAttribute('href'),visible:a.checkVisibility()}))}));
  record(`no-js-${width}`,a,!a.enhanced&&a.open&&a.width===width&&a.links.length===expected.length&&a.links.every(l=>l.visible&&expected.includes(l.href)));
  await shot(`no-js-open-${width}`);
}
if(directory) {
  const fs=await import('node:fs/promises');await fs.writeFile(`${directory}/rendered-results.json`,JSON.stringify(results,null,2)+'\n');
}
console.log(`PASS: ${results.length+1} rendered navigation assertions.`);
if(globalThis.publicNavigationSpaceId===undefined) await t.finish({keep:[]});
