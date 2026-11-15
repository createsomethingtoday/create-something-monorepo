// Run from ego-browser with the current task's Page. No purchases or chat sends.
// Checks rendered layout rather than internal component state.
export async function verifyCatalogLayout(page, origin) {
 const paths=['/templates/featured','/templates/category/technology-websites','/templates/category/architecture-and-design-websites'];
 const receipts=[];
 const measure=()=>{const h=document.querySelector('h1');const nav=document.querySelector('.sb-nav-wrapper');const controls=document.querySelector('.rd-control');return {title:h?.textContent,size:h&&getComputedStyle(h).fontSize,y:h?.getBoundingClientRect().y,scroll:scrollY,navPosition:nav&&getComputedStyle(nav).position,mobileControl:!!controls&&getComputedStyle(controls).display!=='none',overflow:document.documentElement.scrollWidth>innerWidth}};
 try {
  for(const width of [1240,390]) {
   await page.cdp('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width===390});
   for(const path of paths) {
    await page.cdp('Emulation.setScriptExecutionDisabled',{value:true});
    await page.goto(origin+path);const before=await page.evaluate(measure);
    await page.cdp('Emulation.setScriptExecutionDisabled',{value:false});
    await page.reload();
    await page.waitForFunction(()=>Array.from(document.querySelectorAll('astro-island[client="load"],astro-island[client="only"]')).every(x=>!x.hasAttribute('ssr')),undefined,{timeout:20000});
    const after=await page.evaluate(measure);
    const receipt={width,path,before,after};receipts.push(receipt);
    if(before.size!==after.size||Math.abs(before.y-after.y)>1||before.overflow||after.overflow||after.navPosition!=='fixed'||(width===390&&!before.mobileControl))throw new Error('Catalog layout regression: '+JSON.stringify(receipt));
   }
  }
  return receipts;
 } finally {await page.cdp('Emulation.setScriptExecutionDisabled',{value:false})}
}
