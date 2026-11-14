<script lang="ts">
  import { tick } from 'svelte';
  import { usesAgentReadinessStudyCopy } from '$lib/data/agentReadinessStudyVariants';
  import { mountPreviewTrace } from '$lib/motion/previewWorkflowTrace';
  import { page } from '$app/stores';
  import { agencyPageComposition } from '$lib/data/agencyPageComposition';
  import { getAgencyHeroTreatment } from '$lib/data/agencyHeroTreatment';
  type CopyEdit = { selector: string; text: string };
  type PreviewCopy = { title?: string; lede?: string; titleSelector?: string; ledeSelector?: string; copyEdits?: readonly CopyEdit[] };
  const utilityPaths = ['/book','/contact','/support-brief','/privacy','/terms','/security','/bearer-token-policy','/prospects'];
  const current = $derived(getAgencyHeroTreatment($page.url.pathname));
  const family = $derived(current?.family ?? (utilityPaths.includes($page.url.pathname) ? 'utility' : 'editorial'));
  $effect(() => {
    const route = $page.url.pathname; const item = current; const f = family;
    const study = $page.url.searchParams.get('study');
    const useBaselineCopy = !usesAgentReadinessStudyCopy(route, study);
    let compositionTarget:HTMLElement|undefined; let priorComposition:string|undefined;
    let alive=true; let closing:HTMLElement|undefined; let stopTrace:(()=>void)|undefined;
    const originals: Array<{element:HTMLElement; clone:Element; hidden:boolean; id:string}> = [];
    const resolve = (selector:string) => document.querySelector(selector) ?? document.querySelector(selector.replace(/>/g,' '));
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
        const targets=edits.map(edit=>({element:resolve(edit.selector),text:edit.text,selector:edit.selector}));
        for(const edit of targets)replaceCopy(edit.element,edit.text,edit.selector);
      }
      const candidates=Array.from(document.querySelectorAll<HTMLElement>('.performance-conversion-handoff,.route-handoff,.closing,.handoff,.next-step,.closing-section,.email-section,.letter-signoff,.membership .next-steps,.scopefield-page .download,.booking-content,.map-preview' )).filter(e=>(!e.closest('footer')||e.classList.contains('letter-signoff'))&&e.querySelector('a,button'));
      const finalCTA=candidates.at(-1);
      if(finalCTA && !['/book','/contact'].includes(route)){closing=document.createElement('section');closing.className='agency-closing-trace';closing.setAttribute('aria-label','Illustrative workflow trace');closing.innerHTML='<pre aria-hidden="true">. : + / = #     . : + / = #     . : + / = #</pre><canvas aria-hidden="true"></canvas><button type="button" hidden>Pause motion</button>';finalCTA.insertAdjacentElement('beforebegin',closing);stopTrace=mountPreviewTrace(closing);}
      if(!item)return;
      const target=resolve(item.heroSelector) as HTMLElement | null;if(!target)return;
      if(target.closest('[data-measured-opening]'))return;
      compositionTarget=target;priorComposition=target.dataset.agencyComposition;
      target.dataset.agencyComposition=agencyPageComposition(route,f,(item as typeof item & {shot?:string}).shot);
      if(target.classList.contains('registry-arc__hero')){const title=target.querySelector('h1');if(title?.textContent&&/\/|->/.test(title.textContent)){replaceCopy(title,title.textContent,'registry compound title');const clone=originals.at(-1)?.clone;if(clone){const parts=(clone.textContent??'').split(/(->|\/)/);clone.replaceChildren();for(const part of parts){if(part==='->'){const arrow=document.createElement('span');arrow.style.whiteSpace='nowrap';arrow.textContent=part;clone.appendChild(arrow);}else{clone.appendChild(document.createTextNode(part));if(part==='/')clone.appendChild(document.createElement('wbr'));}}}}}
    });
    return()=>{alive=false;if(compositionTarget){if(priorComposition)compositionTarget.dataset.agencyComposition=priorComposition;else delete compositionTarget.dataset.agencyComposition;}stopTrace?.();closing?.remove();for(const {element,clone,hidden,id}of originals){clone.remove();if(id&&!element.id)element.id=id;element.hidden=hidden;delete element.dataset.agencyOriginal;}document.body.classList.remove('design-preview');delete document.body.dataset.previewFamily;delete document.body.dataset.previewRoute;};
  });
</script>
<svelte:head>
  <link rel="stylesheet" href="/styles/agency/page-treatment.css?v=hero-warmth-20261105" />
  <link rel="stylesheet" href="/styles/agency/commercial.css" />
  <link rel="stylesheet" href="/styles/agency/products.css" />
  <link rel="stylesheet" href="/styles/agency/editorial.css" />
  <link rel="stylesheet" href="/styles/agency/image-treatment.css?v=graphite-frames-20261105" />
</svelte:head>

