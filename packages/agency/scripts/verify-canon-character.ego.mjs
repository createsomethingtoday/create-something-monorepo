// Run with ego-browser nodejs in the caller's existing TaskSpace. Prepend:
// globalThis.CANON_REPLACEMENT = {taskSpaceId:20,pageId:'p1',
//   baseURL:'http://127.0.0.1:5192',output:'/absolute/evidence/path'};
// This replaces older homepage-specific character/hero smoke scripts.
const assert = (await import('node:assert/strict')).default;
const fs = await import('node:fs/promises');
const config = globalThis.CANON_REPLACEMENT ?? {};
assert.ok(Number.isInteger(config.taskSpaceId), 'Use the existing TaskSpace ID');
const task = await taskSpace(config.taskSpaceId);
const p = task.page(config.pageId ?? 'p1');
const base = new URL(config.baseURL ?? 'http://127.0.0.1:5192');
assert.ok(config.output?.startsWith('/'), 'Provide an absolute evidence directory');
await fs.mkdir(config.output, {recursive:true});
const results = [];
const routes = config.routes ?? ['/', '/contact', '/book', '/support-brief', '/privacy', '/terms', '/openai-dots', '/products/ground', '/practice', '/agent-foundation?study=image-reveal'];
for (const route of routes) {
  for (const width of config.widths ?? [320,390,768,1024,1025,1440]) {
    await p.cdp('Emulation.setDeviceMetricsOverride', {width,height:1000,deviceScaleFactor:1,mobile:false});
    await p.goto(new URL(route, base).href);
    await p.evaluate(() => document.fonts.ready.then(() => true));
    await p.waitForFunction(() => document.querySelector('main h1') && !document.querySelector('.story-curtain'));
    const report = await p.evaluate(async () => {
      const visible = node => node.getClientRects().length && getComputedStyle(node).visibility !== 'hidden' && getComputedStyle(node).display !== 'none';
      const images = [...document.querySelectorAll('main img,footer img')].map(img => ({src:img.getAttribute('src'),width:img.getBoundingClientRect().width,height:img.getBoundingClientRect().height,loaded:img.complete&&img.naturalWidth>0,visible:!!visible(img),inViewport:img.getBoundingClientRect().top<innerHeight&&img.getBoundingClientRect().bottom>0}));
      const backgrounds = [...document.querySelectorAll('main,main section,main header,main div')].flatMap(node => [undefined,'::before','::after'].flatMap(pseudo => {
        const background = getComputedStyle(node,pseudo).backgroundImage;
        return [...background.matchAll(/url\(["']?([^"')]+)["']?\)/g)].map(match=>({url:match[1],owner:node.className,pseudo:pseudo??'element'}));
      }));
      // Embedded SVG filters may contain their own url(%23id); only network
      // image URLs represent separate resources to load here.
      const urls = [...new Set(backgrounds.map(item=>item.url).filter(url=>/^https?:\/\//.test(url)))];
      const backgroundLoads = await Promise.all(urls.map(url=>new Promise(resolve=>{const img=new Image();img.onload=()=>resolve({url,loaded:true});img.onerror=()=>resolve({url,loaded:false});img.src=url;})));
      const layout = document.querySelector('.layout-root') ?? document.body;
      return {path:location.pathname,query:location.search,width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth,background:getComputedStyle(layout).backgroundColor,font:getComputedStyle(document.querySelector('main h1')).fontFamily,headings:[...document.querySelectorAll('main h1')].filter(visible).map(node=>node.textContent.trim()),images,backgrounds,backgroundLoads,buttons:[...document.querySelectorAll('main button,main a')].filter(visible).length};
    });
    assert.equal(report.width,width);
    assert.equal(report.overflow,false,`${route} overflow at${width}`);
    assert.equal(report.background,'rgb(0, 0, 0)',`${route} black foundation`);
    assert.match(report.font,/Geist/i,`${route} house typography`);
    assert.ok(report.headings.length>0,`${route} visible heading`);
    const media = [...report.images.map(item=>item.src??''),...report.backgroundLoads.map(item=>item.url)];
    assert.ok(!media.some(src=>/\/images\/agency-stories\/|\/canon\/(?:idle|review|waving|jumping)\/|canon-silent\.mp4|\/images\/agency-sales\/(?!OpenAI_Select_Partner_Badge\.png)/.test(src)),`${route} retired character URL`);
    assert.ok(report.backgroundLoads.every(item=>item.loaded),`${route} background loads`);
    for (const img of report.images.filter(item=>item.visible&&item.src?.endsWith('head-r42.webp'))) {
      // Approved head uses a132px image inside its96px optical frame.
      assert.ok(Math.abs(img.width-132)<1,`${route} approved head optical scale`);
    }
    const name=route.replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'')||'home';
    report.screenshot=await p.screenshot({path:`${config.output}/${name}-${width}.png`});
    results.push(report);
  }
}
await fs.writeFile(`${config.output}/results.json`,JSON.stringify(results,null,2)+'\n');
console.log(JSON.stringify({status:'passed',cases:results.length,output:config.output}));
