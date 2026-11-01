const fs=await import('node:fs/promises');
const t=await taskSpace(10),p=t.page('p1');
const dir='/private/tmp/client-recordings/maverick';await fs.mkdir(dir,{recursive:true});
await p.goto('https://www.maverickx.com');await p.cdp('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});await p.events();
let running=true;const frames=[];const start=Date.now();
await p.cdp('Page.startScreencast',{format:'jpeg',quality:88,maxWidth:1440,maxHeight:900,everyNthFrame:1});
const pump=(async()=>{while(running){for(const e of await p.events()){if(e.method==='Page.screencastFrame'){const file=`${dir}/${String(frames.length).padStart(5,'0')}.jpg`;await fs.writeFile(file,Buffer.from(e.params.data,'base64'));frames.push({file,time:e.params.metadata.timestamp});await p.cdp('Page.screencastFrameAck',{sessionId:e.params.sessionId});}}await new Promise(r=>setTimeout(r,20));}})();
const hold=ms=>new Promise(r=>setTimeout(r,ms));
try{await hold(3000);await p.mouse.move(720,600);await p.mouse.wheel(0,620);await hold(3500);await p.click('a.showcase-link[href="/oil-gas"]');await hold(4000);await p.mouse.move(720,600);await p.mouse.wheel(0,560);await hold(3500);await p.click('loc=role:tab[name="Iron"]');await hold(3500);await p.mouse.wheel(0,-1200);await hold(1800);await p.click('loc=role:button[name="Contact"]');await hold(3500);console.log(await p.snapshot());}finally{await p.cdp('Page.stopScreencast');running=false;await pump;await fs.writeFile(`${dir}/frames.json`,JSON.stringify(frames));console.log({frames:frames.length,seconds:(Date.now()-start)/1000});}
