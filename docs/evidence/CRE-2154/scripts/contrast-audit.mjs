const fs=await import('node:fs/promises');
const root='/Users/micahjohnson/Code/csm-worktrees/cre-2154-agency-public/docs/evidence/CRE-2154';
const t=await taskSpace(7),p=t.page('p1'); const output=[];
await p.cdp('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
const routes=JSON.parse(await fs.readFile(root+'/route-coverage.json','utf8')).filter(r=>r.palette&&r.path!=='/map/workspace');
for(const {path} of routes) {
 await p.goto('http://127.0.0.1:5177'+path); await p.waitForSelector('h1'); await p.evaluate(()=>document.fonts.ready);
 const failures=await p.evaluate(()=>{
  const ctx=document.createElement('canvas').getContext('2d');
  const rgb=color=>{ctx.clearRect(0,0,1,1);ctx.fillStyle=color;ctx.fillRect(0,0,1,1);return [...ctx.getImageData(0,0,1,1).data];};
  const lum=c=>c.slice(0,3).map(v=>v/255).map(v=>v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
  const out=[];
  for(const e of document.querySelectorAll('.agency-surface *')) {
   if(![...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim()) || !e.getBoundingClientRect().width || getComputedStyle(e).visibility==='hidden')continue;
   let a=e,bg,photo=false;
   while(a){const s=getComputedStyle(a);if(s.backgroundImage!=='none')photo=true;const c=rgb(s.backgroundColor);if(c[3]>0&&c[3]<=250)photo=true;if(c[3]>250){bg=c;break;}a=a.parentElement;}
   if(!bg||photo)continue;
   const fg=rgb(getComputedStyle(e).color);if(fg[3]<250)continue;
   const l1=lum(fg),l2=lum(bg),ratio=(Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05);
   if(ratio<2.5)out.push({text:e.textContent.trim().slice(0,80),class:e.className,ratio:Math.round(ratio*100)/100,fg,bg});
  }return out;
 });
 if(failures.length) output.push({path,failures});
}
await fs.writeFile(root+'/contrast-audit.json',JSON.stringify(output,null,2)+'\n');console.log(output);
