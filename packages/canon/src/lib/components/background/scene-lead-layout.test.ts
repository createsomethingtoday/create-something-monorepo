// @vitest-environment jsdom
import {flushSync,mount,unmount,createRawSnippet} from 'svelte';
import {afterEach,expect,it,vi} from 'vitest';
import Hero from '../clear/ClearPlatformHero.svelte';
import Cta from '../clear/ClearCtaBand.svelte';
import Handoff from '../performance/PerformanceConversionHandoff.svelte';
import Campaign from '../performance/PerformanceCampaignOpening.svelte';
import SceneLead from './SceneLead.svelte';
const instances:ReturnType<typeof mount>[]=[];
function render(component:any,props:any){const target=document.createElement('div');document.body.append(target);instances.push(mount(component,{target,props}));flushSync();return target;}
afterEach(async()=>{for(const i of instances)await unmount(i);instances.length=0;document.body.replaceChildren();vi.restoreAllMocks();vi.unstubAllGlobals();});
const background={src:'/wide.png',mobileSrc:'/portrait.png',aspectRatio:16/9,mobileAspectRatio:941/1672};
const action=createRawSnippet(()=>({render:()=>'<a href="#review">Review the draft</a>'}));
it('keeps hero metadata, proof and arbitrary aside outside the scene lead',()=>{const aside=createRawSnippet(()=>({render:()=>'<div data-test-aside>Full custom artifact</div>'}));const t=render(Hero,{title:'A next step',background,metaItems:[{label:'Owner',value:'Morgan'}],proofItems:[{value:'Local',label:'Not delivered'}],aside,actions:action});const lead=t.querySelector('.canon-scene-lead')!;expect(lead.querySelector('h1')?.textContent).toBe('A next step');expect(lead.querySelector('a')?.getAttribute('href')).toBe('#review');for(const selector of ['.clear-platform-hero__meta','.clear-platform-hero__proof','[data-test-aside]']){expect(t.querySelector(selector)).not.toBeNull();expect(lead.querySelector(selector)).toBeNull();}});
it('keeps all CTA outcomes below the scene without dropping state or content',()=>{const items=['controlled','ready','review','stop'].map(state=>({state,label:state,title:state,detail:'Retained detail'}));const t=render(Cta,{title:'Choose a next step',background,items});expect(t.querySelectorAll('.canon-scene-details article')).toHaveLength(4);expect(t.querySelector('.canon-scene-lead article')).toBeNull();expect([...t.querySelectorAll('article')].map(e=>e.dataset.controlState)).toEqual(['controlled','ready','review','stop']);});
it('retains authority and full-width artifacts below the handoff lead',()=>{const aside=createRawSnippet(()=>({render:()=>'<div data-custom-record>Custom record</div>'}));const t=render(Handoff,{title:'Review first',background,handoff:{owner:'Morgan',authority:'Do not send',proof:'Source A',state:'review'},aside,artifactPlacement:'full-width'});expect(t.querySelector('.canon-scene-lead dl')).toBeNull();expect(t.querySelector('.canon-scene-details dl')?.textContent).toContain('Do not send');expect(t.querySelector('.canon-scene-details [data-custom-record]')).not.toBeNull();});
it('keeps campaign proof and arbitrary semantic artifact outside artwork while retaining actions',()=>{const artifact=createRawSnippet(()=>({render:()=>'<div data-artifact>Editable artifact</div>'}));const t=render(Campaign,{eyebrow:'Workshop',title:'Prepare locally.',background,proof:[{label:'Owner',value:'Morgan'}],artifact,actions:action});expect(t.querySelector('.canon-scene-lead [data-artifact]')).toBeNull();expect(t.querySelector('.canon-scene-details [data-artifact]')?.textContent).toBe('Editable artifact');expect(t.querySelector('.canon-scene-details .performance-campaign-opening__proof')?.textContent).toContain('Morgan');expect(t.querySelector('.canon-scene-lead a')?.getAttribute('href')).toBe('#review');});
it('preserves no-background legacy layouts',()=>{const t=render(Handoff,{title:'Review first',handoff:{owner:'Morgan',authority:'Do not send',proof:'Source A',state:'review'}});expect(t.querySelector('.canon-scene-lead')).toBeNull();expect(t.querySelector('section > .performance-conversion-handoff__boundary dl')).not.toBeNull();});

it('retains complete long copy and a stable scene structure without runtime measurement',()=>{
 vi.stubGlobal('ResizeObserver',class {constructor(){throw new Error('Scene layout must not depend on post-hydration measurement');}});
 const copy='Complete copy remains readable, without truncation. '.repeat(30);
 const children=createRawSnippet(()=>({render:()=>`<p>${copy}</p>`}));
 const t=render(SceneLead,{scene:background,children});
 expect(t.querySelector('.canon-scene-lead__content')?.textContent).toBe(copy);
 expect(t.querySelectorAll('.canon-scene-lead__art')).toHaveLength(1);
 expect(t.querySelector('.canon-scene-lead__reserved')?.getAttribute('aria-hidden')).toBe('true');
});
