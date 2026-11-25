<script lang="ts">
  import '$lib/styles/canon.css';
  import Button from '$lib/components/Button.svelte';
  import PerformanceCampaignOpening from '$lib/components/performance/PerformanceCampaignOpening.svelte';
  import PerformanceConversionHandoff from '$lib/components/performance/PerformanceConversionHandoff.svelte';
  import PerformanceFieldSequence from '$lib/components/performance/PerformanceFieldSequence.svelte';
  import PerformanceNarrativeStage, { type PerformanceNarrativeScene } from '$lib/components/performance/PerformanceNarrativeStage.svelte';
  import PropertyFunnel from '$lib/components/PropertyFunnel.svelte';
  import MeridianOfferPanel from '$lib/components/meridian/MeridianOfferPanel.svelte';
  import MeridianFeatureSplit from '$lib/components/meridian/MeridianFeatureSplit.svelte';
  import MeridianEvidenceCarousel from '$lib/components/meridian/MeridianEvidenceCarousel.svelte';
  import ClearPlatformHero from '$lib/components/clear/ClearPlatformHero.svelte';
  import ClearCtaBand from '$lib/components/clear/ClearCtaBand.svelte';
  import ClearSecurityPanel from '$lib/components/clear/ClearSecurityPanel.svelte';

  let dark = $state(true);
  // Mobile portrait recompositions are provisional studies, not final production artwork.
  const welcome={src:'/canon-next/approved-v1/welcome-bench.webp',mobileSrc:'/canon-next/portrait/welcome-bench-portrait.png',position:'center',mobilePosition:'center',aspectRatio:16/9,mobileAspectRatio:941/1672,description:'Canon at the original workshop bench, with the full paper staircase.'};
  const review={src:'/canon-next/approved-v1/welcome-clean-plate.webp',mobileSrc:'/canon-next/portrait/welcome-cta-portrait.png',position:'center',mobilePosition:'center',aspectRatio:16/9,mobileAspectRatio:941/1672};
  const sections = ['campaign','hero', 'field', 'funnel', 'offer', 'feature', 'evidence', 'cta', 'handoff', 'security', 'narrative'];
  const scenes: PerformanceNarrativeScene[] = [
    { id: 'draft', label: 'Draft', summary: 'Name an owner.', title: 'A draft has a home.', detail: 'Morgan owns this fictional workshop draft.', tone: 'neutral', evidence: ['Sample owner: Morgan'], receipts: ['Fixture only; no runtime receipt'], notes: 'Fictional speaker note: explain who owns the next decision.', actions: [{ label: 'Inspect the sample controls', href: '#security' }] },
    { id: 'review', label: 'Review', summary: 'Check the boundary.', title: 'Pause for review.', detail: 'A named reviewer checks the sample before any delivery.', tone: 'review', evidence: ['Sample approval is pending'], receipts: ['No external action requested'], notes: 'Fictional speaker note: a review state does not grant shipping permission.' },
    { id: 'ready', label: 'Ready', summary: 'Keep the proof.', title: 'Keep a readable record.', detail: 'This fixture demonstrates a ready appearance without claiming a real release.', tone: 'allow', evidence: ['Synthetic review record'], receipts: ['Local sample complete'], notes: 'Fictional speaker note: distinguish a sample record from live evidence.' },
    { id: 'stop', label: 'Stop', summary: 'An owner is missing.', title: 'Hold the handoff.', detail: 'The fictional second handoff is blocked until an owner is named.', tone: 'block', evidence: ['Owner: missing'], notes: 'Fictional speaker note: describe the recovery step.' }
  ];

</script>

<svelte:head><title>Canon · Composition regression fixture</title><meta name="robots" content="noindex,nofollow" /></svelte:head>

<div class="composition-fixture" data-theme={dark ? 'dark' : 'light'}>
  <a class="skip" href="#hero">Skip to compositions</a>
  <header class="fixture-header">
    <p>Canon / Local review fixture</p>
    <button type="button" onclick={() => dark = !dark} aria-label={dark ? 'Use light appearance' : 'Use dark appearance'}>{dark ? 'Light appearance' : 'Dark appearance'}</button>
    <p>Fictional workshop samples. No customer results, security guarantees, or release claims.</p>
    <nav aria-label="Composition sections">{#each sections as section}<a href={`#${section}`}>{section}</a>{/each}</nav>
  </header>
  <main>
    <div id="campaign" data-fixture="performance-campaign-opening"><PerformanceCampaignOpening eyebrow="Canon / Original workshop" title="Make room for a useful step." lede="Prepare a local draft. Keep the next decision human." proof={[{label:"Scope",value:"Local sample"},{label:"Review",value:"Human decision"}]} background={welcome} expression="editorial" density="compact">{#snippet actions()}<Button href="#field">Explore the workshop</Button>{/snippet}</PerformanceCampaignOpening></div>
    <div id="hero" data-fixture="clear-platform-hero">
      <ClearPlatformHero background={welcome} eyebrow="Clear / Fictional platform" title="A clear next step." description="A local sample with a named owner and a clear boundary." proofItems={[{value:'Sample',label:'Synthetic evidence only'},{value:'Local',label:'No external delivery'}]} metaItems={[{label:'Owner',value:'Morgan (fictional)'},{label:'State',value:'Draft'}]}>
        {#snippet actions()}<Button href="#field">Inspect the field study</Button>{/snippet}

      </ClearPlatformHero>
    </div>
    <div id="field" data-fixture="performance-field-sequence">
      <PerformanceFieldSequence title="Follow one sample through the workshop." description="These values demonstrate component states; they are not measured outcomes." studies={[{image:'/canon-next/approved-v1/welcome-bench.webp',alt:'Existing illustrated Canon workshop bench study.',title:'Name the next owner.',description:'A fictional handoff keeps an owner, a boundary, and a sample record together.',principle:'Ownership before movement',metrics:[{label:'Owner',value:'Morgan',detail:'Fictional operator'},{label:'Evidence',value:'Sample',detail:'No live measurement'}],proof:{id:'FIXTURE-01',owner:'Morgan (fictional)',state:'draft',verified:'Not live verified',classification:'Synthetic sample'}}]} />
    </div>
    <div id="funnel" data-fixture="property-funnel">
      <PropertyFunnel current="agency" heading="A fictional handoff across the properties." description="Review the actual navigation and handoff roles. This component links to the CREATE SOMETHING properties; these links are not sample submissions." handoff={{owner:'Morgan (fictional)',authority:'Local inspection only',proof:'Synthetic record FIXTURE-01',state:'review'}} />
    </div>
    <div id="offer" data-fixture="meridian-offer-panel"><MeridianOfferPanel background={review} eyebrow="Meridian / Sample offer" title="Give the next decision a place." description="A local draft for human review." actionLabel="Review the sample" actionHref="#narrative" /></div>
    <div id="feature" data-fixture="meridian-feature-split"><MeridianFeatureSplit eyebrow="Meridian / Sample feature" title="Keep the boundary close to the work." description="The sample owner can inspect a draft, ask for review, and retain the evidence." primaryLabel="Inspect controls" primaryHref="#security" secondaryLabel="Read the sample evidence" secondaryHref="#evidence" tags={['Fictional owner', 'Local anchors', 'Sample record']} /></div>
    <div id="evidence" data-fixture="meridian-evidence-carousel"><MeridianEvidenceCarousel eyebrow="Meridian / Synthetic evidence" title="Four records to inspect." description="Fictional statements exercise the carousel; none are customer testimonials." itemsPerView={2} items={['Draft retained','Boundary named','Review pending','Owner missing'].map((title,index)=>({eyebrow:`Sample ${index+1}`,title,detail:'Synthetic fixture content for contrast, wrapping, and carousel controls.',source:'Fictional workshop record',href:'#narrative'}))} /></div>
    <div id="cta" data-fixture="clear-cta-band"><ClearCtaBand background={review} eyebrow="Clear / Sample outcomes" title="Know the next step." description="Four fictional states, ready to inspect." items={(['controlled','ready','review','stop'] as const).map(state=>({label:state,title:`Sample: ${state}`,detail:'Fictional state; no real approval or action.',state}))}>{#snippet actions()}<Button href="#narrative">Read the sample narrative</Button>{/snippet}</ClearCtaBand></div>
    <div id="handoff" data-fixture="performance-conversion-handoff"><PerformanceConversionHandoff background={review} title="Keep the next decision human." description="A fictional draft is prepared for review. Nothing has been sent." handoff={{owner:'Morgan (fictional)',authority:'Local review only',proof:'Synthetic sample',state:'review'}} density="compact">{#snippet actions()}<Button href="#narrative">Read the sample</Button>{/snippet}</PerformanceConversionHandoff></div>
    <div id="security" data-fixture="clear-security-panel"><ClearSecurityPanel eyebrow="Clear / Fictional controls" title="Make the boundary readable." description="Illustrative controls, not a security certification or live audit." items={[{label:'Owner',title:'Morgan (fictional)',detail:'One named owner for this sample.'},{label:'Authority',title:'Local review only',detail:'No production or external action.'},{label:'Evidence',title:'Synthetic record',detail:'This sample is not a runtime receipt.'}]} logs={[{label:'Sample record',value:'FIXTURE-01'},{label:'Delivery',value:'Not requested'},{label:'Verification',value:'Local fixture only'}]} /></div>
    <div id="narrative" data-fixture="performance-narrative-stage"><PerformanceNarrativeStage id="fixture-narrative" eyebrow="Performance / Fictional narrative" title="A handoff in four scenes." description="Use the scene tabs and arrow controls. Choose Present deck, then Notes, to inspect actual speaker notes. Escape exits presentation." {scenes} enablePresentation /></div>
  </main>
  <footer class="fixture-footer"><a href="#hero">Return to the beginning</a><p>Local review surface · synthetic content · original components</p></footer>
</div>

<style>
  :global(body){margin:0}
  .composition-fixture{background:var(--color-performance-paper);color:var(--color-performance-ink);min-height:100vh}
  .composition-fixture[data-theme='dark']{background:#000}
  .fixture-header,.fixture-footer{padding:24px;max-width:90rem;margin-inline:auto}
  .fixture-header{display:flex;flex-wrap:wrap;align-items:center;gap:16px 28px}
  .fixture-header p{margin:0;line-height:1.5}.fixture-header p:nth-of-type(2){flex-basis:100%}
  nav{display:flex;flex-wrap:wrap;gap:8px 16px} a{color:inherit;text-underline-offset:4px}
  nav a,.fixture-footer>a{display:inline-flex;align-items:center;justify-content:center;min-width:44px;min-height:44px}
  button{font:inherit;min-height:44px;padding:10px 16px;background:var(--color-performance-panel);color:var(--color-performance-ink);border:1px solid var(--color-performance-line);cursor:pointer}
  [id]{scroll-margin-top:24px}
  .skip{min-height:44px;box-sizing:border-box;position:absolute;left:16px;top:-100px;z-index:1000;padding:12px;background:var(--color-performance-panel)}.skip:focus{top:12px}
  :is(a,button):focus-visible{outline:2px solid var(--color-performance-focus);outline-offset:4px}
</style>
