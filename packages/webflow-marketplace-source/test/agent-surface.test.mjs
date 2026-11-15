import {test} from 'node:test';
import assert from 'node:assert/strict';
import {surfaceFor,surfaceTools,REFERENCE_TOPICS} from '../src/lib/agent-surface.mjs';
const origin='https://preview.example';
const item={template_slug:'fycare-website-template',name:'Fycare',creator_name:'CaseFlow',creator_slug:'caseflow',price:79,is_free:false,has_cms:true,website_url:'https://fycare.webflow.io/',preview_url:'https://preview.webflow.com/x',purchase_url:'https://webflow.com/marketplace-checkout/x',category_groups:[{name:'Health'}],child_categories:[],styles:[],included_pages:['Home']};
const json=body=>({ok:true,json:async()=>body});
function fakeWindow(search=''){
 const events=[];
 const win={location:{pathname:'/templates/search',search,get href(){return origin+this.pathname+this.search}},history:{pushState(_s,_t,url){win.location.search=url.slice(url.indexOf('?'))}},PopStateEvent:class{constructor(type){this.type=type}},dispatchEvent:event=>events.push(event.type),events};
 return win;
}
const names=tools=>tools.map(tool=>tool.name);
test('every surface gets the reference tool; each surface adds only its own tools',()=>{
 assert.deepEqual(names(surfaceTools({kind:'page'},{origin})),['get_marketplace_reference']);
 assert.deepEqual(names(surfaceTools(surfaceFor([{kind:'detail',item,inventory:[{name:'Home',href:'https://fycare.webflow.io/'}]}]),{origin})),['get_marketplace_reference','get_template_details']);
 assert.deepEqual(names(surfaceTools(surfaceFor([{kind:'creator',profile:{slug:'caseflow',name:'CaseFlow',bio:'',avatar:'',links:[]},total:3}]),{origin})),['get_marketplace_reference','get_creator_storefront']);
 assert.deepEqual(names(surfaceTools(surfaceFor([{kind:'discovery'}]),{origin})),['get_marketplace_reference','get_search_results','set_search_brief','compare_templates']);
 assert.equal(surfaceFor([{kind:'cards',items:[]}]).kind,'page');
});
test('detail surface carries the real purchase and preview links and uses the hero island, not section copies',async()=>{
 const surface=surfaceFor([{kind:'detail',item,detailSection:'inventory',inventory:[]},{kind:'detail',item,inventory:[{name:'Home',href:'https://fycare.webflow.io/'}]}]);
 const [,details]=surfaceTools(surface,{origin});
 const result=await details.execute({});
 assert.equal(result.purchase_url,item.purchase_url);assert.equal(result.live_demo_url,item.website_url);
 assert.deepEqual(result.included_pages,[{name:'Home',url:'https://fycare.webflow.io/'}]);
 assert.equal(result.url,`${origin}/templates/html/fycare-website-template`);
 assert.equal(details.annotations.readOnlyHint,true);
});
test('reference tool rejects unknown topics without fetching',async()=>{
 let fetched=false;
 const [reference]=surfaceTools({kind:'page'},{origin,fetchImpl:async()=>{fetched=true}});
 assert.deepEqual((await reference.execute({topic:'../admin'})).valid_topics,Object.keys(REFERENCE_TOPICS));
 assert.equal(fetched,false);
});
test('set_search_brief writes the shared URL contract, keeps unrelated params and returns evidence',async()=>{
 const win=fakeWindow('?q=studio&compare=a&sort=popular');const urls=[];
 const tools=surfaceTools({kind:'search'},{origin,win,fetchImpl:async url=>{urls.push(url);return json({items:[item],pagination:{total_items:1}})}});
 const result=await tools.find(t=>t.name==='set_search_brief').execute({max_price:99,cms:'required',brief:'Clinic site'});
 const params=new URLSearchParams(win.location.search);
 assert.equal(params.get('q'),'studio');assert.equal(params.get('max_price'),'99');assert.equal(params.get('has_cms'),'true');assert.equal(params.get('brief'),'Clinic site');assert.equal(params.get('compare'),'a');assert.equal(params.get('sort'),'popular');
 assert.deepEqual(win.events,['popstate']);
 assert.ok(!urls[0].includes('brief='),'project notes stay out of the catalog request');
 assert.equal(result.status,'applied');assert.ok(result.items[0].fit.includes('Within your $99 template budget'));
});
test('set_search_brief rejects an invalid budget without navigating',async()=>{
 const win=fakeWindow('?q=studio');
 const result=await surfaceTools({kind:'search'},{origin,win,fetchImpl:async()=>json({})}).find(t=>t.name==='set_search_brief').execute({max_price:'-5'});
 assert.equal(result.error,'invalid_max_price');assert.deepEqual(win.events,[]);
});
test('compare_templates bounds the tray to 3 safe slugs and reports missing ones',async()=>{
 const win=fakeWindow('?q=studio');
 const tools=surfaceTools({kind:'search'},{origin,win,fetchImpl:async url=>json({items:url.includes('fycare')?[item]:[]})});
 const result=await tools.find(t=>t.name==='compare_templates').execute({slugs:['fycare-website-template','gone','javascript:x','b','c']});
 assert.equal(new URLSearchParams(win.location.search).get('compare'),'fycare-website-template,gone,b');
 assert.equal(result.compared[0].found,true);assert.equal(result.compared[1].found,false);
});
