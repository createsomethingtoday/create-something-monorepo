<script lang="ts">
  import type { FilmAnalysisRecord } from './model.js';
  import { isInterpolatedPlayer, resolveFilmTrafficAt, type CapturedFilmAnalysis, type FilmMovementMode } from './film.js';
  import {
    FULL_COURT_94X50,
    MANSFIELD_FIELDHOUSE_84X50,
    MANSFIELD_FIELDHOUSE_SOURCE_SHA256,
    courtLineDistances,
    courtToSvg,
    normalizeCourtPoint
  } from './court.js';

  // `analysis` carries the stored record (id, revision receipts). `corrected` is the same revision with
  // the correction overlay already applied by the owning surface: re-applying it here would parse the
  // whole captured revision a second time on every attach.
  let { analysis, corrected, timeMs, wakeMs, movementMode }: { analysis: FilmAnalysisRecord; corrected: CapturedFilmAnalysis; timeMs: number; wakeMs: number; movementMode: FilmMovementMode } = $props();
  let traffic = $derived(resolveFilmTrafficAt(corrected, timeMs, wakeMs, { movementMode }));
  let teammateCount = $derived(traffic.players.filter((player) => player.team === 'teammate').length);
  let opponentCount = $derived(traffic.players.filter((player) => player.team === 'opponent').length);
  let targetCount = $derived(traffic.players.filter((player) => player.team === 'target').length);
  let candidateFingerprint = $derived(analysis.analysis.fullFlowVerification?.candidateFingerprint ?? analysis.analysis.identityVerification?.candidateFingerprint);
  let migrationTrace = $derived(analysis.analysis.migrationTraceVerification);
  let courtCalibration = $derived(analysis.analysis.courtCalibrationVerification);
  let isMansfieldSource = $derived(analysis.source.sha256 === MANSFIELD_FIELDHOUSE_SOURCE_SHA256);
  let court = $derived(isMansfieldSource ? MANSFIELD_FIELDHOUSE_84X50 : FULL_COURT_94X50);
  let displayPoint = $derived((point: [number, number]) => courtCalibration || !isMansfieldSource
    ? point
    : normalizeCourtPoint(point, FULL_COURT_94X50, MANSFIELD_FIELDHOUSE_84X50));
  let currentTarget = $derived(traffic.players.find((player) => player.team === 'target'));
  let currentTargetPoint = $derived(currentTarget ? displayPoint(currentTarget.court) : undefined);
  let currentGeometry = $derived(currentTarget?.courtGeometry ?? (currentTargetPoint ? {
    nearestMarkings: courtLineDistances(currentTargetPoint, court).slice(0, 3),
    uncertaintyFeet: null
  } : undefined));
  let targetInterpolated = $derived(traffic.players.some((player) => player.team === 'target' && isInterpolatedPlayer(player)));
  const scale = 10;
  const x = (feet: number) => courtToSvg([feet, 0], scale, court)[0];
  const y = (feet: number) => courtToSvg([0, feet], scale, court)[1];
  let courtWidth = $derived(court.length * scale);
  let courtHeight = $derived(court.width * scale);
  let laneY = $derived(y((court.width + court.laneWidth) / 2));
  let laneHeight = $derived(court.laneWidth * scale);
  let laneDepth = $derived(court.laneDepth * scale);
  let leftHoopX = $derived(court.hoopFromBaseline * scale);
  let rightHoopX = $derived((court.length - court.hoopFromBaseline) * scale);
  let threeRadius = $derived(court.threePointRadius * scale);
  let threeEndpointOffset = $derived(Math.sqrt(threeRadius ** 2 - leftHoopX ** 2));
  let threeTop = $derived(court.width * scale / 2 - threeEndpointOffset);
  let threeBottom = $derived(court.width * scale / 2 + threeEndpointOffset);
  const wakePath = (segment: Array<{ court: [number, number] }>) => segment.map((sample, index) => {
    const point = displayPoint(sample.court);
    return `${index ? 'L' : 'M'} ${x(point[0])} ${y(point[1])}`;
  }).join(' ');
  const contextOpacity = (points: Array<{ timeMs: number }>) => {
    const ageMs = Math.max(0, traffic.timeMs - (points.at(-1)?.timeMs ?? traffic.timeMs));
    const historyMs = Math.max(1, Math.min(wakeMs, traffic.timeMs || wakeMs));
    return Math.round((0.14 + 0.38 * (1 - Math.min(1, ageMs / historyMs))) * 100) / 100;
  };
</script>

<svg
  id="film-traffic-court"
  class="traffic-court"
  viewBox={`0 0 ${courtWidth} ${courtHeight}`}
  role="img"
  aria-labelledby="traffic-title traffic-desc"
  xmlns="http://www.w3.org/2000/svg"
  data-source-sha256={analysis.source.sha256}
  data-analysis-id={analysis.id}
  data-analysis-revision={analysis.analysis.revision}
  data-candidate-fingerprint={candidateFingerprint}
  data-migration-profile={migrationTrace?.profile}
  data-active-visible-coverage={migrationTrace?.coverage}
  data-path-segment-count={migrationTrace?.pathSegmentCount}
  data-longest-unresolved-gap-ms={migrationTrace?.longestUnresolvedGapMs}
  data-participation-sha256={migrationTrace?.participationSha256}
  data-migration-candidate-sha256={migrationTrace?.candidateSha256}
  data-full-flow-receipt-sha256={migrationTrace?.fullFlowReceiptSha256}
  data-court-profile={court.profile}
  data-court-calibration-method={courtCalibration?.method}
  data-court-calibration-p95-feet={courtCalibration?.maximumStateP95ErrorFeet}
  data-coordinate-basis={courtCalibration ? 'source-calibrated' : isMansfieldSource ? 'dimension-normalized-estimate' : 'legacy-estimate'}
>
  <title id="traffic-title">Player traffic at {Math.round(traffic.timeMs / 100) / 10} seconds / {traffic.currentPlayState}</title>
  <desc id="traffic-desc">A top-down basketball court with {traffic.players.length} foreground-court players: {teammateCount} teammates, {opponentCount} opponents, target count {targetCount}. The current play state is {traffic.currentPlayState}. Orange wake includes verified live basketball only. {movementMode === 'all-captured' ? 'Gray wake preserves non-live and unknown captured movement.' : 'Non-live and unknown movement is hidden from the wake.'} {targetInterpolated ? 'The #13 token sits between two captured frames, so its position is interpolated and drawn with a dashed ring instead of a solid one.' : 'The #13 token sits on a captured frame.'}</desc>
  <rect width={courtWidth} height={courtHeight} fill="#f8f7f1" />
  <g class="court-lines" fill="none" stroke="#171717">
    <rect x="2" y="2" width={courtWidth - 4} height={courtHeight - 4} stroke-width="4" />
    <path d={`M${courtWidth / 2} 2V${courtHeight - 2}`} stroke-width="3" />
    <circle cx={courtWidth / 2} cy={courtHeight / 2} r={court.centerCircleRadius * scale} stroke-width="3" />
    <rect x="2" y={laneY} width={laneDepth - 2} height={laneHeight} stroke-width="3" />
    <rect x={court.length * scale - laneDepth} y={laneY} width={laneDepth - 2} height={laneHeight} stroke-width="3" />
    <circle cx={court.laneDepth * scale} cy={courtHeight / 2} r={court.freeThrowCircleRadius * scale} stroke-width="3" />
    <circle cx={(court.length - court.laneDepth) * scale} cy={courtHeight / 2} r={court.freeThrowCircleRadius * scale} stroke-width="3" />
    <path d={`M40 ${courtHeight / 2 - 30}V${courtHeight / 2 + 30}M${courtWidth - 40} ${courtHeight / 2 - 30}V${courtHeight / 2 + 30}`} stroke-width="6" />
    <circle cx={leftHoopX} cy={courtHeight / 2} r="7" stroke-width="4" />
    <circle cx={rightHoopX} cy={courtHeight / 2} r="7" stroke-width="4" />
    <path d={`M${leftHoopX} 210A40 40 0 0 1 ${leftHoopX} 290M${rightHoopX} 210A40 40 0 0 0 ${rightHoopX} 290`} stroke-width="2" />
    <path d={`M0 ${threeTop}A${threeRadius} ${threeRadius} 0 0 1 0 ${threeBottom}M${courtWidth} ${threeTop}A${threeRadius} ${threeRadius} 0 0 0 ${courtWidth} ${threeBottom}`} stroke-width="3" />
  </g>
  <g class="court-guides" stroke="#cbc9c0" stroke-dasharray="5 8">
    <path d={`M${courtWidth / 4} 2V${courtHeight - 2}M${courtWidth * 3 / 4} 2V${courtHeight - 2}`} />
    <path d={`M2 ${courtHeight / 3}H${courtWidth - 2}M2 ${courtHeight * 2 / 3}H${courtWidth - 2}`} />
  </g>
  {#if currentTargetPoint && currentGeometry}
    <g class="geometry-readout" transform={`translate(${Math.min(courtWidth - 210, x(currentTargetPoint[0]) + 22)} ${Math.max(26, y(currentTargetPoint[1]) - 22)})`}>
      <rect x="0" y="-18" width="196" height="42" rx="3" fill="#f8f7f1" stroke="#e54800" opacity=".94" />
      <text x="8" y="-3" font-family="IBM Plex Mono, monospace" font-size="10" fill="#171717">{currentGeometry.nearestMarkings[0]?.label}</text>
      <text x="8" y="13" font-family="IBM Plex Mono, monospace" font-size="11" font-weight="700" fill="#e54800">{currentGeometry.nearestMarkings[0]?.distanceFeet.toFixed(1)} FT · {currentGeometry.uncertaintyFeet === null ? 'ESTIMATE' : `±${currentGeometry.uncertaintyFeet.toFixed(1)} FT`}</text>
    </g>
  {/if}
  <g class="target-wake" fill="none" stroke="#e54800" stroke-linecap="round" stroke-linejoin="round">
    {#each traffic.targetWake as segment}
      <path d={wakePath(segment)} stroke-width="9" opacity=".18" />
      <path d={wakePath(segment)} stroke-width="3" opacity=".9" />
    {/each}
  </g>
  <g class="context-wake" fill="none" stroke="#77756d" stroke-linecap="round" stroke-linejoin="round">
    {#each traffic.contextWake as segment}
      <path data-play-state={segment.playState} data-start-ms={segment.points[0]?.timeMs} data-end-ms={segment.points.at(-1)?.timeMs} d={wakePath(segment.points)} stroke-width="7" stroke-dasharray="6 7" opacity={contextOpacity(segment.points)} />
      {#if segment.points.at(-1)}<circle cx={x(displayPoint(segment.points.at(-1)!.court)[0])} cy={y(displayPoint(segment.points.at(-1)!.court)[1])} r="5" fill="#77756d" opacity={contextOpacity(segment.points)} />{/if}
    {/each}
  </g>
  <g class="traffic-players">
    {#each traffic.players as player}
      <g data-team={player.team} data-interpolated={isInterpolatedPlayer(player) ? 'true' : undefined} transform={`translate(${x(displayPoint(player.court)[0])} ${y(displayPoint(player.court)[1])})`} class:target-token={player.team === 'target'}>
        {#if player.team === 'target'}<circle r="20" fill="none" stroke="#e54800" stroke-width="3" stroke-dasharray={isInterpolatedPlayer(player) ? '4 5' : undefined} opacity=".35" />{/if}
        <circle r={player.team === 'target' ? 12 : 8} fill={player.team === 'target' ? '#e54800' : player.team === 'teammate' ? '#0057b8' : '#171717'} stroke="#fff" stroke-width="2" opacity={Math.max(.5, player.confidence)} />
        {#if player.team === 'target'}<text y="4" text-anchor="middle" fill="#fff" font-size="10" font-weight="700">13</text>{/if}
      </g>
    {/each}
  </g>
  <g font-family="IBM Plex Mono, monospace" font-size="10" fill="#77756d">
    <text x="12" y="20">LEFT BASELINE</text><text x={courtWidth - 12} y="20" text-anchor="end">RIGHT BASELINE</text>
    <text x={courtWidth / 2} y={courtHeight - 12} text-anchor="middle">HALF COURT · {court.length} × {court.width} FT</text>
  </g>
</svg>
