const fs=await import('node:fs/promises');const root='/Users/micahjohnson/Code/csm-worktrees/cre-2154-agency-public/docs/evidence/CRE-2154';const t=await taskSpace(7),p=t.page('p1');const out=[];
for(const width of [1440,390,320]){
 await p.cdp('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<500});
 for(const route of ['/map','/stack']){
  await p.goto('http://127.0.0.1:5177'+route);await p.waitForSelector('h1');
  if(route==='/stack')await p.click('loc=role:tab[name*="Boundary"]');
  await p.waitForSelector('.public-atlas-flow');await p.evaluate(()=>document.fonts.ready);
  await p.evaluate(()=>document.querySelector('.public-atlas-flow').scrollIntoView({block:'center',behavior:'instant'}));
  await p.screenshot({path:root+'/'+route.slice(1)+'-canvas-'+width+'.png'});
  out.push({route,width,...await p.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,labels:[...document.querySelectorAll('.svelte-flow__edge-label')].map(e=>({text:e.textContent,color:getComputedStyle(e).color})),canvas:getComputedStyle(document.querySelector('.public-atlas-flow')).backgroundColor}))});
 }
}
await fs.writeFile(root+'/final-graph-check.json',JSON.stringify(out,null,2)+'\n');console.log(out);
