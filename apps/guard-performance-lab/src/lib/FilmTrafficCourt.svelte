<script lang="ts">
  import { isInterpolatedPlayer, resolveFilmTrafficAt, type CapturedFilmAnalysis, type FilmMovementMode } from './film.js';
  import { FULL_COURT_94X50, courtToSvg } from './court.js';

  // `analysis` is already correction-applied by the owning surface. Re-applying here would parse the
  // whole captured revision twice on every attach.
  let { analysis, timeMs, wakeMs, movementMode }: { analysis: CapturedFilmAnalysis; timeMs: number; wakeMs: number; movementMode: FilmMovementMode } = $props();
  let traffic = $derived(resolveFilmTrafficAt(analysis, timeMs, wakeMs, { movementMode }));
  let teammateCount = $derived(traffic.players.filter((player) => player.team === 'teammate').length);
  let opponentCount = $derived(traffic.players.filter((player) => player.team === 'opponent').length);
  let targetCount = $derived(traffic.players.filter((player) => player.team === 'target').length);
  let targetInterpolated = $derived(traffic.players.some((player) => player.team === 'target' && isInterpolatedPlayer(player)));
  const scale = 10;
  const x = (feet: number) => courtToSvg([feet, 0], scale)[0];
  const y = (feet: number) => courtToSvg([0, feet], scale)[1];
  const laneY = y((FULL_COURT_94X50.width + FULL_COURT_94X50.laneWidth) / 2);
  const laneHeight = FULL_COURT_94X50.laneWidth * scale;
  const laneDepth = FULL_COURT_94X50.laneDepth * scale;
  const leftHoopX = FULL_COURT_94X50.hoopFromBaseline * scale;
  const rightHoopX = (FULL_COURT_94X50.length - FULL_COURT_94X50.hoopFromBaseline) * scale;
  const threeRadius = FULL_COURT_94X50.threePointRadius * scale;
  const threeEndpointOffset = Math.sqrt(threeRadius ** 2 - leftHoopX ** 2);
  const threeTop = FULL_COURT_94X50.width * scale / 2 - threeEndpointOffset;
  const threeBottom = FULL_COURT_94X50.width * scale / 2 + threeEndpointOffset;
  const wakePath = (segment: Array<{ court: [number, number] }>) => segment.map((sample, index) => `${index ? 'L' : 'M'} ${x(sample.court[0])} ${y(sample.court[1])}`).join(' ');
</script>

<svg id="film-traffic-court" class="traffic-court" viewBox="0 0 940 500" role="img" aria-labelledby="traffic-title traffic-desc" xmlns="http://www.w3.org/2000/svg">
  <title id="traffic-title">Player traffic at {Math.round(traffic.timeMs / 100) / 10} seconds / {traffic.currentPlayState}</title>
  <desc id="traffic-desc">A top-down basketball court with {traffic.players.length} foreground-court players: {teammateCount} teammates, {opponentCount} opponents, target count {targetCount}. The current play state is {traffic.currentPlayState}. Orange wake includes verified live basketball only. {movementMode === 'all-captured' ? 'Gray wake preserves non-live and unknown captured movement.' : 'Non-live and unknown movement is hidden from the wake.'} {targetInterpolated ? 'The #13 token sits between two captured frames, so its position is interpolated and drawn with a dashed ring instead of a solid one.' : 'The #13 token sits on a captured frame.'}</desc>
  <rect width="940" height="500" fill="#f8f7f1" />
  <g class="court-lines" fill="none" stroke="#171717">
    <rect x="2" y="2" width="936" height="496" stroke-width="4" />
    <path d="M470 2V498" stroke-width="3" />
    <circle cx="470" cy="250" r="60" stroke-width="3" />
    <rect x="2" y={laneY} width={laneDepth - 2} height={laneHeight} stroke-width="3" />
    <rect x={FULL_COURT_94X50.length * scale - laneDepth} y={laneY} width={laneDepth - 2} height={laneHeight} stroke-width="3" />
    <circle cx="190" cy="250" r="60" stroke-width="3" />
    <circle cx="750" cy="250" r="60" stroke-width="3" />
    <path d="M40 220V280M900 220V280" stroke-width="6" />
    <circle cx={leftHoopX} cy="250" r="7" stroke-width="4" />
    <circle cx={rightHoopX} cy="250" r="7" stroke-width="4" />
    <path d={`M${leftHoopX} 210A40 40 0 0 1 ${leftHoopX} 290M${rightHoopX} 210A40 40 0 0 0 ${rightHoopX} 290`} stroke-width="2" />
    <path d={`M0 ${threeTop}A${threeRadius} ${threeRadius} 0 0 1 0 ${threeBottom}M940 ${threeTop}A${threeRadius} ${threeRadius} 0 0 0 940 ${threeBottom}`} stroke-width="3" />
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
  <g class="context-wake" fill="none" stroke="#77756d" stroke-linecap="round" stroke-linejoin="round">
    {#each traffic.contextWake as segment}
      <path data-play-state={segment.playState} d={wakePath(segment.points)} stroke-width="7" stroke-dasharray="6 7" opacity=".28" />
    {/each}
  </g>
  <g class="traffic-players">
    {#each traffic.players as player}
      <g data-team={player.team} data-interpolated={isInterpolatedPlayer(player) ? 'true' : undefined} transform={`translate(${x(player.court[0])} ${y(player.court[1])})`} class:target-token={player.team === 'target'}>
        {#if player.team === 'target'}<circle r="20" fill="none" stroke="#e54800" stroke-width="3" stroke-dasharray={isInterpolatedPlayer(player) ? '4 5' : undefined} opacity=".35" />{/if}
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
