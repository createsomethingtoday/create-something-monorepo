import test from 'node:test';
import assert from 'node:assert/strict';
import {buildStorefront,safeProfileUrl,profileLinkLabel} from '../src/lib/creator-storefront.mjs';
const profile={slug:'studio',name:'Studio',bio:'Published bio',avatar:'https://cdn.example/avatar.png',links:['https://dribbble.com/studio']};
const templates=[{template_slug:'one',creator_slug:'studio',name:'One',price:49},{template_slug:'two',creator_slug:'studio',name:'Two',price:0,is_free:true},{template_slug:'other',creator_slug:'someone-else',name:'Other'}];
test('existing creator data has an honest popular fallback without invented services',()=>{
 const result=buildStorefront(profile,templates,27);
 assert.equal(result.name,'Studio');assert.equal(result.bio,'Published bio');assert.equal(result.total,27);assert.equal(result.selectionTitle,'Popular templates');assert.deepEqual(result.selected.map(x=>x.template.template_slug),['one','two']);assert.equal(result.support,null);assert.equal(result.links[0].label,'View Dribbble portfolio');
});
test('pins preserve creator order, reject other creators and duplicates, and bind notes to real work',()=>{
 const result=buildStorefront(profile,templates,27,{picks:[{slug:'two',note:'A starting point'},{slug:'other',note:'Not mine'},{slug:'two'},{slug:'one'}]});
 assert.equal(result.selectionTitle,'Selected work');assert.deepEqual(result.selected.map(x=>x.template.template_slug),['two','one']);assert.equal(result.selected[0].note,'A starting point');
});
test('optional fields reject executable URLs and blank support sections',()=>{
 const result=buildStorefront(profile,templates,27,{coverUrl:'javascript:alert(1)',contactUrl:'data:text/html,bad',support:'',websiteUrl:'https://example.com'});
 assert.equal(result.coverUrl,'');assert.equal(result.support,null);assert.ok(result.links.some(x=>x.href==='https://example.com/'));
 for(const url of ['javascript:alert(1)','data:image/svg+xml,bad','//evil.test','https://user:pass@example.com'])assert.equal(safeProfileUrl(url),'');
});
test('support is visible only with creator text and a valid contact destination',()=>{
 const result=buildStorefront(profile,templates,27,{support:'Customization by request.',contactUrl:'https://example.com/contact'});
 assert.deepEqual(result.support,{text:'Customization by request.',href:'https://example.com/contact'});
});
test('long copy is bounded and source objects are not mutated',()=>{
 const result=buildStorefront(profile,templates,27,{headline:'x'.repeat(200),bio:'y'.repeat(1000)});
 assert.equal(result.headline.length,120);assert.equal(result.bio.length,500);assert.equal(profile.bio,'Published bio');assert.equal(profileLinkLabel('https://example.com'),'Visit website');
});
