import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { webflowStudies } from '../src/lib/data/webflowMarketplace.ts';

const base=process.env.AGENCY_BASE_URL??'http://127.0.0.1:4297';
const prefix='/case-studies/webflow-marketplace';
const output=process.env.AGENCY_EVIDENCE_DIR??'/tmp/agency-webflow-seo-review';
const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{})});
const failures=[];const evidence=[];
async function metadata(page){return page.evaluate(()=>({title:document.title,canonical:document.querySelector('link[rel="canonical"]')?.getAttribute('href'),ogUrl:document.querySelector('meta[property="og:url"]')?.getAttribute('content'),ogTitle:document.querySelector('meta[property="og:title"]')?.getAttribute('content'),description:document.querySelector('meta[name="description"]')?.getAttribute('content')}));}
function check(name,actual,url,study){evidence.push({name,...actual});for(const [key,expected] of [['canonical',url],['ogUrl',url]])if(actual[key]!==expected)failures.push(`${name}: ${key} ${actual[key]} != ${expected}`);if(/CREATE SOMETHING SPACE/.test(actual.title))failures.push(`${name}: wrong property title`);if(study){if(!actual.title.includes(study.label))failures.push(`${name}: stale title ${actual.title}`);if(actual.description!==study.summary)failures.push(`${name}: stale description`);if(!actual.ogTitle?.includes(study.label))failures.push(`${name}: stale OG title`);}}
try{
 const ssr=await browser.newPage({javaScriptEnabled:false});
 for(const study of webflowStudies){const route=prefix+(study.id==='overview'?'':'/'+study.id);const response=await ssr.goto(base+route);assert.equal(response.status(),200);check('SSR '+study.id,await metadata(ssr),'https://createsomething.agency'+route,study.id==='overview'?null:study);}
 await ssr.close();
 const client=await browser.newPage();await client.goto(base+prefix+'/asset-dashboard',{waitUntil:'networkidle'});
 await client.evaluate(()=>{window.__webflowSeoNavigation='same-document';});
 await client.getByRole('link',{name:/Next:/}).click();await client.waitForURL(base+prefix+'/validator');assert.equal(await client.evaluate(()=>window.__webflowSeoNavigation),'same-document','Next must exercise client navigation');await client.waitForFunction(()=>document.querySelector('h1').textContent.includes('template requirements'));
 check('Client Next validator',await metadata(client),'https://createsomething.agency'+prefix+'/validator',webflowStudies.find(s=>s.id==='validator'));
 await client.goBack();await client.waitForURL(base+prefix+'/asset-dashboard');await client.waitForFunction(()=>document.querySelector('h1').textContent.includes('workspace'));
 check('Client Back dashboard',await metadata(client),'https://createsomething.agency'+prefix+'/asset-dashboard',webflowStudies.find(s=>s.id==='asset-dashboard'));
 await client.close();await mkdir(output,{recursive:true});await writeFile(output+'/metadata.json',JSON.stringify({passed:!failures.length,evidence,failures},null,2));
 assert.deepEqual(failures,[]);console.log('Webflow SEO passed: all9 SSR routes, clientNext and Back metadata.');
}finally{await browser.close();}
