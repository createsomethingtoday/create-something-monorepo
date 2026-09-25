<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { afterNavigate, replaceState } from '$app/navigation';
  import { filmStories, type FilmStory } from '$lib/data/filmStories';
  import { agencyCoreMessaging } from '$lib/data/marketingCopy';
  import { reducedFilmMotion, filmOverlayOpen, visibleFilm } from '$lib/motion/filmPlayback';
  let field: HTMLElement, dialog: HTMLDialogElement, screen: HTMLDivElement;
  let frames: HTMLIFrameElement[] = [];
  let player = $state<HTMLIFrameElement>(), video = $state<HTMLVideoElement>();
  let active = $state<FilmStory>(filmStories[0]), ready = $state(false), open = $state(false), playing = $state(false), time = $state(0), progress = $state(.5);
  let restoreFocus: HTMLElement | null = null;
  const seek = (frame: HTMLIFrameElement | undefined, t: number) => frame?.contentWindow?.postMessage({type:'agency-seek',time:t,receipt:frame===player},location.origin);
  function scale() {
    for (const frame of frames) {if(!frame)continue;const parent=frame.parentElement!;const zoom=Math.min(parent.clientWidth/1600,parent.clientHeight/1000);frame.style.transform=`scale(${zoom})`;frame.style.left=`${(parent.clientWidth-1600*zoom)/2}px`;frame.style.top=`${(parent.clientHeight-1000*zoom)/2}px`;}
    if(player&&screen)player.style.transform=`scale(${screen.clientWidth/1600})`;
  }
  function setTime(t:number) {time=Math.max(0,Math.min(active.duration,t)); if(video)video.currentTime=time;else seek(player,time);}
  async function show(story:FilmStory) {
    if(!open)restoreFocus=document.activeElement as HTMLElement;
    playing=false;video?.pause();active=story;time=0;open=true;filmOverlayOpen.set(true);
    const url=new URL(location.href);url.searchParams.set('film',story.id);replaceState(url,{});
    await tick(); if(!dialog.open)dialog.showModal();document.body.style.overflow='hidden';scale();seek(player,0);
  }
  function closed() {playing=false;video?.pause();open=false;filmOverlayOpen.set(false);document.body.style.overflow='';const url=new URL(location.href);url.searchParams.delete('film');replaceState(url,{});restoreFocus?.focus({preventScroll:true});}
  function next(direction:number) {void show(filmStories[(filmStories.findIndex(s=>s.id===active.id)+direction+filmStories.length)%filmStories.length]);}
  afterNavigate(({to})=>{
    const story=filmStories.find(s=>s.id===to?.url.searchParams.get('film'));
    if(story&&(!open||active.id!==story.id))void show(story);
    else if(!story&&open)dialog.close();
  });
  onMount(()=>{
    let visible=false, frameId=0, previous=0, thumb=0;
    const observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;if(visible)ready=true;},{rootMargin:'300px'});observer.observe(field);
    const resize=new ResizeObserver(scale);resize.observe(field);resize.observe(screen);
    const message=(event:MessageEvent)=>{if(event.origin!==location.origin)return;if(event.data?.type==='agency-ready'){if(event.source===player?.contentWindow){seek(player,time);scale();}else frames.forEach((f,i)=>{if(event.source===f?.contentWindow){seek(f,10+i*.3);scale();}});}if(event.data?.type==='agency-seeked'&&event.source===player?.contentWindow&&player)player.dataset.currentTime=String(event.data.time);};
    const scroll=()=>{const r=field.getBoundingClientRect();progress=Math.max(0,Math.min(1,-r.top/Math.max(1,r.height-innerHeight)));};
    const animate=(now:number)=>{const dt=previous?Math.min(.1,(now-previous)/1000):0;previous=now;if(playing&&open&&!document.hidden){setTime(time+dt);if(time>=active.duration)playing=false;}if(visible&&!$reducedFilmMotion&&!open&&!document.hidden&&now-thumb>150){thumb=now;frames.forEach((f,i)=>seek(f,10+(Math.sin(now/7000+i)*.5+.5)*6));}frameId=requestAnimationFrame(animate);};
    const visibility=()=>{if(document.hidden){playing=false;video?.pause();}};
    addEventListener('message',message);addEventListener('scroll',scroll,{passive:true});document.addEventListener('visibilitychange',visibility);frameId=requestAnimationFrame(animate);
    return ()=>{observer.disconnect();resize.disconnect();cancelAnimationFrame(frameId);removeEventListener('message',message);removeEventListener('scroll',scroll);document.removeEventListener('visibilitychange',visibility);filmOverlayOpen.set(false);document.body.style.overflow='';};
  });
</script>
<section id="work" class="field-track" class:calm={$reducedFilmMotion} bind:this={field} aria-labelledby="work-title">
  <div class="field-pin">
    <div class="intro"><p class="eyebrow">What we’ve built / What we can build with you</p><h2 id="work-title">Different work.<br />The same care.</h2><p>From the agent’s tools to the customer’s screen. Find the work you need, then see how it happens.</p><p class="hint">Choose a film to take a closer look.</p></div>
    <div class="film-field">
      {#each filmStories as story,i}
        <button class={`tile tile-${i}`} style:transform={$reducedFilmMotion?'none':`translateY(${(progress-.5)*[-85,65,-55,65,-55,60,-45][i]}px)`} onclick={()=>show(story)} aria-label={`Open ${story.name} film`}>
          <span class="media">
            {#if story.video}<video src={story.video} poster={story.poster} muted playsinline loop preload="metadata" aria-hidden="true" tabindex="-1" use:visibleFilm></video>
            {:else if ready}<iframe bind:this={frames[i]} src={story.composition ?? undefined} title={`${story.name} storyboard preview`} aria-hidden="true" tabindex="-1" loading="lazy" onload={scale}></iframe>
            {:else}<img src="/films/hero.webp" alt="" loading="lazy" />{/if}
          </span><span class="tile-label">{story.name}<span aria-hidden="true">▶</span></span>
        </button>
      {/each}
    </div>
    <p class="field-note">Two recorded client-site walkthroughs, a PCN product overview, three illustrative storyboards, and Ground’s actual MCP result on synthetic files.</p>
  </div>
</section>
<nav class="work-index" aria-label="Explore the work">{#each filmStories as story}<button onclick={()=>show(story)}>{story.name} ↗</button>{/each}</nav>
<dialog bind:this={dialog} onclose={closed} aria-labelledby="film-title">
  <div class="dialog-top"><span class="eyebrow">{active.status} / {String(filmStories.findIndex(s=>s.id===active.id)+1).padStart(2,'0')} of 07</span><button onclick={()=>dialog.close()} aria-label="Close film">Close ×</button></div>
  <div class="story-layout"><div><div class="screen" bind:this={screen}>
    {#if open}{#key active.id}
      {#if active.video}<video bind:this={video} src={active.video} poster={active.poster} controls playsinline preload="metadata" aria-label={active.title}><track kind="captions" src={active.captions} srclang="en" label="English descriptions" /></video>
      {:else}<iframe bind:this={player} src={active.composition ?? undefined} title={`${active.name} animated storyboard`} tabindex="-1" onload={scale}></iframe>{/if}
    {/key}{/if}
  </div>
  {#if !active.video}<div class="controls"><button onclick={()=>{if(time>=active.duration)setTime(0);playing=!playing;}}>{playing?'Pause':'Play'}</button><input type="range" min="0" max={active.duration} step=".1" value={time} aria-label="Storyboard time" oninput={(e)=>{playing=false;setTime(Number(e.currentTarget.value));}} /><output>{Math.floor(time)} / {active.duration}s</output></div>{/if}
  <div class="beats">{#each (active.chapters ?? [1,11,18]) as t,i}<button onclick={()=>{playing=false;video?.pause();setTime(t);}}>{(active.id === 'education' ? ['The idea','Shape a network','The offering'] : active.status === 'Recorded website walkthrough' ? (active.id === 'webflow' ? ['The Insights Hub','Filter the content','Read an article'] : ['The homepage','Explore the site','A closer look']) : ['The request','Inside the work','The result'])[i]}</button>{/each}</div>
  </div><div class="story-copy"><p class="eyebrow">{active.name}</p><h2 id="film-title">{active.title}</h2><p>{active.desc}</p><dl><dt>Where we meet you</dt><dd>{active.where}</dd><dt>What you keep</dt><dd>{active.deliver}</dd></dl><p class="proof">{active.proof}</p><a href={active.source}>{active.sourceLabel} ↗</a><a href={agencyCoreMessaging.membershipHref} onclick={()=>dialog.close()}>Explore membership →</a></div></div>
  <div class="dialog-bottom"><button onclick={()=>next(-1)}>← Previous</button><button onclick={()=>next(1)}>Next →</button></div>
</dialog>
<style>
.field-track{height:220svh;position:relative;scroll-margin-top:110px;background:var(--color-performance-paper);color:var(--color-performance-ink)}.field-pin{height:100svh;min-height:820px;position:sticky;top:0;overflow:hidden}.intro{position:absolute;top:35%;left:50%;transform:translateX(-50%);width:45%;text-align:center;max-width:640px}.eyebrow{color:inherit;font:11px/1.5 var(--font-performance-mono);letter-spacing:.06em;text-transform:uppercase}h2{font:400 clamp(40px,4.8vw,72px)/1.05 var(--font-performance-editorial);letter-spacing:-.035em;margin:22px 0}.intro>p:not(.eyebrow){max-width:460px;margin:0 auto;font-size:16px;line-height:1.7}.intro .hint{font-size:12px!important;margin-top:22px!important}.tile{position:absolute;width:17vw;max-width:270px;background:none;border:0;padding:0;color:inherit;text-align:left;cursor:pointer}.media{display:block;aspect-ratio:16/10;overflow:hidden;position:relative;background:var(--color-performance-ink);border-radius:10px}.media video,.media img{width:100%;height:100%;object-fit:contain}.media iframe{position:absolute;top:0;width:1600px;height:1000px;transform-origin:0 0;border:0;pointer-events:none}.tile-label{display:flex;justify-content:space-between;gap:6px;font-size:11px;margin-top:10px}.tile-0{left:18%;top:10%}.tile-1{right:17%;top:10%}.tile-2{left:42%;top:2%;width:16vw}.tile-3{left:3%;top:42%}.tile-4{right:3%;top:42%}.tile-5{left:18%;bottom:7%}.tile-6{right:17%;bottom:7%}.field-note{position:absolute;bottom:15px;left:5vw;font:10px var(--font-performance-mono);max-width:300px}.work-index{display:flex;flex-wrap:wrap;justify-content:center;gap:10px 25px;padding:35px 5vw;border-bottom:1px solid var(--color-performance-line)}button{font:inherit;min-height:44px;color:inherit;cursor:pointer}.work-index button,.beats button{background:none;border:0;text-decoration:underline;text-underline-offset:5px;font-size:13px}button:focus-visible,a:focus-visible,input:focus-visible{outline:3px solid var(--color-performance-signal);outline-offset:5px}.calm{height:auto}.calm .field-pin{position:relative;height:auto;min-height:0;padding:90px 6vw}.calm .intro{position:static;transform:none;width:auto;max-width:650px;margin:0 auto 50px}.calm .film-field{display:grid;grid-template-columns:repeat(4,1fr);gap:30px}.calm .tile{position:static;width:100%;max-width:none}.calm .field-note{position:static;margin-top:30px}
dialog{width:min(1440px,94vw);max-height:92svh;overflow:auto;padding:30px;background:var(--color-performance-paper);color:var(--color-performance-ink);border:1px solid var(--color-performance-line)}dialog::backdrop{background:color-mix(in srgb,var(--color-performance-ink) 75%,transparent)}.dialog-top,.dialog-bottom{display:flex;align-items:center;justify-content:space-between;gap:20px}.dialog-top{margin-bottom:25px}.dialog-top button,.dialog-bottom button,.controls button{padding:10px 16px;background:transparent;border:1px solid var(--color-performance-line-strong)}.story-layout{display:grid;grid-template-columns:1.7fr 1fr;gap:35px}.screen{width:100%;aspect-ratio:1.6;background:var(--color-performance-paper);position:relative;overflow:hidden}.screen>iframe{position:absolute;inset:0;width:1600px;height:1000px;border:0;transform-origin:0 0}.screen>video{width:100%;height:100%;object-fit:contain}.controls{display:flex;gap:15px;align-items:center;margin-top:15px}.controls input{flex:1;min-width:40px}.controls output{font:12px var(--font-performance-mono)}.beats{display:flex;gap:15px;flex-wrap:wrap;margin-top:10px}.story-copy h2{font-size:clamp(30px,3vw,46px);margin:12px 0 20px}.story-copy p,.story-copy dd{font-size:14px;line-height:1.65}.story-copy dt{font:11px var(--font-performance-mono);margin-top:20px;text-transform:uppercase}.story-copy dd{margin:8px 0}.proof{border-top:1px solid var(--color-performance-line);padding-top:18px}.story-copy a{display:block;margin:15px 0;color:inherit;font-size:13px;min-height:30px}.dialog-bottom{margin-top:28px}
@media(max-width:700px){.field-track{height:auto}.field-pin{position:relative;height:1100px;min-height:0}.intro{top:33%;width:78%}.intro h2{font-size:44px}.intro>p:not(.eyebrow){font-size:14px}.intro .eyebrow{font-size:9px}.tile{width:38vw;max-width:none}.tile-label{font-size:10px}.tile-0{left:5%;top:8%}.tile-1{right:5%;top:8%}.tile-2{left:31%;top:18%;width:38vw}.tile-3{left:5%;top:66%}.tile-4{right:5%;top:66%}.tile-5{left:5%;bottom:5%}.tile-6{right:5%;bottom:5%}.field-note{font-size:8px;bottom:5px;max-width:90%}.calm .film-field{grid-template-columns:repeat(2,1fr)}.calm .field-pin{padding:55px 6vw}.work-index{justify-content:start}dialog{width:100%;height:100svh;max-height:100svh;padding:18px}.story-layout{grid-template-columns:1fr}.screen{width:calc(100% + 36px);margin-left:-18px}.dialog-top .eyebrow{font-size:9px}}
</style>
