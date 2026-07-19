<script lang="ts">
  import { onMount } from 'svelte';
  import type { PageData } from './$types';
  import { glossary, progressionPhases, sessionBlocks } from '$lib/data.js';
  import type { GuideOutput } from '$lib/guide.js';
  import type { WorkspaceCommand } from '$lib/workspace-api.js';
  import FilmTrafficCourt from '$lib/FilmTrafficCourt.svelte';
  import { applyFilmCorrections, resolveFilmTrafficAt } from '$lib/film.js';
  import {
    createInitialState,
    artifactsForSelected,
    engagementsForSelected,
    emptyReceipt,
    receiptsForSelected,
    validateReceipt,
    validateArtifact,
    type EvidenceDraft,
    type EvidenceSignal,
    type EvidenceValue,
    type LabState,
    type PlayerProfile,
    type ProgramStage,
    type ReceiptDraft
  } from '$lib/model.js';

  let { data }: { data: PageData } = $props();

  type View = 'dashboard' | 'film' | 'guide' | 'plan' | 'language' | 'reads' | 'receipt' | 'progress' | 'players';
  const views: { key: View; label: string }[] = [
    { key: 'dashboard', label: 'Today' }, { key: 'film', label: 'Film trace' }, { key: 'guide', label: 'Agent + evidence' }, { key: 'plan', label: 'Session plan' },
    { key: 'language', label: 'Shared language' }, { key: 'reads', label: 'Court reads' },
    { key: 'receipt', label: 'Receipt' }, { key: 'progress', label: 'Progression' },
    { key: 'players', label: 'Players + data' }
  ];
  const evidenceLabels: Record<EvidenceSignal, string> = { scan: 'Scan', angle: 'Angle + pace', security: 'Ball security', finish: 'Finish / stop', explain: 'Read + explain' };
  const readAnswers = {
    none: ['No help', 'Finish from balance. The rim is the first answer.'],
    nail: ['Nail help', 'Stop for touch or move the ball before the helper owns your body.'],
    low: ['Low man commits', 'Find the corner, dunker, or space the low man left.']
  } as const;

  let view = $state<View>('dashboard');
  let labState = $state<LabState>(createInitialState());
  let draft = $state<ReceiptDraft>(emptyReceipt());
  let errors = $state<string[]>([]);
  let saved = $state(false);
  let syncError = $state('');
  let search = $state('');
  let termPhase = $state<'all' | 'now' | 'next' | 'later'>('all');
  let activeRead = $state<keyof typeof readAnswers>('none');
  let playerName = $state('Player 01');
  let newPlayerAge = $state<number | null>(12);
  let newPlayerGender = $state<PlayerProfile['gender'] | ''>('male');
  let newPlayerPosition = $state<PlayerProfile['primaryPosition'] | ''>('guard');
  let profileAge = $state<number | null>(null);
  let profileGender = $state<PlayerProfile['gender'] | ''>('');
  let profilePosition = $state<PlayerProfile['primaryPosition'] | ''>('');
  let profilePreferredName = $state('');
  let profileDominantHand = $state<PlayerProfile['dominantHand'] | ''>('');
  let profileHeight = $state('');
  let profileGoals = $state('');
  let profileExperience = $state('');
  let profileJurisdiction = $state('');
  let profileNotes = $state('');
  let profileSaved = $state(false);
  let resetArmed = $state(false);
  let hydrated = $state(false);
  let commandBusy = $state(false);
  let guideStage = $state<ProgramStage>('prepare');
  let coachObservation = $state('');
  let energy = $state<'low' | 'ready' | 'high'>('ready');
  let painSignal = $state(false);
  let guideOutput = $state<GuideOutput | null>(null);
  let engagementStatus = $state<'planned' | 'active' | 'paused' | 'completed'>('active');
  let engagementNote = $state('');
  let artifactErrors = $state<string[]>([]);
  let artifactDraft = $state<EvidenceDraft>({ kind: 'coach-observation', title: '', sourceLabel: 'Coach', sourceUrl: '', level: 'youth', jurisdiction: '', observation: '' });
  let filmTimeMs = $state(0);
  let filmWakeMs = $state(5000);
  let correctionX = $state(47);
  let correctionY = $state(25);
  let correctionStatus = $state<'resolved' | 'unresolved' | 'out-of-frame'>('resolved');
  let correctionReason = $state('');
  let correctionSaved = $state(false);
  let operator = $derived(data.guardAccess.scope?.role === 'operator');

  let player = $derived(labState.players.find((item) => item.id === labState.selectedPlayerId) ?? labState.players[0]);
  let receipts = $derived(receiptsForSelected(labState));
  let artifacts = $derived(artifactsForSelected(labState));
  let engagements = $derived(engagementsForSelected(labState));
  let activeFilm = $derived(labState.filmAnalyses.find((analysis) => analysis.playerId === labState.selectedPlayerId));
  let correctedFilm = $derived(activeFilm ? applyFilmCorrections(activeFilm) : null);
  let filmTraffic = $derived(correctedFilm ? resolveFilmTrafficAt(correctedFilm, filmTimeMs, filmWakeMs) : null);
  let filteredTerms = $derived(glossary.filter(([term, meaning, phase]) => {
    const matchesPhase = termPhase === 'all' || phase === termPhase;
    const needle = search.trim().toLowerCase();
    return matchesPhase && (!needle || `${term} ${meaning}`.toLowerCase().includes(needle));
  }));

  $effect(() => {
    const profile = player?.profile;
    if (!profile) return;
    profileAge = profile.age;
    profileGender = profile.gender ?? '';
    profilePosition = profile.primaryPosition ?? '';
    profilePreferredName = profile.preferredName;
    profileDominantHand = profile.dominantHand ?? '';
    profileHeight = profile.height;
    profileGoals = profile.goals;
    profileExperience = profile.experienceLevel;
    profileJurisdiction = profile.jurisdiction;
    profileNotes = profile.notes;
    profileSaved = false;
  });

  onMount(async () => {
    try {
      const response = await fetch('/api/workspace');
      const body = await response.json() as { ok?: boolean; workspace?: LabState; error?: string };
      if (!response.ok || !body.ok || !body.workspace) throw new Error(body.error ?? 'The private workspace could not be loaded.');
      labState = body.workspace;
    } catch (error) { syncError = error instanceof Error ? error.message : 'The private workspace could not be loaded.'; }
    hydrated = true;
  });

  async function runCommand(command: WorkspaceCommand) {
    syncError = '';
    commandBusy = true;
    try {
      const response = await fetch('/api/workspace/command', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(command) });
      const body = await response.json();
      if (!response.ok || !body.ok) throw new Error(body.error ?? 'The local datastore did not accept the update.');
      labState = body.workspace;
      return true;
    } catch (error) {
      syncError = error instanceof Error ? error.message : 'The local datastore could not be reached.';
      return false;
    } finally { commandBusy = false; }
  }

  async function selectPlayer(id: string) {
    await runCommand({ action: 'select-player', playerId: id });
    errors = [];
    saved = false;
  }

  async function addPlayer() {
    if (!playerName.trim()) return;
    if (!await runCommand({
      action: 'create-player',
      name: playerName,
      profile: { age: newPlayerAge, gender: newPlayerGender || null, primaryPosition: newPlayerPosition || null }
    })) return;
    view = 'players';
  }

  async function savePlayerProfile() {
    if (!player) return;
    profileSaved = false;
    if (!await runCommand({
      action: 'update-player-profile',
      playerId: player.id,
      profile: {
        age: profileAge,
        gender: profileGender || null,
        primaryPosition: profilePosition || null,
        preferredName: profilePreferredName,
        dominantHand: profileDominantHand || null,
        height: profileHeight,
        goals: profileGoals,
        experienceLevel: profileExperience,
        jurisdiction: profileJurisdiction,
        notes: profileNotes
      }
    })) return;
    profileSaved = true;
  }

  async function submitReceipt() {
    errors = validateReceipt(draft);
    saved = false;
    if (errors.length) return;
    if (!await runCommand({ action: 'save-receipt', playerId: labState.selectedPlayerId, receipt: draft })) return;
    saved = true;
    draft = emptyReceipt(draft.date);
  }

  function setEvidence(signal: EvidenceSignal, value: EvidenceValue) {
    draft.evidence[signal] = value;
  }

  async function askGuide() {
    syncError = '';
    try {
      const response = await fetch('/api/guide', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ stage: guideStage, observation: coachObservation, energy, painSignal, artifacts }) });
      const body = await response.json();
      if (!response.ok || !body.ok) throw new Error(body.error ?? 'The program could not prepare the next interaction.');
      guideOutput = body.output;
    } catch (error) { syncError = error instanceof Error ? error.message : 'The program guidance endpoint could not be reached.'; }
  }

  async function addArtifact() {
    artifactErrors = validateArtifact(artifactDraft);
    if (artifactErrors.length) return;
    if (!await runCommand({ action: 'register-evidence', playerId: labState.selectedPlayerId, evidence: artifactDraft })) return;
    artifactDraft = { kind: 'coach-observation', title: '', sourceLabel: 'Coach', sourceUrl: '', level: 'youth', jurisdiction: '', observation: '' };
    await askGuide();
  }

  async function recordEngagement() {
    if (!engagementNote.trim()) { syncError = 'Add one observable interaction note before recording engagement.'; return; }
    if (!await runCommand({ action: 'record-engagement', playerId: labState.selectedPlayerId, engagement: { stage: guideStage, status: engagementStatus, source: 'coach', note: engagementNote } })) return;
    engagementNote = '';
  }

  async function resetData() {
    if (!resetArmed) { resetArmed = true; return; }
    commandBusy = true;
    try {
      const response = await fetch('/api/workspace', { method: 'DELETE', headers: { 'x-guard-lab-confirm': 'reset' } });
      const body = await response.json();
      if (!response.ok || !body.ok) throw new Error(body.error ?? 'Reset failed.');
      labState = body.workspace;
      draft = emptyReceipt();
      resetArmed = false;
      view = 'dashboard';
    } catch (error) { syncError = error instanceof Error ? error.message : 'Reset failed.'; }
    finally { commandBusy = false; }
  }

  function formatFilmTime(value: number) {
    const total = Math.max(0, Math.floor(value / 1000));
    return `${Math.floor(total / 60).toString().padStart(2, '0')}:${(total % 60).toString().padStart(2, '0')}`;
  }

  function seekFilm(deltaMs: number) {
    if (!activeFilm) return;
    filmTimeMs = Math.max(0, Math.min(activeFilm.frames.at(-1)?.timeMs ?? 0, filmTimeMs + deltaMs));
  }

  function downloadFilm(name: string, type: string, contents: string) {
    const url = URL.createObjectURL(new Blob([contents], { type }));
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = name; anchor.click();
    URL.revokeObjectURL(url);
  }

  function exportFilmJson() {
    if (!activeFilm) return;
    downloadFilm(`player-13-trace-r${activeFilm.analysis.revision}.json`, 'application/json', JSON.stringify(activeFilm, null, 2));
  }

  function exportFilmSvg() {
    const svg = document.getElementById('film-traffic-court');
    if (svg) downloadFilm(`player-13-trace-${filmTimeMs}ms.svg`, 'image/svg+xml', svg.outerHTML);
  }

  async function saveFilmCorrection() {
    if (!activeFilm || !correctionReason.trim()) { syncError = 'Add direct correction evidence before saving.'; return; }
    correctionSaved = false;
    const court = correctionStatus === 'resolved' ? [correctionX, correctionY] as [number, number] : null;
    if (!await runCommand({ action: 'correct-film-analysis', playerId: labState.selectedPlayerId, analysisId: activeFilm.id, correction: { timeMs: filmTimeMs, court, targetStatus: correctionStatus, reason: correctionReason } })) return;
    correctionReason = '';
    correctionSaved = true;
  }
</script>

<svelte:head>
  <title>Guard Performance Lab</title>
  <meta name="description" content="A private-first coaching system for guard development, shared reads, session receipts, and progression." />
</svelte:head>

<a class="skip-link" href="#main-content">Skip to lab content</a>
<div class="shell property-performance" aria-busy={commandBusy}>
  <header class="topbar">
    <div class="brand"><span>GUARD PERFORMANCE LAB</span><small class="mono">FIELD TEST 01</small></div>
    <div class="privacy">PRIVATE / REV {labState.revision}</div>
    <div class="player-select">
      {#if operator}
        <label for="player">Active player</label>
        <select id="player" value={labState.selectedPlayerId} onchange={(event) => selectPlayer(event.currentTarget.value)}>
          {#each labState.players as item}<option value={item.id}>{item.name}</option>{/each}
        </select>
      {:else}
        <span class="assigned-player"><small>Assigned player</small><strong>{player?.name}</strong></span>
      {/if}
      <a class="sign-out" href="/api/auth/logout">Sign out</a>
    </div>
  </header>

  <nav class="nav" aria-label="Lab sections">
    {#each views as item}
      <button aria-current={view === item.key ? 'page' : undefined} onclick={() => view = item.key}>{item.label}</button>
    {/each}
  </nav>

  {#if syncError}<div class="errors sync-error" role="alert"><strong>Workspace save needs attention.</strong> {syncError} Retry after the authenticated server connection is restored.</div>{/if}

  <main class="main" id="main-content" tabindex="-1">
    {#if view === 'dashboard'}
      <section class="hero" aria-labelledby="hero-title">
        <div class="hero-copy">
          <p class="eyebrow">Session 01 / {player?.name}</p>
          <h1 id="hero-title">Create the first advantage.</h1>
          <p class="lede">See it early. Create an angle. Read the help. Leave balanced.</p>
        </div>
        <div class="hero-rail" aria-label="Session metrics">
          <div class="metric" style="--tone: var(--color-performance-signal)"><strong>10:00</strong><span>Player arrival</span></div>
          <div class="metric" style="--tone: var(--color-performance-pressure)"><strong>10:30</strong><span>Coach + player</span></div>
          <div class="metric" style="--tone: var(--color-performance-growth)"><strong>60</strong><span>Working minutes</span></div>
          <div class="metric" style="--tone: var(--color-performance-gold)"><strong>1</strong><span>Primary read</span></div>
        </div>
      </section>
      <div class="callout"><strong>Sunday is calibration, not a tryout.</strong><span>The win is shared language and one repeatable decision pattern—not the number of drills completed.</span></div>
      <div class="status-strip" aria-label="Current program status">
        <div><span class="mono">Program stage</span><strong>{engagements[0]?.stage ?? 'prepare'}</strong></div>
        <div><span class="mono">Engagement</span><strong>{engagements[0]?.status ?? 'not recorded'}</strong></div>
        <div><span class="mono">Evidence links</span><strong>{artifacts.filter((artifact) => artifact.sourceUrl).length}</strong></div>
        <div><span class="mono">Workspace revision</span><strong>{labState.revision}</strong></div>
      </div>
      <div class="section-head"><h2>Today’s control path</h2><p>Start with autonomy, add one picture, then record only what was observable.</p></div>
      <div class="grid">
        <article class="card" style="--accent: var(--color-performance-signal)"><span class="label">Prepare</span><strong>His game first</strong><p>Let the independent window show what he values before coaching begins.</p></article>
        <article class="card" style="--accent: var(--color-performance-pressure)"><span class="label">Primary loop</span><strong>Scan → angle → help</strong><p>Misdirection belongs before the advantage; decision-making belongs after it.</p></article>
        <article class="card" style="--accent: var(--color-performance-growth)"><span class="label">Close</span><strong>Strength → next focus</strong><p>Capture player words and a narrow next decision without a talent verdict.</p></article>
      </div>
      <div class="section-head"><h2>Current evidence</h2><p>{receipts.length ? `${receipts.length} saved receipt${receipts.length === 1 ? '' : 's'} for this player.` : 'No receipt yet. The baseline stays open until the session is observed.'}</p></div>
      {#if receipts[0]}
        <article class="receipt"><time>{receipts[0].date}</time><div><strong>{receipts[0].strength}</strong><p>Observable strength</p></div><div><strong>{receipts[0].nextFocus}</strong><p>Next focus</p></div></article>
      {:else}<div class="empty">Complete the session receipt after the workout—not before it.</div>{/if}

    {:else if view === 'film'}
      <div class="section-head"><h2>Player traffic / #13</h2><p>The video was analyzed once. This canvas replays the captured revision; scrubbing, correction, reload, and export do not run inference.</p></div>
      {#if activeFilm && filmTraffic}
        <section class="film-status" aria-label="Captured film status">
          <div><span class="mono">Analysis</span><strong>{activeFilm.analysis.executionCount}x / captured</strong></div>
          <div><span class="mono">Revision</span><strong>{activeFilm.analysis.revision}</strong></div>
          <div><span class="mono">Time</span><strong>{formatFilmTime(filmTraffic.timeMs)}</strong></div>
          <div><span class="mono">Traffic</span><strong>{filmTraffic.players.length} tokens</strong></div>
          <div><span class="mono">Target</span><strong>{activeFilm.frames.findLast((frame) => frame.timeMs <= filmTimeMs)?.targetStatus ?? 'out-of-frame'}</strong></div>
        </section>
        <div class="film-stage">
          <FilmTrafficCourt analysis={activeFilm} timeMs={filmTimeMs} wakeMs={filmWakeMs} />
          <aside class="film-legend">
            <p class="eyebrow">Traffic key</p>
            <div><i class="traffic-dot target"></i><span>Player #13 + wake</span></div>
            <div><i class="traffic-dot teammate"></i><span>Captured teammate</span></div>
            <div><i class="traffic-dot opponent"></i><span>Captured opponent</span></div>
            <p>Unresolved intervals break the orange wake. Faded tokens have lower detector or projection confidence.</p>
            <dl><dt>Source</dt><dd>{activeFilm.source.sha256.slice(0, 12)}…</dd><dt>Frames</dt><dd>{activeFilm.frames.length}</dd><dt>Corrections</dt><dd>{activeFilm.corrections.length}</dd></dl>
          </aside>
        </div>
        <section class="film-controls" aria-label="Film traffic controls">
          <div class="film-seek-row"><button class="button" onclick={() => seekFilm(-5000)}>− 5 sec</button><output aria-live="polite">{formatFilmTime(filmTimeMs)}</output><button class="button" onclick={() => seekFilm(5000)}>+ 5 sec</button></div>
          <label class="field full"><span>Traffic time / scrub in either direction</span><input aria-label="Film traffic time" type="range" min="0" max={activeFilm.frames.at(-1)?.timeMs ?? 0} step="500" bind:value={filmTimeMs} /></label>
          <label class="field"><span>#13 wake</span><select class="input" bind:value={filmWakeMs}><option value={3000}>3 seconds</option><option value={5000}>5 seconds</option><option value={10000}>10 seconds</option><option value={20000}>20 seconds</option></select></label>
          <div class="film-export"><button class="button" onclick={exportFilmJson}>Export captured JSON</button><button class="button" onclick={exportFilmSvg}>Export canvas SVG</button></div>
        </section>
        {#if operator}
          <section class="film-correction">
            <div><p class="eyebrow">Correction overlay</p><h3>Correct evidence, never rerun the film.</h3><p>The raw revision stays captured. This append-only note changes the rendered sample and records why.</p></div>
            <div class="film-correction-form">
              <label class="field"><span>Status</span><select class="input" bind:value={correctionStatus}><option value="resolved">Resolved</option><option value="unresolved">Unresolved</option><option value="out-of-frame">Out of frame</option></select></label>
              <label class="field"><span>Court X / feet</span><input class="input" type="number" min="0" max="94" step="0.5" bind:value={correctionX} disabled={correctionStatus !== 'resolved'} /></label>
              <label class="field"><span>Court Y / feet</span><input class="input" type="number" min="0" max="50" step="0.5" bind:value={correctionY} disabled={correctionStatus !== 'resolved'} /></label>
              <label class="field full"><span>Direct evidence</span><input class="input" bind:value={correctionReason} placeholder="Example: both feet verified against the near lane mark" /></label>
              <div class="actions"><button class="button primary" disabled={commandBusy} onclick={saveFilmCorrection}>Save correction at {formatFilmTime(filmTimeMs)}</button>{#if correctionSaved}<span class="success">CORRECTION SAVED / ANALYSIS STILL 1x</span>{/if}</div>
            </div>
          </section>
        {/if}
      {:else}
        <div class="empty"><strong>No captured trace for {player?.name}.</strong><br />An operator must attach a completed one-run analysis revision before this view can replay traffic.</div>
      {/if}

    {:else if view === 'guide'}
      <div class="section-head"><h2>Agent-guided interaction</h2><p>The program owns the sequence. Add only the live context it requests; the coach is not the narrator or personality.</p></div>
      <div class="court-layout">
        <section class="profile-box">
          <div class="form-grid">
            <div class="field"><label for="guide-stage">Program stage</label><select class="input" id="guide-stage" bind:value={guideStage}>{#each ['prepare','connect','baseline','advantage','help','misdirection','live','receipt'] as stage}<option value={stage}>{stage}</option>{/each}</select></div>
            <div class="field"><label for="energy">Observed energy</label><select class="input" id="energy" bind:value={energy}><option value="low">Low</option><option value="ready">Ready</option><option value="high">High / reduce volume</option></select></div>
            <div class="field full"><label for="coach-context">Requested coach context</label><textarea class="input" id="coach-context" bind:value={coachObservation} placeholder="One direct observation, not a diagnosis or verdict"></textarea></div>
            <label class="radio full"><input type="checkbox" bind:checked={painSignal} /> Pain or stop signal reported</label>
            <div class="actions"><button class="button primary" disabled={commandBusy} onclick={askGuide}>Ask program for next interaction</button></div>
          </div>
        </section>
        <section class="read-panel" aria-live="polite">
          <p class="eyebrow">Program / next interaction</p>
          {#if guideOutput}
            <span class="pill">{guideOutput.status}</span><h2>{guideOutput.headline}</h2><p>{guideOutput.instruction}</p>
            <div class="answer"><strong>Context requested:</strong> {guideOutput.requestedContext}<br/><br/><strong>Receipt cue:</strong> {guideOutput.receiptCue}</div>
          {:else}<h2>Context before correction.</h2><p>Choose the current stage and ask the program what it needs next.</p>{/if}
        </section>
      </div>

      <section class="engagement-box" aria-labelledby="engagement-title">
        <div><p class="eyebrow">Engagement receipt</p><h3 id="engagement-title">Record the interaction, not a personality.</h3><p>One observable note lets Codex and the player resume from shared evidence.</p></div>
        <div class="engagement-controls">
          <label class="field"><span>Interaction status</span><select class="input" bind:value={engagementStatus}><option value="planned">Planned</option><option value="active">Active</option><option value="paused">Paused</option><option value="completed">Completed</option></select></label>
          <label class="field wide"><span>Observable interaction note</span><input class="input" bind:value={engagementNote} placeholder="Example: asked for the nail read before the next rep" /></label>
          <button class="button primary" disabled={commandBusy} onclick={recordEngagement}>Record interaction</button>
        </div>
        {#if engagements[0]}<div class="latest-engagement"><span class="pill">{engagements[0].status}</span><strong>{engagements[0].stage}</strong><p>{engagements[0].note}</p><time>{new Date(engagements[0].recordedAt).toLocaleString()}</time></div>{/if}
      </section>

      <div class="section-head"><h2>Evidence workspace</h2><p>Bring official stat links, state-specific film links, rules, and coach observations. The agent keeps sourced observation separate from inference.</p></div>
      {#if artifactErrors.length}<div class="errors" role="alert"><ul>{#each artifactErrors as error}<li>{error}</li>{/each}</ul></div>{/if}
      <section class="profile-box">
        <div class="form-grid">
          <div class="field"><label for="artifact-kind">Artifact type</label><select class="input" id="artifact-kind" bind:value={artifactDraft.kind}><option value="coach-observation">Coach observation</option><option value="stat-line">Player stat line</option><option value="video-highlight">Video highlight link</option><option value="rules-source">Rules source</option></select></div>
          <div class="field"><label for="artifact-level">Level</label><select class="input" id="artifact-level" bind:value={artifactDraft.level}><option value="youth">Youth</option><option value="high-school">High school</option><option value="college">College</option><option value="nba">NBA</option><option value="general">General</option></select></div>
          <div class="field"><label for="artifact-title">Artifact name</label><input class="input" id="artifact-title" bind:value={artifactDraft.title} /></div>
          <div class="field"><label for="artifact-source">Source / observer</label><input class="input" id="artifact-source" bind:value={artifactDraft.sourceLabel} /></div>
          <div class="field"><label for="artifact-url">Source link</label><input class="input" id="artifact-url" type="url" bind:value={artifactDraft.sourceUrl} placeholder="Required for external evidence" /></div>
          <div class="field"><label for="artifact-jurisdiction">State / jurisdiction</label><input class="input" id="artifact-jurisdiction" bind:value={artifactDraft.jurisdiction} placeholder="Required for film context" /></div>
          <div class="field full"><label for="artifact-observation">Directly observable evidence</label><textarea class="input" id="artifact-observation" bind:value={artifactDraft.observation} placeholder="What can be seen or read at the source?"></textarea></div>
          <div class="actions"><button class="button primary" disabled={commandBusy} onclick={addArtifact}>Register evidence</button></div>
        </div>
      </section>
      <div class="history" style="margin-top:16px">{#each artifacts as artifact}<article class="receipt"><time>{artifact.level}<br/>{artifact.verification}<br/>{new Date(artifact.capturedAt).toLocaleDateString()}</time><div><strong>{artifact.title}</strong><p>{artifact.sourceLabel}{artifact.jurisdiction ? ` / ${artifact.jurisdiction}` : ''}</p></div><div><strong>{artifact.observation}</strong>{#if artifact.sourceUrl}<p><a href={artifact.sourceUrl} target="_blank" rel="noreferrer noopener">Open source ↗</a></p>{/if}</div></article>{:else}<div class="empty">No evidence artifacts registered for this player.</div>{/each}</div>

    {:else if view === 'plan'}
      <div class="section-head"><h2>Sunday flow</h2><p>If the independent window becomes vigorous, reduce coached volume. Quality reads matter more than completing every block.</p></div>
      <div class="table-wrap"><table><thead><tr><th>Time</th><th>Block</th><th>What happens</th><th>Evidence to watch</th></tr></thead><tbody>
        {#each sessionBlocks as row}<tr>{#each row as cell}<td>{cell}</td>{/each}</tr>{/each}
      </tbody></table></div>
      <div class="callout"><strong>Safety signal</strong><span>A ball entering live adult play stops the possession. Sharp pain, dizziness, or unusual shortness of breath stops training.</span></div>

    {:else if view === 'language'}
      <div class="section-head"><h2>Shared basketball language</h2><p>Words support the read; they are not the workout. Introduce a term only when the player can see or feel its picture.</p></div>
      <div class="toolbar">
        <input class="input" type="search" bind:value={search} aria-label="Search basketball terms" placeholder="Search term or meaning" />
        {#each ['all', 'now', 'next', 'later'] as phase}<button class:active={termPhase === phase} class="filter mono" onclick={() => termPhase = phase as typeof termPhase}>{phase}</button>{/each}
      </div>
      <div class="term-grid">
        {#each filteredTerms as [term, meaning, phase]}<article class="term"><strong>{term}</strong><p>{meaning}</p><span class="pill">{phase}</span></article>{/each}
      </div>
      {#if filteredTerms.length === 0}<div class="empty">No shared term matches that search.</div>{/if}

    {:else if view === 'reads'}
      <div class="section-head"><h2>Where the read lives</h2><p>Point to the picture before naming a scheme. Defender position creates the answer.</p></div>
      <div class="court-layout">
        <svg class="court" viewBox="0 0 760 520" role="img" aria-labelledby="court-title court-desc">
          <title id="court-title">Half-court help read</title><desc id="court-desc">A wing drive enters the lane. The nail and low-man help positions create three possible answers.</desc>
          <rect x="28" y="25" width="704" height="460" fill="none" stroke="#090909" stroke-width="4" />
          <path d="M235 25v205h290V25M280 230a100 100 0 0 0 200 0" fill="none" stroke="#9c9c96" stroke-width="3" />
          <path d="M155 355a250 250 0 0 0 450 0" fill="none" stroke="#090909" stroke-width="4" />
          <circle cx="380" cy="62" r="10" fill="none" stroke="#e54800" stroke-width="5" />
          <path d="M120 320L292 205" stroke="#e54800" stroke-width="8" /><path d="M292 205l-25 2 17 20z" fill="#e54800" />
          <path d="M292 205L535 186" stroke="#0057b8" stroke-width="4" />
          <g font-family="Satoshi" font-size="18" font-weight="600"><circle cx="120" cy="320" r="10" fill="#e54800"/><text x="138" y="326">WING</text><circle cx="380" cy="230" r="10" fill="#e54800"/><text x="398" y="236">NAIL</text><circle cx="535" cy="186" r="10" fill="#0057b8"/><text x="553" y="192">LOW MAN</text><circle cx="205" cy="405" r="10" fill="#0057b8"/><text x="223" y="411">SLOT</text><circle cx="610" cy="125" r="10" fill="#007a4d"/><text x="628" y="131">DUNKER</text><circle cx="95" cy="105" r="10" fill="#007a4d"/><text x="113" y="111">CORNER</text></g>
          <g font-family="IBM Plex Mono" font-size="12" font-weight="700"><text x="148" y="265" fill="#e54800">PRESSURE / DOWNHILL LANE</text><text x="350" y="170" fill="#0057b8">SIGNAL / HELP READ</text></g>
        </svg>
        <section class="read-panel" aria-labelledby="read-title"><p class="eyebrow">One picture / three answers</p><h2 id="read-title">What did the helper choose?</h2>
          {#each Object.entries(readAnswers) as [key, answer]}<button class:active={activeRead === key} class="read-option" onclick={() => activeRead = key as keyof typeof readAnswers}><strong>{answer[0]}</strong></button>{/each}
          <div class="answer"><strong>{readAnswers[activeRead][0]}:</strong> {readAnswers[activeRead][1]}</div>
        </section>
      </div>

    {:else if view === 'receipt'}
      <div class="section-head"><h2>Session receipt</h2><p>Record behavior, player words, and the next decision. Makes and misses are not the receipt.</p></div>
      {#if errors.length}<div class="errors" role="alert"><strong>Keep the receipt narrow and complete:</strong><ul>{#each errors as error}<li>{error}</li>{/each}</ul></div>{/if}
      <form class="form-grid" onsubmit={(event) => { event.preventDefault(); submitReceipt(); }}>
        <div class="field"><label for="date">Session date</label><input class="input" id="date" type="date" bind:value={draft.date} /></div>
        <div class="field"><label for="session">Session</label><input class="input" id="session" bind:value={draft.session} readonly /></div>
        <div class="field full"><label for="strength">Best observable strength</label><textarea class="input" id="strength" bind:value={draft.strength} placeholder="Example: scanned before the catch and protected the pickup"></textarea></div>
        <div class="field"><label for="player-words">Player’s words</label><textarea class="input" id="player-words" bind:value={draft.playerWords} placeholder="I saw… I moved… I chose… because…"></textarea></div>
        <div class="field"><label for="next-focus">One next focus</label><textarea class="input" id="next-focus" bind:value={draft.nextFocus} placeholder="One cue narrow enough to use next time"></textarea></div>
        <fieldset class="evidence"><legend>Evidence snapshot</legend>
          {#each Object.entries(evidenceLabels) as [signal, label]}<div class="evidence-row"><strong>{label}</strong>{#each ['emerging', 'usable', 'repeatable'] as value}<label class="radio"><input type="radio" name={signal} checked={draft.evidence[signal as EvidenceSignal] === value} onchange={() => setEvidence(signal as EvidenceSignal, value as EvidenceValue)} /> {value}</label>{/each}</div>{/each}
        </fieldset>
        <div class="actions"><button class="button primary" disabled={commandBusy} type="submit">Save receipt</button>{#if saved}<span class="success" role="status">RECEIPT SAVED / PRIVATE WORKSPACE</span>{/if}</div>
      </form>

    {:else if view === 'progress'}
      <div class="section-head"><h2>Mastery before calendar</h2><p>Phases are gates, not promises tied to a fixed number of weeks.</p></div>
      <div class="table-wrap"><table><thead><tr><th>Phase</th><th>Development focus</th><th>Proof to advance</th></tr></thead><tbody>{#each progressionPhases as row}<tr>{#each row as cell}<td>{cell}</td>{/each}</tr>{/each}</tbody></table></div>
      <div class="section-head"><h2>Receipt history</h2><p>Each entry belongs only to {player?.name} in the authenticated private workspace.</p></div>
      <div class="history">{#each receipts as item}<article class="receipt"><time>{item.date}</time><div><strong>{item.strength}</strong><p>{item.playerWords}</p></div><div><strong>Next: {item.nextFocus}</strong><p>{item.session}</p></div></article>{:else}<div class="empty">No progression receipts yet.</div>{/each}</div>

    {:else if view === 'players'}
      <div class="section-head"><h2>Players + private data</h2><p>The authenticated server response is authoritative. Protected workspace records are never restored from browser storage, and no analytics are used.</p></div>
      {#if operator}
        <section class="profile-box">
          <p class="eyebrow">Add a private player profile</p>
          <div class="profile-grid create-profile">
            <label class="field"><span>Private label</span><input class="input" bind:value={playerName} placeholder="Player 01" /></label>
            <label class="field"><span>Age</span><input class="input" type="number" min="5" max="99" bind:value={newPlayerAge} /></label>
            <label class="field"><span>Gender</span><select class="input" bind:value={newPlayerGender}><option value="">Not entered</option><option value="male">Male</option><option value="female">Female</option><option value="nonbinary">Nonbinary</option><option value="self-described">Self-described</option></select></label>
            <label class="field"><span>Primary position</span><select class="input" bind:value={newPlayerPosition}><option value="">Not entered</option><option value="guard">Guard</option><option value="wing">Wing</option><option value="post">Post</option></select></label>
            <button class="button primary profile-submit" disabled={commandBusy} onclick={addPlayer}>Add profile</button>
          </div>
          <p class="privacy-note">Start with only known basketball context. The player can complete optional fields from his own scoped workspace.</p>
        </section>
      {/if}
      <section class="profile-box profile-editor">
        <div class="section-head compact"><div><p class="eyebrow">Player-owned profile</p><h2>{player?.name}</h2></div><p>Only this private workspace can read these fields. Contact, school, guardian, medical, ranking, and recruiting data are not requested.</p></div>
        <form class="profile-grid" onsubmit={(event) => { event.preventDefault(); savePlayerProfile(); }}>
          <label class="field"><span>Preferred name</span><input class="input" bind:value={profilePreferredName} autocomplete="off" /></label>
          <label class="field"><span>Age</span><input class="input" type="number" min="5" max="99" bind:value={profileAge} /></label>
          <label class="field"><span>Gender</span><select class="input" bind:value={profileGender}><option value="">Not entered</option><option value="male">Male</option><option value="female">Female</option><option value="nonbinary">Nonbinary</option><option value="self-described">Self-described</option></select></label>
          <label class="field"><span>Primary position</span><select class="input" bind:value={profilePosition}><option value="">Not entered</option><option value="guard">Guard</option><option value="wing">Wing</option><option value="post">Post</option></select></label>
          <label class="field"><span>Dominant hand</span><select class="input" bind:value={profileDominantHand}><option value="">Not entered</option><option value="left">Left</option><option value="right">Right</option><option value="both">Both</option></select></label>
          <label class="field"><span>Height</span><input class="input" bind:value={profileHeight} placeholder="Optional, in his own words" /></label>
          <label class="field"><span>Experience</span><input class="input" bind:value={profileExperience} placeholder="Optional playing context" /></label>
          <label class="field"><span>State / jurisdiction</span><input class="input" bind:value={profileJurisdiction} placeholder="Optional, for rules and film context" /></label>
          <label class="field full"><span>What do you want to improve?</span><textarea class="input" bind:value={profileGoals}></textarea></label>
          <label class="field full"><span>Anything else the program should know?</span><textarea class="input" bind:value={profileNotes}></textarea></label>
          <div class="actions"><button class="button primary" disabled={commandBusy} type="submit">Save my profile</button>{#if profileSaved}<span class="success" role="status">PROFILE SAVED / PRIVATE WORKSPACE</span>{/if}</div>
        </form>
      </section>
      <div class="section-head"><h2>Codex access boundary</h2><p>Both people work with the program. Neither needs a coach persona.</p></div>
      <div class="role-grid">
        <article><span class="mono">Program agent</span><strong>Guides the sequence</strong><p>Requests context, applies safety policy, separates evidence, and proposes the next interaction.</p></article>
        <article><span class="mono">Coach context</span><strong>Adds live observation</strong><p>Supplies concise court-side evidence only when the program asks for it.</p></article>
        <article><span class="mono">Player Codex</span><strong>Own records only</strong><p>Can review and save personal receipts, source links, reflections, and engagement events—never another player or reset controls.</p></article>
        <article><span class="mono">Operator Codex</span><strong>Manages the system</strong><p>Creates profiles, reviews the full workspace, manages evidence, and performs confirmation-gated reset.</p></article>
      </div>
      {#if operator}<div class="section-head"><h2>Data control</h2><p>Reset returns the app to its generic starter profile. This cannot be undone.</p></div>
      <button class="button danger" disabled={commandBusy} onclick={resetData}>{resetArmed ? 'Confirm reset' : 'Reset workspace'}</button>{/if}
    {/if}

    <footer class="footer">FIELD TEST / V0.5 &nbsp; STATUS / {hydrated ? 'IDENTITY SCOPED' : 'LOADING'} &nbsp; REV / {labState.revision} &nbsp; FIRST-PARTY AUTH</footer>
  </main>
</div>
