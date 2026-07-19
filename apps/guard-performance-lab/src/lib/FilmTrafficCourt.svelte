<script lang="ts">
  import type { FilmAnalysisRecord } from './model.js';
  import { applyFilmCorrections, resolveFilmTrafficAt } from './film.js';

  let { analysis, timeMs, wakeMs }: { analysis: FilmAnalysisRecord; timeMs: number; wakeMs: number } = $props();
  let corrected = $derived(applyFilmCorrections(analysis));
  let traffic = $derived(resolveFilmTrafficAt(corrected, timeMs, wakeMs));
  let teammateCount = $derived(traffic.players.filter((player) => player.team === 'teammate').length);
  let opponentCount = $derived(traffic.players.filter((player) => player.team === 'opponent').length);
  let targetCount = $derived(traffic.players.filter((player) => player.team === 'target').length);
  const x = (feet: number) => feet * 10;
  const y = (feet: number) => 500 - feet * 10;
  const wakePath = (segment: Array<{ court: [number, number] }>) => segment.map((sample, index) => `${index ? 'L' : 'M'} ${x(sample.court[0])} ${y(sample.court[1])}`).join(' ');
</script>

<svg id="film-traffic-court" class="traffic-court" viewBox="0 0 940 500" role="img" aria-labelledby="traffic-title traffic-desc" xmlns="http://www.w3.org/2000/svg">
  <title id="traffic-title">Player traffic at {Math.round(traffic.timeMs / 100) / 10} seconds</title>
  <desc id="traffic-desc">A top-down basketball court with {traffic.players.length} foreground-court players: {teammateCount} teammates, {opponentCount} opponents, target count {targetCount}. Opposite-court, official, and sideline detections are excluded. Number 13 is highlighted with a wake that breaks across unresolved or inactive intervals.</desc>
  <rect width="940" height="500" fill="#f8f7f1" />
  <g class="court-lines" fill="none" stroke="#171717">
    <rect x="2" y="2" width="936" height="496" stroke-width="4" />
    <path d="M470 2V498" stroke-width="3" />
    <circle cx="470" cy="250" r="60" stroke-width="3" />
    <path d="M2 60H190V440H2M938 60H750V440H938" stroke-width="3" />
    <circle cx="190" cy="250" r="60" stroke-width="3" />
    <circle cx="750" cy="250" r="60" stroke-width="3" />
    <path d="M52 220V280M888 220V280" stroke-width="6" />
    <circle cx="52" cy="250" r="7" stroke-width="4" />
    <circle cx="888" cy="250" r="7" stroke-width="4" />
    <path d="M2 20A235 235 0 0 1 2 480M938 20A235 235 0 0 0 938 480" stroke-width="3" />
  </g>
  <g class="court-guides" stroke="#cbc9c0" stroke-dasharray="5 8">
    <path d="M235 2V498M705 2V498" />
    <path d="M2 167H938M2 333H938" />
  </g>
  <g class="target-wake" fill="none" stroke="#e54800" stroke-linecap="round" stroke-linejoin="round">
    {#each traffic.targetWake as segment}
      <path d={wakePath(segment)} stroke-width="9" opacity=".18" />
      <path d={wakePath(segment)} stroke-width="3" opacity=".9" />
    {/each}
  </g>
  <g class="traffic-players">
    {#each traffic.players as player}
      <g data-team={player.team} transform={`translate(${x(player.court[0])} ${y(player.court[1])})`} class:target-token={player.team === 'target'}>
        {#if player.team === 'target'}<circle r="20" fill="none" stroke="#e54800" stroke-width="3" opacity=".35" />{/if}
        <circle r={player.team === 'target' ? 12 : 8} fill={player.team === 'target' ? '#e54800' : player.team === 'teammate' ? '#0057b8' : '#171717'} stroke="#fff" stroke-width="2" opacity={Math.max(.5, player.confidence)} />
        {#if player.team === 'target'}<text y="4" text-anchor="middle" fill="#fff" font-size="10" font-weight="700">13</text>{/if}
      </g>
    {/each}
  </g>
  <g font-family="IBM Plex Mono, monospace" font-size="10" fill="#77756d">
    <text x="12" y="20">LEFT BASELINE</text><text x="928" y="20" text-anchor="end">RIGHT BASELINE</text>
    <text x="470" y="488" text-anchor="middle">HALF COURT</text>
  </g>
</svg>
