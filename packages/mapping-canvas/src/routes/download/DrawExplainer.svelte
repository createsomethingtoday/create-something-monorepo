<script lang="ts">
  let stage = $state(0);
  const steps = [
    { title: 'Sketch the idea', text: 'Put a line, a shape or a note on the canvas. Start with the part of the conversation you want everyone to see.' },
    { title: 'Make the relationships clear', text: 'Arrange notes and connect the pieces. In a compatible agent-enabled browser, Draw’s WebMCP tools can also create and arrange canvas objects.' },
    { title: 'Keep what you made', text: 'Export JSON to keep an editable copy, or SVG and PNG to use the drawing elsewhere. Your canvas stays local unless you explicitly export or publish it.' }
  ];
</script>

<figure class="instrument" aria-labelledby="instrument-title">
  <div class="figure-heading"><span>FIG. 01 / HOW DRAW WORKS</span><span>ILLUSTRATIVE</span></div>
  <svg viewBox="0 0 620 420" role="img" aria-labelledby="drawing-title drawing-desc">
    <title id="drawing-title">A drawing desk, from first mark to a portable drawing</title>
    <desc id="drawing-desc">An isometric drawing board holds a sketch, connected notes and an export sheet. Choose a step below to highlight each part. This illustration does not operate Draw or connect an AI agent.</desc>
    <!-- Original geometry: a board supported by feet, inset paper, clips, ruler and pencil. -->
    <g stroke="#626262" stroke-width="1" stroke-linejoin="round">
      <path fill="#171717" d="M82 254l264 128 220-130-264-128z" />
      <path fill="#202020" d="M103 245v30l15 7 13-7v-29zM326 350v28l15 7 14-8v-29zM531 232v28l14 7 12-7v-30z" />
      <path fill="#2c2c2c" d="M65 209l280 139 230-136v18L345 367 65 228z" />
      <path fill="#444" d="M65 209L295 73l280 139-230 136z" />
      <path fill="#252525" d="M81 209L295 84l263 129-213 125z" />
      <path fill="#343434" d="M100 208L295 96l243 118-193 114z" />
      <g transform="matrix(.86 .425 -.86 .5 291 108)">
        <rect x="0" y="3" width="266" height="214" fill="#111" />
        <rect x="0" y="0" width="266" height="210" fill="#ddd" stroke="#aaa" />
        <path d="M12 12h242v186H12z" fill="none" stroke="#bcbcbc" />
        <g stroke="#bbb" stroke-width=".5">
          {#each Array(9) as _, i}<path d={`M12 ${30+i*18}h242`} />{/each}
          {#each Array(12) as _, i}<path d={`M${30+i*18} 12v186`} />{/each}
        </g>
        <g class:active={stage === 0} class="sketch" fill="none" stroke="#333" stroke-width="2.4" stroke-linecap="round">
          <path d="M28 67q12-37 42-20t3 40q-26 12-45-20M49 103q28-19 50-8M32 117l53 3M37 127l32 2" />
        </g>
        <g class:active={stage === 1} class="notes" stroke="#555">
          <path d="M87 63h25v-22h22M87 63h25v63h22" fill="none" stroke-width="2" />
          <rect x="135" y="23" width="92" height="43" rx="2" fill="#f7f7f7" />
          <rect x="135" y="104" width="92" height="43" rx="2" fill="#f7f7f7" />
          <path d="M147 38h65M147 48h41M147 119h65M147 129h41" />
          <circle cx="87" cy="63" r="3" fill="#333" />
        </g>
        <rect x="80" y="-5" width="64" height="13" rx="2" fill="#555" />
        <rect x="87" y="-8" width="50" height="9" rx="2" fill="#aaa" />
        <circle cx="92" cy="-3" r="1.5" fill="#333"/><circle cx="132" cy="-3" r="1.5" fill="#333"/>
        <g fill="#aaa"><rect x="-16" y="5" width="9" height="195" rx="2" /></g>
        {#each Array(37) as _, i}<path d={`M-16 ${10+i*5}h${i%5 === 0 ? 7 : 4}`} stroke="#444" />{/each}
        <g class="pencil" class:active={stage === 0}>
          <path d="M248 77h7v96l-3.5 14-3.5-14z" fill="#eee" />
          <path d="M251.5 78v94M248 173h7" /><path d="M250 181l1.5 6 1.5-6z" fill="#222"/>
          <rect x="248" y="70" width="7" height="8" fill="#777" />
        </g>
      </g>
      <g class="export" class:active={stage === 2} transform="translate(438 275)">
        <path d="M0 7l73 36 65-38-73-35z" fill="#333" />
        <path d="M0 0l73 36 65-38-73-35z" fill="#eee" />
        <path d="M20-1l52 25 44-26-52-25z" fill="none" stroke="#888"/>
        <path d="M44-1l17-10 18 9-17 10zM67 11l17-10 17 8" fill="none" stroke="#333" stroke-width="2" />
      </g>
      {#each [[82,209],[295,81],[557,213],[345,347]] as point}<ellipse cx={point[0]} cy={point[1]} rx="3" ry="1.8" fill="#aaa" />{/each}
    </g>
  </svg>
  <figcaption>
    <h2 id="instrument-title">A thought becomes something you can keep.</h2>
    <p>Explore the drawing desk. Each step highlights a part of the same example.</p>
  <div class="step-controls" aria-label="Explore the Draw workflow">
    {#each steps as step, i}<button type="button" aria-pressed={stage === i} onclick={() => stage = i}><span>0{i+1}</span>{step.title}</button>{/each}
  </div>
  <ol class="step-notes">
    {#each steps as step, i}<li class:current={stage === i}><strong>{step.title}</strong><p>{step.text}</p></li>{/each}
  </ol>
  <p class="example-boundary">Concept illustration · no live canvas, AI connection or automated action.</p>
  </figcaption>
</figure>

<style>
  .instrument{margin:0;border:1px solid #333;background:#101010;min-width:0;color:#eee}
  .figure-heading{display:flex;justify-content:space-between;gap:12px;padding:20px 24px;font:10px/1.5 var(--font-performance-mono,monospace);letter-spacing:.06em;color:#aaa}
  svg{display:block;width:100%;height:auto;max-height:380px}
  .sketch,.notes,.export,.pencil{opacity:.8;transition:opacity 240ms ease}.active{opacity:1}
  figcaption{padding:0 24px 16px}h2{font-size:22px;line-height:1.2;letter-spacing:-.03em;margin:0 0 10px}p{font-size:14px;line-height:1.5;color:#aaa;margin:0}
  .step-controls{display:flex;border-block:1px solid #333}button{flex:1;min-width:0;background:none;color:#bbb;border:0;padding:16px 12px;text-align:left;font-family:inherit;font-size:12px;line-height:1.4;cursor:pointer}button+button{border-left:1px solid #333}button span{display:block;font:10px monospace;margin-bottom:8px}button[aria-pressed=true]{color:#fff;background:#282828}button:focus-visible{outline:2px solid white;outline-offset:-4px}
  .step-notes{margin:0;padding:8px 24px 0;list-style:none}.step-notes li{padding:15px 0;border-bottom:1px solid #292929}.step-notes strong{font-size:14px;font-weight:500;color:#bbb}.step-notes .current strong{color:white}.step-notes p{margin-top:5px;font-size:13px}
  .example-boundary{padding:18px 24px;font-size:11px;color:#999}
  @media(prefers-reduced-motion:reduce){.sketch,.notes,.export,.pencil{transition:none}}
  @media(max-width:440px){.figure-heading{padding:16px;font-size:9px}figcaption,.example-boundary{padding-inline:16px}.step-notes{padding-inline:16px}button{font-size:11px;padding:13px 9px}h2{font-size:20px}}
</style>
