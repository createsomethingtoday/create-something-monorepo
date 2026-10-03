import assert from 'node:assert/strict';
import {load} from 'cheerio';
const origin=process.env.PREVIEW_URL||'http://127.0.0.1:4321';
const receipts=[];
for(const [path,status,content] of [
 ['/templates',200,'Launch a high-performing site'],
 ['/templates/all',200,'All Website Templates'],
 ['/templates/category/technology-websites',200,'Technology'],
 ['/templates/designers/caseflow',200,'Templates by CaseFlow'],
 ['/templates/categories',200,'All template categories'],
 ['/templates/html/fycare-website-template',200,'Fycare'],
 ['/templates/template-licenses',200,'Single Use'],
 ['/templates/does-not-exist',404,'Page not found'],
 ['/templates/html/cre-2050-not-a-template',404,'Page not found'],
 ['/templates/designers/cre-2050-not-a-creator',404,'Page not found'],
]){
 console.error(`Checking ${path}`);
 const response=await fetch(origin+path,{signal:AbortSignal.timeout(30000)});const html=await response.text();const $=load(html);
 assert.equal(response.status,status,path);assert.ok($('body').text().includes(content),path);
 assert.equal($('source-island').length,0,path);assert.match(response.headers.get('x-robots-tag'),/noindex/);
 assert.equal($('link[rel=canonical]').attr('href'),'https://webflow.com'+path);
 if(path.includes('/html/')&&status===200){
  assert.ok($('a[href*="marketplace-checkout"]').length,'real purchase link');
  assert.ok($('a[href="https://fycare.webflow.io/"]').length,'real browser preview');
  assert.ok($('body').text().includes('Similar templates'),'related collection');
  assert.ok(!html.includes('font-family: &quot;WF Visual Sans'),'SSR styles are not escaped');
 }
 receipts.push({path,status,canonical:$('link[rel=canonical]').attr('href')});
}
const empty=await(await fetch(origin+'/templates-api/api/templates/search?q=zzzz-no-template-cre2050')).json();
assert.equal(empty.pagination.total_items,0);assert.equal(empty.items.length,0);
const robots=await(await fetch(origin+'/robots.txt')).text();assert.match(robots,/Disallow: \//);
console.log(JSON.stringify({checkedAt:new Date().toISOString(),origin,routes:receipts,strictEmptySearch:true,previewNoindex:true},null,2));
