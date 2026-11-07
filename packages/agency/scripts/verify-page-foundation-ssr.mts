import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { marketingPagePortfolio } from '../src/lib/data/marketingPages.ts';
import { getAgencyPageFoundation } from '../src/lib/data/agencyPageFoundations.ts';

const base = process.env.AGENCY_PATTERN_BASE ?? 'http://127.0.0.1:4193';
const output = process.env.AGENCY_PATTERN_OUTPUT ?? '/tmp/agency-page-foundations-ssr.json';
const routes = [...new Set([
  ...marketingPagePortfolio.filter(p=>p.decision!=='archive').map(p=>p.path),
  '/privacy','/terms','/support-brief','/ai-workflow-control','/ai-workflow-recovery',
  '/marketplace-review-automation','/arcs','/experiments','/arc/runbook-claude-desktop-mcp-quick-access'
])].filter(path=>getAgencyPageFoundation(path));
const reports: Array<Record<string, unknown>> = [];
for(let i=0;i<routes.length;i+=4){
  await Promise.all(routes.slice(i,i+4).map(async path=>{
    const response=await fetch(new URL(path,base),{redirect:'manual'});
    const html=await response.text();
    const config=getAgencyPageFoundation(path)!;
    const missing=config.chapters.filter(c=>!html.includes(`id="${c.id}"`)).map(c=>c.id);
    const report={path,status:response.status,chapters:config.chapters.length,missing,dial:html.includes('data-page-wayfinding'),hero:html.includes('data-measured-opening'),plate:html.includes('data-page-hero-plate')};
    reports.push(report);
  }));
}
await writeFile(output,JSON.stringify(reports,null,2));
const failures=reports.filter(r=>r.status!==200 || (r.missing as string[]).length || !r.dial || (!r.hero && r.path!=='/basketball-systems-lab'));
assert.equal(failures.length,0,JSON.stringify(failures,null,2));
console.log(`PASS ${reports.length} public SSR pages: authored opening, native wayfinding and actual target IDs.`);
