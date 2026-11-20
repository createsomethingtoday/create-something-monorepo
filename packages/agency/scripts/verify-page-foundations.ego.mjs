// Supply PAGE_FOUNDATIONS {taskSpaceId,pageId,baseURL,output,cases:[{path,width}]}.
// Reuse the parent's space. Never create/finish spaces or submit a form.
const assert=(await import('node:assert/strict')).default;
const fs=await import('node:fs/promises');
const config=globalThis.PAGE_FOUNDATIONS;
assert.ok(config?.taskSpaceId && config?.cases?.length);
const p=(await taskSpace(config.taskSpaceId)).page(config.pageId??'p1');
await fs.mkdir(config.output,{recursive:true});
const reports=[];
for(const {path,width} of config.cases){
  await p.cdp('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:false});
  await p.goto(new URL(path,config.baseURL).href);
  await p.waitForSelector('[data-page-wayfinding] [data-dial-ready="true"]');
  await p.waitForFunction(path=>document.body.dataset.previewRoute===path,path);
  await p.evaluate(()=>document.fonts.ready.then(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))));
  await p.waitForFunction(()=>[...document.querySelectorAll('[data-page-hero-plate] img')].every(i=>i.complete&&i.naturalWidth));
  const report=await p.evaluate(()=>{
    const visible=e=>!!e?.getClientRects().length&&getComputedStyle(e).visibility!=='hidden';
    const h=[...document.querySelectorAll('main h1')].filter(visible);
    const targets=[...document.querySelectorAll('[data-page-wayfinding] .chapter-dial a')].map(a=>{
      const target=document.getElementById(a.hash.slice(1));return{id:a.hash.slice(1),present:!!target,visible:visible(target),tap:a.getBoundingClientRect().height,width:a.getBoundingClientRect().width};
    });
    const privacy=document.querySelector('.privacy-choice:not(.privacy-choice--expanded) button')?.getBoundingClientRect();
    const motion=document.querySelector('[data-page-wayfinding] .instrument-register button')?.getBoundingClientRect();
    const utilityOverlap=privacy&&motion ? Math.max(0,Math.min(privacy.right,motion.right)-Math.max(privacy.left,motion.left))*Math.max(0,Math.min(privacy.bottom,motion.bottom)-Math.max(privacy.top,motion.top)) : 0;
    const utilityActionOverlap=privacy ? Math.max(0,...[...document.querySelectorAll('.scheduler-shell__heading>a,.booking-entry__action a,button[aria-label="Open search"],button[aria-label="Open menu"]')].map(e=>{const r=e.getBoundingClientRect();return Math.max(0,Math.min(privacy.right,r.right)-Math.max(privacy.left,r.left))*Math.max(0,Math.min(privacy.bottom,r.bottom)-Math.max(privacy.top,r.top));})) : 0;
    return{path:location.pathname,width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth,targets,utilityOverlap,utilityActionOverlap,heroFrames:document.querySelectorAll('[data-measured-opening]').length,plates:document.querySelectorAll('[data-page-hero-plate]').length,legacyImages:document.querySelectorAll('.agency-preview-media').length,headings:h.map(e=>({text:e.textContent.trim(),left:e.getBoundingClientRect().left,right:e.getBoundingClientRect().right})),forms:document.querySelectorAll('form').length};
  });
  reports.push(report);
  await fs.writeFile(`${config.output}/browser-report.json`,JSON.stringify(reports,null,2));
  assert.equal(report.overflow,false,`${path} overflow at ${width}`);
  assert.equal(report.utilityOverlap,0,`${path} privacy does not cover the motion control`);
  assert.equal(report.utilityActionOverlap,0,`${path} privacy does not cover page or header actions`);
  assert.ok(report.targets.length>=2&&report.targets.every(t=>t.present&&t.visible&&t.tap>=44&&t.width>=44),`${path} real visible destinations and44px links at${width}: ${JSON.stringify(report.targets)}`);
  assert.equal(report.headings.length,1,`${path} one visible hero title`);
  assert.ok(report.headings.every(h=>h.left>=0&&h.right<=width),`${path} title fits`);
  assert.equal(report.heroFrames,path==='/basketball-systems-lab'?0:1,`${path} one authored hero frame`);
  assert.ok(report.plates<=1 && (report.heroFrames===0 || report.legacyImages===0),`${path} no duplicate injected illustration`);
  await p.hover('[data-page-wayfinding] .instrument-register',{label:'Review page guidance'});
  await p.screenshot({path:`${config.output}/${path.slice(1).replaceAll('/','-')}-${width}.png`});
  console.log(`PASS ${path} ${width}`);
}
console.log(`PASS ${reports.length} actual page/width observations.`);
