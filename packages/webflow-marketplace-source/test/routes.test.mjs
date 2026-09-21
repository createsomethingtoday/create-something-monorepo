import test from 'node:test';
import assert from 'node:assert/strict';
import {routeFor,localLink,searchFilters} from '../src/lib/routes.mjs';
test('only migrated buyer destinations become local',()=>{
 assert.equal(localLink('https://webflow.com/templates/html/fycare-website-template'),'/templates/html/fycare-website-template');
 assert.equal(localLink('https://webflow.com/templates/submission-guidelines'),'https://webflow.com/templates/submission-guidelines');
 assert.equal(localLink('https://webflow.com/dashboard/marketplace-checkout/redirect?rid=abc'),'https://webflow.com/dashboard/marketplace-checkout/redirect?rid=abc');
 assert.equal(localLink('javascript:alert(1)'),'');
 assert.equal(localLink('https://webflow.com.evil.test/templates/all'),'https://webflow.com.evil.test/templates/all');
});
test('unknown and malformed deep links are actual missing pages',()=>{
 for(const p of ['/unknown','/templates/unknown','/templates/html/foo/bar','/templates/html/%2e%2e'])assert.equal(routeFor(p).kind,'missing');
 assert.equal(routeFor('/templates/html/fycare-website-template').kind,'detail');
});
test('route scope wins over conflicting query while refinements survive',()=>{
 const url=new URL('https://example.test/templates/designers/caseflow?creator_slug=wrong&styles=clean-websites&query=clinic');
 const p=searchFilters(routeFor(url.pathname),url);
 assert.equal(p.get('creator_slug'),'caseflow');assert.equal(p.get('q'),'clinic');assert.equal(p.get('styles'),'clean-websites');
 const free=new URL('https://example.test/templates/free-website-templates?scope=all');
 assert.equal(searchFilters(routeFor(free.pathname),free).get('scope'),'free');
});
