const fs=await import('node:fs/promises');
const root='/Users/micahjohnson/Code/csm-worktrees/cre-2154-agency-public/docs/evidence/CRE-2154';
const t=await taskSpace(7),p=t.page('p1');const out=[];
await p.cdp('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
await p.cdp('Emulation.setDeviceMetricsOverride',{width:390,height:900,deviceScaleFactor:1,mobile:true});
for(const route of ['/','/services','/technical-review','/book','/map','/control','/stack','/practice','/field-reports','/field-reports/template-review','/products/signal','/workflows/mcp-server-development','/security','/about','/dispatch','/basketball-systems-lab','/proof/marketplace-workflow','/use-cases/enterprise','/privacy','/ai-workflow-control']){
 await p.goto('http://127.0.0.1:5177'+route);await p.waitForSelector('h1');await p.evaluate(()=>document.fonts.ready);
 out.push({route,...await p.evaluate(()=>({reduced:matchMedia('(prefers-reduced-motion: reduce)').matches,overflow:document.documentElement.scrollWidth>innerWidth,runningAnimations:document.getAnimations().filter(a=>a.playState==='running').map(a=>({name:a.animationName,target:a.effect?.target?.className,duration:a.effect?.getComputedTiming().duration}))}))});
}
await fs.writeFile(root+'/reduced-motion.json',JSON.stringify(out,null,2)+'\n');console.log(out);
