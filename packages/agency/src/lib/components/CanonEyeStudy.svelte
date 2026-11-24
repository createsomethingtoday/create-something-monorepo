<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  export let footageSrc = '/images/canon-agency-v1/pour-study-frame.webp';
  type Direction = 'left' | 'front' | 'right';
  let mounted = false;
  let stage: HTMLDivElement;
  function showStage() {
    if (stage && stage.getBoundingClientRect().top < 0)
      stage.scrollIntoView({ block: 'start', behavior: 'instant' as ScrollBehavior });
  }
  let direction: Direction = 'front';
  let timing = 1;
  let time = 0;
  let playing = false;
  let reference = false;
  let attempted = false;
  let timer: ReturnType<typeof setInterval> | undefined;
  const duration = 3.2;
  const cueTime = 1.8;
  const labels = ['Before the line', 'On “drop”', 'After the line'];
  $: chosenDirection = reference ? 'right' : direction;
  $: winkAt = cueTime + ((reference ? 1 : timing) - 1) * 0.65;
  $: gazeFrame = Math.min(4, Math.max(0, Math.round((time - 0.3) / 0.1)));
  $: winkAmount = Math.max(0, 1 - Math.abs(time - winkAt) / 0.3);
  $: frame = gazeFrame < 4 ? gazeFrame : 4 + Math.round(winkAmount * 4);
  $: pose = `/images/canon-eye-study/${chosenDirection}-${frame}.webp`;
  $: phase =
    time < 0.3
      ? 'Ready'
      : time < 0.7
        ? 'Direct the glance'
        : Math.abs(time - winkAt) < 0.3
          ? 'Close, hold, release'
          : time < cueTime
            ? 'Hold the glance'
            : 'Let the moment settle';
  $: feedback =
    direction === 'right'
      ? timing === 1
        ? 'The glance leads us into the footage. The wink lands on “drop”, then opens again. Compare the small face with the close-up: does it still read at this size?'
        : timing === 0
          ? 'The glance finds the footage, but the wink finishes before “drop”. Try moving it onto the word so the gesture has something to answer.'
          : 'The glance finds the footage, but the wink arrives after “drop”. Try the middle cue to connect the gesture with the line.'
      : direction === 'left'
        ? 'Canon looks away from the footage. Try “Toward the footage”, then keep that direction held through the wink.'
        : 'Canon keeps looking at us. Try “Toward the footage” to give the viewer somewhere to look before the wink.';
  function pause() {
    if (timer) clearInterval(timer);
    timer = undefined;
    playing = false;
  }
  function reset() {
    pause();
    time = 0;
    attempted = false;
    reference = false;
    direction = 'front';
    timing = 1;
  }
  function play() {
    showStage();
    pause();
    attempted = true;
    time = 0;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      time = 0.7;
      return;
    }
    playing = true;
    const start = performance.now();
    timer = setInterval(() => {
      time = Math.min(duration, (performance.now() - start) / 1000);
      if (time >= duration) pause();
    }, 40);
  }
  function step() {
    showStage();
    pause();
    attempted = true;
    const stops = [0, 0.4, 0.7, winkAt - 0.15, winkAt, winkAt + 0.15, winkAt + 0.35, duration].sort(
      (a, b) => a - b
    );
    time = stops.find((v) => v > time + 0.02) ?? 0;
  }
  function change() {
    pause();
    time = 0;
    attempted = false;
    reference = false;
  }
  onMount(() => {
    mounted = true;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        for (const gaze of ['left', 'front', 'right']) {
          for (let i = 0; i < 9; i++) {
            const image = new Image();
            image.src = `/images/canon-eye-study/${gaze}-${i}.webp`;
          }
        }
      },
      { rootMargin: '320px' }
    );
    observer.observe(stage);
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const interrupt = () => {
      if (motion.matches || document.hidden) pause();
    };
    motion.addEventListener('change', interrupt);
    document.addEventListener('visibilitychange', interrupt);
    return () => {
      observer.disconnect();
      motion.removeEventListener('change', interrupt);
      document.removeEventListener('visibilitychange', interrupt);
    };
  });
  onDestroy(pause);
</script>

<section class="eye-study" aria-labelledby="eye-study-title">
  <div class="intro">
    <h3 id="eye-study-title">Try the eye study</h3>
    <p>
      Send Canon’s eyes toward the footage. Then land a wink on <q>There’s the first drop.</q> A small
      movement should carry the thought.
    </p>
  </div>
  <div class="choices">
    <fieldset disabled={!mounted}>
      <legend>Where should Canon look?</legend><label
        ><input type="radio" bind:group={direction} value="left" on:change={change} /> Away from the footage</label
      ><label
        ><input type="radio" bind:group={direction} value="front" on:change={change} /> At the viewer</label
      ><label
        ><input type="radio" bind:group={direction} value="right" on:change={change} /> Toward the footage</label
      >
    </fieldset>
    <fieldset disabled={!mounted}>
      <legend>When should the wink land?</legend>{#each labels as label, index}<label
          ><input type="radio" bind:group={timing} value={index} on:change={change} />
          {label}</label
        >{/each}
    </fieldset>
  </div>
  <div class="attempt-stage" bind:this={stage}>
    <div class="composition">
      <div class="companion">
        <img
          src={pose}
          width="460"
          height="300"
          alt={`Canon ${chosenDirection === 'right' ? 'looking toward the footage' : chosenDirection === 'left' ? 'looking away from the footage' : 'looking at you'}${frame > 4 ? ', with one eyelid closing' : ''}`}
        />
      </div>
      <div class="footage">
        <img
          src={footageSrc}
          width="564"
          height="304"
          alt="Cup illustrated in the walkthrough footage"
        />
        <p class:spoken={time >= cueTime - 0.2 && time <= cueTime + 0.4}>
          “There’s the first <strong class:cue={time >= cueTime - 0.12 && time <= cueTime + 0.2}
            >drop</strong
          >.”
        </p>
      </div>
    </div>
    <div class="closeup">
      <img
        src={pose}
        width="460"
        height="300"
        alt="The same engine pose, enlarged to inspect gaze and eyelid movement"
      />
      <p>Same pose, closer.</p>
    </div>
  </div>
  <div class="readout">
    <span>{reference ? 'Reference' : 'Your direction'} · {phase}</span><span
      >{time.toFixed(1)} / 3.2 s</span
    >
  </div>
  <div class="timeline" aria-hidden="true">
    <span style={`width:${(time / duration) * 100}%`}></span><i
      style={`left:${(cueTime / duration) * 100}%`}
    ></i>
  </div>
  <div class="actions">
    <button disabled={!mounted} type="button" class="primary" on:click={playing ? pause : play}
      >{playing
        ? 'Pause'
        : reference
          ? 'Play reference from start'
          : attempted
            ? 'Replay from start'
            : 'Play your direction'}</button
    ><button disabled={!mounted} type="button" on:click={step}>Next pose</button><button
      disabled={!mounted}
      type="button"
      aria-pressed={reference}
      on:click={() => {
        pause();
        reference = !reference;
        time = 0;
      }}
    >
      {reference ? 'Return to your attempt' : 'Compare the reference'}</button
    ><button disabled={!mounted} type="button" on:click={reset}>Reset</button>
  </div>
  <p class="motion-note">
    Nothing plays until you choose. With reduced motion, use “Next pose” to move through the
    gesture.
  </p>
  {#if reference}<p class="feedback" role="status">
      Reference direction: eyes toward the footage, held there; one lid closes on “drop” and
      releases. Play or step through, then return to your choices.
    </p>{:else if attempted && time >= winkAt + 0.35}<p class="feedback" role="status">
      {feedback}
    </p>{/if}
  <noscript
    ><p>
      Enable JavaScript to direct an attempt. You can also watch the reference film above.
    </p></noscript
  >
</section>

<style>
  .eye-study {
    margin: 2.5rem 0;
    border-block: 1px solid #444;
    padding: 2rem 0;
    color: inherit;
  }
  .intro {
    max-width: 38rem;
  }
  h3 {
    font-size: clamp(1.5rem, 3vw, 2rem);
    font-weight: 450;
    line-height: 1.2;
    margin: 0.5rem 0 1rem;
  }
  .intro p {
    line-height: 1.65;
  }
  .attempt-stage {
    scroll-margin-top: 1rem;
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 1rem;
    margin-top: 1.5rem;
  }
  .composition {
    display: flex;
    align-items: center;
    background: #202020;
    border: 1px solid #3b3b3b;
    padding: 1rem 0.5rem;
    min-width: 0;
  }
  .companion {
    width: 30%;
    flex-shrink: 0;
  }
  .companion img {
    display: block;
    width: 100%;
    height: auto;
  }
  .footage {
    flex: 1;
    min-width: 0;
  }
  .footage img {
    display: block;
    width: 100%;
    height: auto;
  }
  .footage p {
    font-size: clamp(0.7rem, 1.5vw, 0.95rem);
    margin: 0.75rem 0 0.25rem;
    color: #aaa;
    transition: color 0.1s;
  }
  .footage strong {
    font-weight: inherit;
  }
  .footage strong.cue {
    background: #e2dfd8;
    color: #171717;
    padding: 0.1em 0.2em;
    font-weight: 650;
  }
  .footage p.spoken {
    color: white;
    text-decoration: underline;
    text-underline-offset: 0.3em;
  }
  .closeup {
    background: #252525;
    border: 1px solid #3b3b3b;
    display: flex;
    flex-direction: column;
    justify-content: center;
    min-width: 0;
  }
  .closeup img {
    width: 100%;
    height: auto;
    display: block;
  }
  .closeup p {
    font-size: 0.75rem;
    color: #aaa;
    margin: 0 1rem 0.75rem;
  }
  .readout {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    font-size: 0.75rem;
    color: #555;
    margin: 0.8rem 0;
  }
  .timeline {
    height: 3px;
    background: #444;
    position: relative;
  }
  .timeline span {
    display: block;
    height: 100%;
    background: #e0ddd6;
  }
  .timeline i {
    position: absolute;
    top: -3px;
    height: 9px;
    width: 2px;
    background: #aaa;
  }
  .choices {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
    margin: 1.75rem 0;
  }
  fieldset {
    border: 0;
    padding: 0;
    margin: 0;
    min-width: 0;
  }
  legend {
    font-size: 0.9rem;
    margin-bottom: 0.75rem;
    font-weight: 600;
  }
  label {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    font-size: 0.85rem;
    padding: 0.45rem 0;
    min-height: 44px;
    cursor: pointer;
  }
  input {
    accent-color: #333;
    width: 1rem;
    height: 1rem;
    flex-shrink: 0;
  }
  .actions {
    margin-top: 1rem;
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  button {
    border: 1px solid #666;
    border-radius: 3px;
    background: transparent;
    color: inherit;
    font: inherit;
    font-size: 0.8rem;
    padding: 0.7rem 0.9rem;
    min-height: 44px;
    cursor: pointer;
  }
  button:hover,
  button[aria-pressed='true'] {
    border-color: #333;
    background: #e8e5de;
    color: #171717;
  }
  button:disabled {
    cursor: default;
    opacity: 0.6;
  }
  button.primary {
    background: #282924;
    color: #fff;
    border-color: #282924;
  }
  button:focus-visible,
  input:focus-visible {
    outline: 2px solid #171717;
    outline-offset: 4px;
  }
  .motion-note {
    font-size: 0.75rem;
    color: #555;
    line-height: 1.5;
    margin-top: 1rem;
  }
  .feedback {
    font-size: 0.9rem;
    line-height: 1.7;
    border-left: 2px solid #aaa;
    padding-left: 1rem;
    max-width: 42rem;
    margin: 1.5rem 0 0;
  }
  @media (max-width: 600px) {
    .attempt-stage {
      grid-template-columns: 1fr;
    }
    .closeup {
      flex-direction: row;
      align-items: center;
    }
    .closeup img {
      width: 60%;
      max-width: 240px;
    }
    .closeup p {
      margin: 0 0.75rem 0 0;
    }
    .choices {
      grid-template-columns: 1fr;
      gap: 1.2rem;
    }
    .composition {
      padding: 0.8rem 0.25rem;
    }
    .actions button {
      flex-grow: 1;
    }
    .readout {
      font-size: 0.7rem;
    }
  }
  @media (max-width: 420px) {
    .companion {
      width: 36%;
      clip-path: inset(-50% 0);
    }
    .companion img {
      transform: scale(1.55);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .footage p {
      transition: none;
    }
  }
</style>
