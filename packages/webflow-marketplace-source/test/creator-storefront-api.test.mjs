import test from 'node:test';
import assert from 'node:assert/strict';
import {publishedCustomization,readPublishedStorefront} from '../src/lib/creator-storefront-api.mjs';
import {buildStorefront} from '../src/lib/creator-storefront.mjs';
const dto={schema:1,creatorSlug:'studio',version:2,positioning:'Independent design studio',cover:{url:'https://dashboard.example/cover.webp',alt:'Our recent work'},links:[{href:'https://portfolio.example'}],support:{text:'Template help',href:'mailto:help@example.com'},selections:[{templateSlug:'one',note:'Our first pick'}],email:'private@example.com',bio:'Must not override identity'};
test('published DTO maps only public customization and preserves CMS identity',()=>{
 const custom=publishedCustomization(dto,'studio');assert.equal(custom.headline,dto.positioning);assert.equal(custom.coverAlt,'Our recent work');assert.equal(custom.contactUrl,'mailto:help@example.com');assert.equal(custom.bio,undefined);assert.equal(custom.email,undefined);
 const model=buildStorefront({slug:'studio',name:'CMS Studio',bio:'CMS biography',links:[]},[{template_slug:'one',creator_slug:'studio'}],1,custom);
 assert.equal(model.name,'CMS Studio');assert.equal(model.bio,'CMS biography');assert.equal(model.support.href,'mailto:help@example.com');assert.equal(model.selected[0].note,'Our first pick');
});
test('mismatched creators, future schemas and invalid revisions fall back',()=>{
 for(const overrides of [{creatorSlug:'other'},{schema:2},{version:0},{selections:null}])assert.equal(publishedCustomization({...dto,...overrides},'studio'),null);
});
test('untrusted URLs, duplicate picks and unexpected fields cannot become active content',()=>{
 const custom=publishedCustomization({...dto,cover:{url:'javascript:alert(1)'},links:[{href:'https://u:p@example.com'}],support:{text:'Help',href:'mailto:%0aevil@example.com'},selections:[{templateSlug:'one'},{templateSlug:'one'},{templateSlug:'../bad'}]},'studio');
 assert.equal(custom.coverUrl,'');assert.equal(custom.portfolioUrl,'');assert.equal(custom.contactUrl,'');assert.equal(custom.picks.length,1);
});
test('read is uncached, bounded and does not follow redirects or send credentials',async()=>{
 let request;const result=await readPublishedStorefront('studio',{origin:'https://storefront.example',fetchImpl:async(url,options)=>{request={url:String(url),options};return Response.json(dto);}});
 assert.equal(result.headline,dto.positioning);assert.equal(request.url,'https://storefront.example/v1/storefronts/studio');assert.equal(request.options.cache,'no-store');assert.equal(request.options.redirect,'manual');assert.equal(request.options.headers.Authorization,undefined);assert.ok(request.options.signal);
});
test('missing configuration, HTTP failures, malformed JSON and timeouts preserve plain profiles',async()=>{
 assert.equal(await readPublishedStorefront('studio'),null);
 assert.equal(await readPublishedStorefront('studio',{origin:'http://unsafe.example',fetchImpl:()=>{throw Error('must not call');}}),null);
 for(const fetchImpl of [async()=>new Response('',{status:404}),async()=>new Response('',{status:503}),async()=>new Response('bad'),async()=>{throw new DOMException('timeout','TimeoutError');}])assert.equal(await readPublishedStorefront('studio',{origin:'https://storefront.example',fetchImpl}),null);
});
