// @vitest-environment node
import {render} from 'svelte/server';
import {expect,it} from 'vitest';
import Campaign from '../performance/PerformanceCampaignOpening.svelte';
import Hero from '../clear/ClearPlatformHero.svelte';
import Cta from '../clear/ClearCtaBand.svelte';
import Handoff from '../performance/PerformanceConversionHandoff.svelte';
import Offer from '../meridian/MeridianOfferPanel.svelte';
import {backgroundImage} from './scene.js';
const background={src:'/scene.png',mobileSrc:'/portrait.png',description:'An original workshop scene',position:'70% center',mobilePosition:'80% top'};
for(const [component,props] of [[Campaign,{eyebrow:'Workshop',title:'One next step',media:{src:'/scene.png',alt:'Existing scene'}}],[Hero,{title:'One next step',background}],[Cta,{title:'One next step',background}],[Handoff,{title:'One next step',background,handoff:{owner:'Morgan',authority:'Review only',proof:'Sample',state:'review'}}],[Offer,{eyebrow:'Workshop',title:'One next step',actionLabel:'Review',actionHref:'#review',media:{src:'/scene.png',alt:'Existing scene'}}]] as const){
 it(`${component.name} renders its scene as a CSS background with HTML copy`,()=>{const {body}=render(component as any,{props});expect(body).not.toMatch(/<(img|picture)\b/);expect(body).toContain('canon-background-scene');expect(body).toContain('/scene.png');expect(body.replace(/<[^>]*>/g,'')).toContain('One next step');expect(body).toContain('role="img"');});
}
it('keeps decorative scenes out of the accessibility tree and supports absent assets',()=>{const decorative=render(Hero,{props:{title:'Readable',background:{src:'/scene.png'}}}).body;expect(decorative).toContain('aria-hidden="true"');expect(decorative).not.toContain('role="img"');const fallback=render(Hero,{props:{title:'Readable'}}).body;expect(fallback).toContain('Readable');expect(fallback).not.toContain('canon-background-scene');});
it('quotes CSS URLs without allowing declaration injection',()=>{expect(backgroundImage('x"\n);color:red')).toBe('url("x\\"\\a );color:red")');});

it('preserves responsive preload priority and meaningful framing in server output',()=>{const output=render(Campaign,{props:{eyebrow:'Workshop',title:'Prepare locally',background,priority:true}});expect(output.head).toContain('rel="preload"');expect(output.head).toContain('/portrait.png');expect(output.body).toContain('--scene-mobile-position: 80% top');expect(output.body).toContain('An original workshop scene');const deferred=render(Campaign,{props:{eyebrow:'Workshop',title:'Prepare locally',background,priority:false}});expect(deferred.head).not.toContain('rel="preload"');});

it('Offer retains exactly one native action with and without a scene',()=>{for(const image of [background,undefined]){const body=render(Offer,{props:{eyebrow:'Workshop',title:'Review locally',actionLabel:'Review the draft',actionHref:'/review?source=sample',background:image}}).body;expect(body.match(/<a\s/g)).toHaveLength(1);expect(body).toContain('href="/review?source=sample"');expect(body).toContain('Review the draft');}});

it('preserves declared legacy media dimensions in responsive scene geometry',()=>{
 const body=render(Campaign,{props:{eyebrow:'Workshop',title:'Keep the artwork whole',media:{src:'/wide-3-2.png',width:1536,height:1024,mobileSrc:'/portrait-4-5.png',mobileWidth:800,mobileHeight:1000,alt:'An authored scene'}}}).body;
 expect(body).toContain('--scene-ratio: 1.5');
 expect(body).toContain('--scene-mobile-ratio: 0.8');
});
it('lets an explicit scene override legacy media geometry and rejects unusable dimensions',()=>{
 const props={eyebrow:'Workshop',title:'Keep the artwork whole',media:{src:'/wide.png',width:1536,height:0,alt:'An authored scene'}};
 const fallback=render(Campaign,{props}).body;
 expect(fallback).not.toContain('Infinity');
 expect(fallback).not.toContain('NaN');
 const explicit=render(Campaign,{props:{...props,background:{src:'/scene.png',aspectRatio:2,mobileAspectRatio:.75}}}).body;
 expect(explicit).toContain('--scene-ratio: 2');
 expect(explicit).toContain('--scene-mobile-ratio: 0.75');
});

it('Offer separates legacy portrait art and reserves measured geometry',()=>{
 const body=render(Offer,{props:{eyebrow:'Next step',title:'Keep artwork whole',actionLabel:'Review',actionHref:'/review',media:{src:'/portrait.png',alt:'A complete decision gate',width:1024,height:1536}}}).body;
 expect(body).toContain('meridian-offer-panel__legacy');
 expect(body).toContain('--offer-media-ratio: 0.6666666666666666');
 expect(body).not.toContain('canon-scene-lead');
 expect(body).not.toMatch(/<(img|picture)\b/);
});
it('Offer preserves explicit SceneLead precedence over legacy media',()=>{
 const body=render(Offer,{props:{eyebrow:'Next step',title:'Authored scene',actionLabel:'Review',actionHref:'/review',background,media:{src:'/portrait.png',alt:'Legacy',width:1024,height:1536}}}).body;
 expect(body).toContain('canon-scene-lead');
 expect(body).not.toContain('meridian-offer-panel__legacy');
});
