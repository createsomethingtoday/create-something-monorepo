import test from 'node:test';
import assert from 'node:assert/strict';
import {activeRefinements} from '../src/lib/catalog-refinements.mjs';
test('removing a style keeps the category, query, sort and other styles',()=>{
 const url=new URL('https://example.test/templates/category/technology-websites?q=clinic&styles=minimal-websites&styles=clean-websites&sort=newest&page=3#all-templates');
 const chips=activeRefinements(url);assert.equal(chips[0].label,'Minimal');
 const next=new URL(chips[0].href,url);assert.equal(next.pathname,url.pathname);assert.equal(next.searchParams.get('q'),'clinic');assert.equal(next.searchParams.get('sort'),'newest');assert.deepEqual(next.searchParams.getAll('styles'),['clean-websites']);assert.equal(next.searchParams.has('page'),false);assert.equal(next.hash,'#all-templates');assert.equal(url.searchParams.get('page'),'3');
});
test('free refinement has a readable removable label without losing creator scope',()=>{
 const [chip]=activeRefinements(new URL('https://example.test/templates/designers/flomio-studio?free_only=true'));assert.equal(chip.label,'Free');assert.equal(chip.href,'/templates/designers/flomio-studio');
});
test('a base category and disabled free filter do not create refinement chips',()=>{
 assert.deepEqual(activeRefinements(new URL('https://example.test/templates/category/technology-websites?free_only=false')),[]);
});
