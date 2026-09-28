const fs=await import('node:fs/promises');
const root='/Users/micahjohnson/Code/csm-worktrees/cre-2154-agency-public/docs/evidence/CRE-2154';
const task=await taskSpace(7),p=task.page('p1');
const results=[];
await p.cdp('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
for(const width of [1440,390,320]) {
 await p.cdp('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<500});
 for(const route of ['/practice','/stack']) {
  await p.goto('http://127.0.0.1:5177'+route);
  await p.click(route==='/practice'?'loc=role:tab[name*="Rehearse"]':'loc=role:tab[name*="Boundary"]');
  await p.waitForSelector(route==='/practice'?'.practice-workbench':'.atlas-story');
  await p.evaluate(()=>document.fonts.ready);
  await p.screenshot({path:root+'/'+route.slice(1)+'-full-'+width+'.png',fullPage:true});
  const target=route==='/practice'?'[data-testid="practice-stage-enter"]':'.atlas-story__chapter button';
  const selector=await p.evaluate((s)=>document.querySelector(s)?s:'.atlas-story__ledger-row button',target);
  await p.focus(selector+' >> nth=0'); await p.keyboard.press('Tab');
  const focus=await p.evaluate(()=>({tag:document.activeElement.tagName,text:document.activeElement.textContent?.trim().slice(0,70),outline:getComputedStyle(document.activeElement).outline,visible:document.activeElement.matches(':focus-visible')}));
  await p.evaluate(()=>document.activeElement.scrollIntoView({block:'center',behavior:'instant'}));
  await p.screenshot({path:root+'/'+route.slice(1)+'-focus-'+width+'.png'});
  results.push({route,width,focus,overflow:await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth)});
 }
}
await fs.writeFile(root+'/detail-checks.json',JSON.stringify(results,null,2)+'\n');
console.log(results);
