const fs=await import('node:fs/promises');const root='/Users/micahjohnson/Code/csm-worktrees/cre-2154-agency-public/docs/evidence/CRE-2154';const t=await taskSpace(7),p=t.page('p1');const results=[];
for(const width of [1440,390,320]){
 await p.cdp('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<500});
 await p.goto('http://127.0.0.1:5177/stack');await p.click('loc=role:tab[name*="Boundary"]');
 for(let i=0;i<6;i++){
  await p.focus('.atlas-story__ledger-row button >> nth='+i);await p.keyboard.press('Enter');
  const result=await p.evaluate(()=>({selected:document.querySelector('.atlas-story__ledger-row.selected')?.textContent.trim(),focusedNodes:document.querySelectorAll('.public-atlas-flow-node.focused').length,overflow:document.documentElement.scrollWidth>innerWidth}));
  if(!result.selected?.startsWith(String(i+1)))throw Error('Ledger selection failed');
  results.push({width,chapter:i+1,...result});
 }
}
await fs.writeFile(root+'/stack-interactions.json',JSON.stringify(results,null,2)+'\n');console.log(results);
