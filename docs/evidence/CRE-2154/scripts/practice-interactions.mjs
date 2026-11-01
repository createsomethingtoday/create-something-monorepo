const fs=await import('node:fs/promises');
const root='/Users/micahjohnson/Code/csm-worktrees/cre-2154-agency-public/docs/evidence/CRE-2154';
const t=await taskSpace(7),p=t.page('p1');
await p.cdp('Emulation.setDeviceMetricsOverride',{width:390,height:900,deviceScaleFactor:1,mobile:true});
await p.goto('http://127.0.0.1:5177/practice'); await p.click('loc=role:tab[name*="Rehearse"]');
await p.click('text="Start over"');
await p.click('[data-testid="reset-practice-session"]');
await p.click('[data-testid="generate-practice-receipt"]');
await p.waitForSelector('[data-testid="practice-receipt-validation"]');
const validation=await p.evaluate(()=>document.querySelector('[data-testid="practice-receipt-validation"]').textContent.trim());
const stages=await p.evaluate(()=>[...document.querySelectorAll('.practice-workbench__stages button')].map(e=>e.dataset.testid));
const results=[];
for(const stage of stages){
 if(stage!==stages[0]) await p.click('[data-testid="practice-next-stage"]');
 const fields=await p.evaluate(()=>[...document.querySelectorAll('.practice-artifact-form input,.practice-artifact-form textarea')].map(e=>({id:e.id,type:e.type})));
 for(const f of fields) await p.fill('#'+f.id,f.type==='date'?'2026-10-01':'Local QA example: '+f.id.replace('practice-','')+'. Synthetic evidence; no live authority.');
 results.push({stage,fields:fields.length,ready:await p.evaluate(()=>document.querySelector('.practice-artifact-form__status').textContent.trim()),overflow:await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth)});
}
await p.click('[data-testid="generate-practice-receipt"]'); await p.waitForSelector('[data-testid="practice-receipt"]');
await p.screenshot({path:root+'/practice-receipt-390.png'});
const scenarios=[];
for(const name of ['complete-proof','owner-approval','missing-receipt','stale-policy','false-confidence','boundary-breach']){
 await p.click('[data-testid="authority-'+name+'"]');
 scenarios.push({name,decision:await p.evaluate(()=>document.querySelector('.authority-envelope dd[data-decision]').textContent)});
}
await p.reload();await p.click('loc=role:tab[name*="Rehearse"]');
const persisted=await p.evaluate(()=>document.querySelector('#practice-workflowName')?.value);
await fs.writeFile(root+'/practice-interactions.json',JSON.stringify({validation,stages:results,scenarios,persisted},null,2)+'\n');
console.log({validation,stages:results,scenarios,persisted});
