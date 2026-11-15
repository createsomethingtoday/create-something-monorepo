import {chromium} from '/Users/createsomething/Code/create-something-monorepo/node_modules/.pnpm/playwright@1.58.2/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
const out=process.cwd()+'/packages/space/artifacts/cre-2465';const b=await chromium.launch({args:['--disable-gpu']});const results=[];
for(const width of [320,390,768,1024,1025,1440]){const p=await b.newPage({viewport:{width,height:1000}});await p.goto('http://127.0.0.1:5178');await p.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})))});await p.screenshot({path:out+'/home-'+width+'.png',fullPage:true});results.push(await p.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,images:[...document.images].every(i=>i.naturalWidth>0),cards:document.querySelectorAll('.project-card').length})));await p.close()}
await fs.writeFile(out+'/runtime.json',JSON.stringify(results,null,2));await b.close();
