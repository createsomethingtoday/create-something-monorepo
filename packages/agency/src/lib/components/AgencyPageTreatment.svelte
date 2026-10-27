<script lang="ts">
  import { tick } from 'svelte';
  import { usesAgentReadinessStudyCopy } from '$lib/data/agentReadinessStudyVariants';
  import { mountPreviewTrace } from '$lib/motion/previewWorkflowTrace';
  import { page } from '$app/stores';
  import { originalHeroImages } from '$lib/data/agencyPreviewOriginalImages';
  import { commercialPageTreatments } from '$lib/data/agencyPreviewCommercial';
  import { productPageTreatments } from '$lib/data/agencyPreviewProducts';
  import { editorialPageTreatments } from '$lib/data/agencyPreviewEditorial';
  type CopyEdit = { selector: string; text: string };
  type PreviewCopy = { title?: string; lede?: string; titleSelector?: string; ledeSelector?: string; copyEdits?: readonly CopyEdit[] };
  const utilityHeroes = [
    {route:'/contact',family:'utility',image:'team',caption:'Concept illustration · bring one task to the conversation.',heroSelector:'.inquiry-intro',shot:'medium',focus:'55% 60%'},
    {route:'/book',family:'utility',image:'team',caption:'Concept illustration · plan the next step together.',heroSelector:'.booking-entry,.agent-booking__intro',shot:'medium',focus:'65% 55%'},
    {route:'/support-brief',family:'utility',image:'macro',caption:'Concept illustration · make the problem inspectable.',heroSelector:'.brief-workspace > header',shot:'macro',focus:'55% 65%'},
    {route:'/security',family:'utility',image:'macro',caption:'Concept illustration · check access before acting.',heroSelector:'.clear-page-section--hero',shot:'macro',focus:'40% 55%'},
    {route:'/prospects',family:'utility',image:'team',caption:'Concept illustration · connect only the approved tools.',heroSelector:'.portal-card',shot:'medium',focus:'60% 55%'}
  ];
  const records = [...commercialPageTreatments, ...productPageTreatments, ...editorialPageTreatments,...utilityHeroes];
  const utilityPaths = ['/book','/contact','/support-brief','/privacy','/terms','/security','/bearer-token-policy','/prospects'];
  const current = $derived.by(() => {
    const item=records.find(r => r.route === $page.url.pathname) ?? records.find(r => r.route.includes('[') && new RegExp('^'+r.route.replace(/\[[^\]]+\]/g,'[^/]+')+'$').test($page.url.pathname));
    const original=originalHeroImages[$page.url.pathname];
    return item && original ? {...item,...original} : item;
  });
  const family = $derived(current?.family ?? (utilityPaths.includes($page.url.pathname) ? 'utility' : 'editorial'));
  $effect(() => {
    const route = $page.url.pathname; const item = current; const f = family;
    const study = $page.url.searchParams.get('study');
    const useBaselineCopy = !usesAgentReadinessStudyCopy(route, study);
    let alive=true; let figure:HTMLElement|undefined; let closing:HTMLElement|undefined; let stopTrace:(()=>void)|undefined;
    const originals: Array<{element:HTMLElement; clone:Element; hidden:boolean; id:string}> = [];
    const replaceCopy = (element:Element|null, text:string|undefined, selector:string) => {
      if (!text || !(element instanceof HTMLElement) || element.querySelector('a,button,input,select,textarea')) return;
      // Preserve Svelte-owned nodes: its reactive titles and study variants continue updating.
      const clone=element.cloneNode(false) as HTMLElement;clone.removeAttribute('hidden');clone.removeAttribute('data-agency-original');clone.dataset.previewCopy='true';clone.dataset.previewTarget=selector;clone.textContent=text;
      originals.push({element,clone,hidden:element.hidden,id:element.id});element.removeAttribute('id');element.hidden=true;element.dataset.agencyOriginal='true';element.insertAdjacentElement('afterend',clone);
    };
    document.body.classList.add('design-preview');document.body.dataset.previewFamily=f;document.body.dataset.previewRoute=route;
    void tick().then(async()=>{
      await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));
      if(!alive)return;
      if(item && useBaselineCopy){const copy=item as typeof item & PreviewCopy;
        const edits=[{selector:copy.titleSelector ?? item.heroSelector+' h1',text:copy.title},{selector:copy.ledeSelector ?? item.heroSelector+' p',text:copy.lede},...(copy.copyEdits??[])];
        const targets=edits.map(edit=>({element:document.querySelector(edit.selector),text:edit.text,selector:edit.selector}));
        for(const edit of targets)replaceCopy(edit.element,edit.text,edit.selector);
      }
      const candidates=Array.from(document.querySelectorAll<HTMLElement>('.performance-conversion-handoff,.route-handoff,.closing,.handoff,.next-step,.closing-section,.email-section,.letter-signoff,.membership .next-steps,.scopefield-page .download,.booking-content,.map-preview' )).filter(e=>(!e.closest('footer')||e.classList.contains('letter-signoff'))&&e.querySelector('a,button'));
      const finalCTA=candidates.at(-1);
      if(finalCTA && route !== '/book'){closing=document.createElement('section');closing.className='agency-closing-trace';closing.setAttribute('aria-label','Illustrative workflow trace');closing.innerHTML='<pre aria-hidden="true">. : + / = #     . : + / = #     . : + / = #</pre><canvas aria-hidden="true"></canvas><button type="button" hidden>Pause motion</button>';finalCTA.insertAdjacentElement('beforebegin',closing);stopTrace=mountPreviewTrace(closing);}
      if(!item?.image)return;
      const target=document.querySelector(item.heroSelector);if(!target)return;
      // Keep literal arrows together and prefer compound-name breaks at slashes.
      if(target.classList.contains('registry-arc__hero')){const title=target.querySelector('h1');if(title?.textContent&&/\/|->/.test(title.textContent)){replaceCopy(title,title.textContent,'registry compound title');const clone=originals.at(-1)?.clone;if(clone){const parts=(clone.textContent??'').split(/(->|\/)/);clone.replaceChildren();for(const part of parts){if(part==='->'){const arrow=document.createElement('span');arrow.style.whiteSpace='nowrap';arrow.textContent=part;clone.appendChild(arrow);}else{clone.appendChild(document.createTextNode(part));if(part==='/')clone.appendChild(document.createElement('wbr'));}}}}}
      figure=document.createElement('figure');figure.className='agency-preview-media';const framing=item as typeof item & {shot?:string;focus?:string;preserveFrame?:boolean;width?:number;height?:number};figure.dataset.shot=framing.shot??item.image;figure.dataset.asset=item.image;if(framing.preserveFrame)figure.dataset.frame='whole';if(framing.focus)figure.style.setProperty('--preview-image-focus',framing.focus);
      const image=document.createElement('img');image.src=item.image.startsWith('original-stories/')?'/images/agency-stories/'+item.image.slice('original-stories/'.length)+'.webp':'/images/agency-sales/'+item.image+'.webp';image.alt=item.caption;image.width=framing.width??1536;image.height=framing.height??1024;image.loading='eager';image.fetchPriority='high';
      const caption=document.createElement('figcaption');caption.textContent=item.caption;
      figure.appendChild(image);figure.appendChild(caption);target.appendChild(figure);target.classList.add('agency-preview-hero');
    });
    return()=>{alive=false;figure?.parentElement?.classList.remove('agency-preview-hero');figure?.remove();stopTrace?.();closing?.remove();for(const {element,clone,hidden,id}of originals){clone.remove();if(id&&!element.id)element.id=id;element.hidden=hidden;delete element.dataset.agencyOriginal;}document.body.classList.remove('design-preview');delete document.body.dataset.previewFamily;delete document.body.dataset.previewRoute;};
  });
</script>
<svelte:head>
  <link rel="stylesheet" href="/styles/agency/page-treatment.css" />
  <link rel="stylesheet" href="/styles/agency/commercial.css" />
  <link rel="stylesheet" href="/styles/agency/products.css" />
  <link rel="stylesheet" href="/styles/agency/editorial.css" />
</svelte:head>

