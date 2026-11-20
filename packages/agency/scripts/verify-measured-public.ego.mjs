// Run in the parent's existing Ego space; never create or finish a space here.
// globalThis.MEASURED_PUBLIC = {taskSpaceId:9,pageId:'p1',
//   baseURL:'http://127.0.0.1:4193',output:'/absolute/evidence/path'};
const assert = (await import('node:assert/strict')).default;
const fs = await import('node:fs/promises');
const config = globalThis.MEASURED_PUBLIC ?? {};
assert.ok(Number.isInteger(config.taskSpaceId), 'Provide the existing TaskSpace ID');
const task = await taskSpace(config.taskSpaceId);
const p = task.page(config.pageId ?? 'p1');
const base = new URL(config.baseURL ?? 'http://127.0.0.1:4193');
const output = config.output ?? '/tmp/agency-measured-public';
await fs.mkdir(output, {recursive:true});
const reports = [];
for (const route of config.routes ?? ['/services','/products','/stack','/field-reports','/book','/contact']) {
  for (const width of config.widths ?? [320,390,768,1024,1025,1440]) {
    await p.cdp('Emulation.setDeviceMetricsOverride', {width,height:1000,deviceScaleFactor:1,mobile:false});
    const url = new URL(route,base); url.searchParams.set('public-brand-check',String(width));
    await p.goto(url.href);
    await p.waitForFunction((route)=>document.body.dataset.previewRoute === route,route);
    await p.evaluate(()=>document.fonts.ready.then(()=>true));
    await p.waitForFunction(()=>[...document.querySelectorAll('.agency-preview-media img')].every(i=>i.complete));
    const report = await p.evaluate(()=>{
      const style = selector => getComputedStyle(document.querySelector(selector));
      const nav = document.querySelector('.nav-fixed').getBoundingClientRect();
      const headings = [...document.querySelectorAll('main h1')].filter(h=>h.getClientRects().length && getComputedStyle(h).display!=='none');
      const search = document.querySelector('.mobile-search-button');
      const searchRect = search?.getBoundingClientRect();
      const overlap = (a,b)=>a && b && Math.min(a.right,b.right)>Math.max(a.left,b.left) && Math.min(a.bottom,b.bottom)>Math.max(a.top,b.top);
      return {
        path:location.pathname,width:innerWidth,clientWidth:document.documentElement.clientWidth,
        brand:document.querySelector('.agency-surface').dataset.agencyBrand,
        background:style('.layout-root').backgroundColor,documentBackground:style('html').backgroundColor,
        nav:{background:style('.nav-fixed').backgroundColor,radius:style('.nav-fixed').borderRadius,x:nav.x,y:nav.y,right:nav.right,bottom:nav.bottom},
        headings:headings.map(h=>({text:h.textContent.trim(),color:getComputedStyle(h).color,rect:h.getBoundingClientRect().toJSON()})),
        overflow:document.documentElement.scrollWidth>innerWidth,
        search:search && getComputedStyle(search).display!=='none' ? {
          height:searchRect.height,top:searchRect.top,bottom:searchRect.bottom,
          coversAction:[...document.querySelectorAll('main a,main button')].some(a=>a.getClientRects().length && overlap(searchRect,a.getBoundingClientRect())),
          coversMenu:overlap(searchRect,document.querySelector('.nav-menu-button')?.getBoundingClientRect())
        } : undefined,
        openingBackground:document.querySelector('.performance-campaign-opening') ? style('.performance-campaign-opening').backgroundColor : undefined,
        inquiryBackground:document.querySelector('.onboarding') ? style('.onboarding').backgroundColor : undefined,
        media:[...document.querySelectorAll('.agency-preview-media img')].map(i=>({src:i.getAttribute('src'),loaded:i.complete&&i.naturalWidth>0,caption:i.closest('figure')?.querySelector('figcaption')?.textContent.trim()})),
        bookingFrame:document.querySelector('.scheduler-shell iframe')?.getAttribute('src'),
        bookingFallback:document.querySelector('.scheduler-shell__fallback a')?.getAttribute('href'),
        form:!!document.querySelector('form')
      };
    });
    assert.equal(report.width,width);
    assert.equal(report.brand,'measured',`${route} SSR brand ownership`);
    assert.equal(report.background,'rgb(0, 0, 0)',`${route} black shell`);
    assert.equal(report.documentBackground,'rgb(0, 0, 0)');
    assert.equal(report.nav.background,'rgb(0, 0, 0)');
    assert.equal(report.nav.radius,'0px');
    assert.equal(report.nav.x,0); assert.equal(report.nav.y,0);
    assert.ok(Math.abs(report.nav.right-report.clientWidth)<1);
    assert.equal(report.overflow,false,`${route} overflow at ${width}`);
    if(report.search && width<1280){
      assert.ok(report.search.height>=44 && report.search.top>=0 && report.search.bottom<=report.nav.bottom,'Search fits in the masthead');
      assert.equal(report.search.coversAction,false,`${route} search does not cover a reading or booking control`);
      assert.equal(report.search.coversMenu,false,'Search and menu have distinct targets');
    }
    if (report.openingBackground) assert.equal(report.openingBackground,'rgb(0, 0, 0)',`${route} opening resolves public surface roles`);
    if (report.inquiryBackground) assert.equal(report.inquiryBackground,'rgb(0, 0, 0)','Inquiry panel resolves public surface roles');
    assert.equal(report.headings.length,1,`${route} one visible title`);
    for (const h of report.headings) {
      assert.equal(h.color,'rgb(255, 255, 255)');
      assert.ok(h.rect.x>=-1 && h.rect.right<=report.clientWidth+1,`${route} title fits ${width}`);
      assert.ok(h.rect.top>=report.nav.bottom,`${route} title clears navigation at ${width}`);
    }
    assert.ok(report.media.every(i=>i.loaded&&i.caption),`${route} real images and captions`);
    if (route==='/book') {
      assert.ok(report.bookingFrame && report.bookingFallback,'Scheduler and fallback remain available');
      assert.equal(new URL(report.bookingFrame,base).origin,new URL(report.bookingFallback,base).origin);
    }
    if(route==='/contact') assert.equal(report.form,true,'Inquiry form remains available');
    await p.screenshot({path:`${output}/${route.slice(1)}-${width}.png`});
    reports.push(report);
  }
  console.log(`PASS ${route}: responsive public shell and content.`);
}
await fs.writeFile(`${output}/browser-report.json`,JSON.stringify(reports,null,2));
// The launcher is recreated when the shared dialog closes; focus must return
// to that live control rather than the detached button that opened it.
await p.cdp('Emulation.setDeviceMetricsOverride', {width:320,height:1000,deviceScaleFactor:1,mobile:false});
await p.goto(new URL('/services?public-brand-check=search-focus',base).href);
await p.waitForFunction(()=>document.querySelector('[data-agency-search-ready]')?.dataset.agencySearchReady==='true');
await p.focus('.mobile-search-button'); await p.keyboard.press('Enter');
await p.waitForSelector('.agency-search'); await p.keyboard.press('Escape');
await p.waitForFunction(()=>!document.querySelector('.agency-search') && document.activeElement?.matches('.mobile-search-button'));
console.log('PASS mobile search opens and restores keyboard focus.');
console.log(`PASS ${reports.length} route/width observations. No forms submitted.`);
