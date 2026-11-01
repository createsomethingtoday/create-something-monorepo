const fs=await import('node:fs/promises');
const root='/Users/micahjohnson/Code/csm-worktrees/cre-2154-agency-public/docs/evidence/CRE-2154';
const task=await taskSpace(7), page=task.page('p1');
const routes=JSON.parse(await fs.readFile(root+'/route-coverage.json','utf8')).filter(r=>r.palette && r.path!=='/map/workspace');
const representatives=new Set(['/','/services','/technical-review','/book','/map','/control','/stack','/practice','/field-reports','/field-reports/template-review','/products/signal','/workflows/mcp-server-development','/security','/about','/dispatch','/basketball-systems-lab','/proof/marketplace-workflow','/use-cases/enterprise','/privacy','/ai-workflow-control']);
const results=[];
await page.cdp('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});
for(const width of [1440,390,320]) {
 await page.cdp('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<500});
 for(const {path} of routes) {
  await page.goto('http://127.0.0.1:5177'+path);
  await page.waitForFunction(()=>document.querySelector('.agency-surface') && document.styleSheets.length>0 && getComputedStyle(document.querySelector('h1')).fontFamily!=='Times');
  await page.evaluate(()=>document.fonts.ready);
  const result=await page.evaluate(()=>({url:location.pathname,title:document.title,width:innerWidth,scrollWidth:document.documentElement.scrollWidth,palette:document.querySelector('.agency-surface')?.dataset.canonPalette,h1:document.querySelector('h1')?.textContent?.trim(),bg:getComputedStyle(document.querySelector('.agency-surface')).backgroundColor,overflow:[...document.querySelectorAll('main *')].filter(e=>e.getBoundingClientRect().right>innerWidth+1 && getComputedStyle(e).position!=='absolute' && e.getBoundingClientRect().width>0).slice(0,5).map(e=>e.className)}));
  if(representatives.has(path)) await page.screenshot({path:root+'/'+(path==='/'?'home':path.slice(1).replaceAll('/','-'))+'-'+width+'.png'});
  results.push({path,...result});
  await fs.writeFile(root+'/browser-render.json',JSON.stringify(results,null,2)+'\n');
  console.log(width,path,result.scrollWidth>width?'OVERFLOW':'ok');
 }
}
