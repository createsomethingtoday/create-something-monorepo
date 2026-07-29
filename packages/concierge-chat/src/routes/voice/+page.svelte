<script lang="ts">
  import { onDestroy, tick } from 'svelte';
  import { z } from 'zod';
  import type { RealtimeSession } from '@openai/agents/realtime';

  import { createConciergeThreadClient } from '$lib/chat/client-actions';
  import {
    formatVoiceBriefForApplication,
    getVoiceBriefRows,
    type VoiceApplicationBrief
  } from '$lib/voice/brief';
  import { toSafeVoiceError } from '$lib/voice/errors';
  import {
    voiceConciergeInstructions,
    voiceConciergeSpeed,
    voiceConciergeVoice
  } from '$lib/voice/knowledge';
  import { toVoiceTranscriptEntries, type VoiceTranscriptEntry } from '$lib/voice/transcript';
  import { absoluteUrl } from '$lib/site/seo';

  type CallStatus = 'idle' | 'connecting' | 'listening' | 'speaking' | 'ended' | 'error';

  interface ClientSecretPayload {
    value?: string;
    expiresAt?: number;
    model?: string;
    message?: string;
  }

  const pageTitle = 'Voice Concierge | Abundance Staffing';
  const pageDescription =
    'Talk through the nursing role, shift, location, timing, and fit you want, then continue with a candidate-controlled brief in the secure Abundance application.';
  const pagePath = '/voice';

  let callStatus: CallStatus = 'idle';
  let muted = false;
  let transcript: VoiceTranscriptEntry[] = [];
  let applicationBrief: VoiceApplicationBrief | null = null;
  let errorMessage = '';
  let elapsedSeconds = 0;
  let interruptions = 0;
  let continuing = false;
  let transcriptPanel: HTMLElement | null = null;

  let activeSession: RealtimeSession | null = null;
  let callTimer: ReturnType<typeof setInterval> | null = null;
  let disposed = false;

  $: callActive =
    callStatus === 'connecting' || callStatus === 'listening' || callStatus === 'speaking';
  $: sessionConnected = callStatus === 'listening' || callStatus === 'speaking';
  $: briefRows = applicationBrief ? getVoiceBriefRows(applicationBrief) : [];
  $: statusLabel =
    callStatus === 'connecting'
      ? 'Connecting securely'
      : callStatus === 'listening'
        ? muted
          ? 'Microphone muted'
          : 'Listening'
        : callStatus === 'speaking'
          ? 'Concierge is speaking'
          : callStatus === 'ended'
            ? 'Voice session ended'
            : callStatus === 'error'
              ? 'Connection needs attention'
              : 'Ready when you are';

  function formatDuration(seconds: number): string {
    const minutes = Math.floor(seconds / 60)
      .toString()
      .padStart(2, '0');
    const remainder = (seconds % 60).toString().padStart(2, '0');
    return `${minutes}:${remainder}`;
  }

  function startTimer() {
    if (callTimer) clearInterval(callTimer);
    callTimer = setInterval(() => {
      elapsedSeconds += 1;
    }, 1000);
  }

  function stopTimer() {
    if (!callTimer) return;
    clearInterval(callTimer);
    callTimer = null;
  }

  async function updateTranscript(history: readonly unknown[]) {
    transcript = toVoiceTranscriptEntries(history);
    await tick();
    transcriptPanel?.scrollTo({ top: transcriptPanel.scrollHeight, behavior: 'smooth' });
  }

  async function startVoiceSession() {
    if (callActive) return;

    errorMessage = '';
    applicationBrief = null;
    transcript = [];
    elapsedSeconds = 0;
    interruptions = 0;
    muted = false;
    callStatus = 'connecting';

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('This browser does not provide microphone access.');
      }

      const tokenResponse = await fetch('/api/voice/session', {
        method: 'POST',
        headers: { Accept: 'application/json' }
      });
      const token = (await tokenResponse.json()) as ClientSecretPayload;
      if (!tokenResponse.ok || !token.value || !token.model) {
        throw new Error(token.message || 'The secure voice session could not be started.');
      }

      const { RealtimeAgent, RealtimeSession, tool } = await import('@openai/agents/realtime');
      const prepareApplicationBrief = tool({
        name: 'prepare_application_brief',
        description:
          'Stage a confirmed, non-sensitive nurse work-preference brief in this browser. This does not submit an application, create a candidate record, or contact a recruiter.',
        parameters: z.object({
          specialty: z.string().min(2).max(80).describe('Nursing specialty or desired role'),
          workType: z
            .string()
            .min(2)
            .max(60)
            .optional()
            .describe('Travel, per diem, local contract, or another work type'),
          preferredShift: z
            .string()
            .min(2)
            .max(80)
            .optional()
            .describe('Preferred shift or schedule'),
          preferredLocation: z
            .string()
            .min(2)
            .max(100)
            .optional()
            .describe('Preferred city, state, region, or travel radius'),
          startWindow: z.string().min(2).max(80).optional().describe('Approximate start window'),
          payPreference: z
            .string()
            .min(2)
            .max(100)
            .optional()
            .describe('Candidate-stated pay preference or constraint, not a promise'),
          fitNotes: z
            .string()
            .min(2)
            .max(240)
            .optional()
            .describe('Non-sensitive priorities, constraints, or deal breakers')
        }),
        execute: async (brief) => {
          applicationBrief = brief;
          return JSON.stringify({
            status: 'staged_in_browser',
            message:
              'The candidate-controlled brief is ready on screen. Nothing has been submitted and no recruiter has been contacted.'
          });
        }
      });

      const agent = new RealtimeAgent({
        name: 'Abundance Voice Concierge',
        voice: voiceConciergeVoice,
        instructions: voiceConciergeInstructions,
        tools: [prepareApplicationBrief]
      });

      const session = new RealtimeSession(agent, {
        model: token.model,
        transport: 'webrtc',
        tracingDisabled: true,
        historyStoreAudio: false,
        config: {
          outputModalities: ['audio'],
          reasoning: { effort: 'low' },
          audio: {
            input: {
              transcription: { model: 'gpt-4o-mini-transcribe', language: 'en' },
              noiseReduction: { type: 'near_field' },
              turnDetection: {
                type: 'semantic_vad',
                eagerness: 'auto',
                createResponse: true,
                interruptResponse: true
              }
            },
            output: { voice: voiceConciergeVoice, speed: voiceConciergeSpeed }
          }
        }
      });

      session.on('history_updated', (history) => void updateTranscript(history));
      session.on('audio_start', () => {
        if (!disposed) callStatus = 'speaking';
      });
      session.on('audio_stopped', () => {
        if (!disposed) callStatus = 'listening';
      });
      session.on('audio_interrupted', () => {
        if (!disposed) {
          interruptions += 1;
          callStatus = 'listening';
        }
      });
      session.on('error', ({ error }) => {
        if (!disposed) {
          errorMessage = toSafeVoiceError(error);
          stopTimer();
          session.close();
          if (activeSession === session) activeSession = null;
          callStatus = 'error';
        }
      });

      activeSession = session;
      await session.connect({ apiKey: token.value, model: token.model });
      if (disposed) {
        session.close();
        return;
      }

      callStatus = 'listening';
      startTimer();
      session.transport.requestResponse?.();
    } catch (error) {
      activeSession?.close();
      activeSession = null;
      stopTimer();
      callStatus = 'error';
      errorMessage = toSafeVoiceError(error);
    }
  }

  function toggleMute() {
    if (!activeSession || !callActive) return;
    muted = !muted;
    activeSession.mute(muted);
  }

  function endVoiceSession() {
    activeSession?.close();
    activeSession = null;
    stopTimer();
    muted = false;
    if (!disposed) callStatus = 'ended';
  }

  function resetVoiceSession() {
    endVoiceSession();
    callStatus = 'idle';
    errorMessage = '';
    transcript = [];
    applicationBrief = null;
    elapsedSeconds = 0;
    interruptions = 0;
  }

  async function continueToApplication() {
    if (!applicationBrief || continuing) return;

    continuing = true;
    errorMessage = '';
    endVoiceSession();

    try {
      await createConciergeThreadClient(formatVoiceBriefForApplication(applicationBrief));
    } catch (error) {
      continuing = false;
      errorMessage =
        error instanceof Error
          ? error.message
          : 'The application could not be started. Your brief remains on this page.';
    }
  }

  onDestroy(() => {
    disposed = true;
    activeSession?.close();
    activeSession = null;
    stopTimer();
  });
</script>

<svelte:head>
  <title>{pageTitle}</title>
  <meta name="description" content={pageDescription} />
  <link rel="canonical" href={absoluteUrl(pagePath)} />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Abundance Staffing" />
  <meta property="og:title" content={pageTitle} />
  <meta property="og:description" content={pageDescription} />
  <meta property="og:url" content={absoluteUrl(pagePath)} />
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content={pageTitle} />
  <meta name="twitter:description" content={pageDescription} />
</svelte:head>

<div class="voice-page">
  <section class="voice-hero">
    <div class="voice-orbit voice-orbit-one" aria-hidden="true"></div>
    <div class="voice-orbit voice-orbit-two" aria-hidden="true"></div>

    <div class="voice-shell voice-hero-grid">
      <div class="voice-copy">
        <span class="voice-kicker"><i aria-hidden="true"></i> Voice-first nurse application</span>
        <h1>Say what fits.<br /><em>Keep the handoff clear.</em></h1>
        <p>
          Talk through the role, shift, location, timing, and constraints that matter. Voice
          Concierge turns the conversation into a brief you control—then the secure application
          takes over.
        </p>

        <div class="voice-principles" aria-label="Voice session safeguards">
          <span>Session-only transcript</span>
          <span>No identity or documents</span>
          <span>Recruiter decisions stay human</span>
        </div>

        <div class="voice-disclosure" role="note">
          <span class="disclosure-mark" aria-hidden="true">A</span>
          <p>
            <strong>Share work preferences, not personal records.</strong>
            Don’t say your legal name, contact details, license number, or health information.
          </p>
        </div>
      </div>

      <section class="voice-console" aria-labelledby="console-title">
        <div class="console-topline">
          <div>
            <span>Live voice</span>
            <strong id="console-title">Abundance Concierge</strong>
          </div>
          <span class:online={sessionConnected} class="connection-state">
            <i aria-hidden="true"></i>
            {sessionConnected ? 'Connected' : callStatus === 'connecting' ? 'Connecting' : 'Ready'}
          </span>
        </div>

        <div
          class:active={callActive}
          class:speaking={callStatus === 'speaking'}
          class="voice-stage"
        >
          <div class="stage-orbits" aria-hidden="true"><i></i><i></i><i></i></div>
          <div class="voice-avatar">A</div>
          <div class="voice-bars" aria-hidden="true">
            {#each [1, 2, 3, 4, 5, 6, 7, 8, 9] as bar}
              <i style={`--bar-delay:${bar * -70}ms;--bar-height:${8 + (bar % 5) * 5}px`}></i>
            {/each}
          </div>
          <strong class="stage-status" aria-live="polite">{statusLabel}</strong>
          {#if callActive}
            <span class="session-clock">{formatDuration(elapsedSeconds)}</span>
          {/if}
        </div>

        {#if errorMessage}
          <p class="voice-error" role="alert">{errorMessage}</p>
        {/if}

        <div class="voice-controls">
          {#if !callActive && callStatus !== 'connecting'}
            <button class="start-voice" type="button" on:click={startVoiceSession}>
              <span class="control-icon" aria-hidden="true">◉</span>
              {callStatus === 'idle' ? 'Start voice session' : 'Start another session'}
            </button>
          {:else}
            <button
              class:muted
              class="mute-control"
              type="button"
              on:click={toggleMute}
              disabled={callStatus === 'connecting'}
              aria-label={muted ? 'Unmute microphone' : 'Mute microphone'}
            >
              {muted ? 'Unmute' : 'Mute'}
            </button>
            <button class="end-voice" type="button" on:click={endVoiceSession}>End session</button>
          {/if}
          {#if callStatus === 'error'}
            <button class="reset-voice" type="button" on:click={resetVoiceSession}>Reset</button>
          {/if}
        </div>

        <p class="microphone-note">
          Your browser asks for microphone access when you start. Audio is not stored by this site.
        </p>
      </section>
    </div>
  </section>

  <section class="voice-workspace">
    <div class="voice-shell workspace-grid">
      <div class="conversation-column">
        <div class="section-heading">
          <div>
            <span>01 · Live conversation</span>
            <h2>Talk naturally.<br />Correct anything.</h2>
          </div>
          <span class="not-saved">Not saved</span>
        </div>

        <div class="prompt-row" aria-label="Conversation starters">
          <span>“I’m an ICU nurse looking for nights in Austin.”</span>
          <span>“I want a travel role starting in six weeks.”</span>
          <span>“No rotating shifts, and weekend blocks are best.”</span>
        </div>

        <div
          class="voice-transcript"
          bind:this={transcriptPanel}
          aria-live="polite"
          aria-relevant="additions text"
        >
          {#if transcript.length === 0}
            <div class="empty-transcript">
              <span aria-hidden="true">•••</span>
              <p>Your conversation appears here after the voice session begins.</p>
            </div>
          {:else}
            {#each transcript as entry (entry.id)}
              <article class:concierge={entry.speaker === 'Concierge'}>
                <span>{entry.speaker === 'Concierge' ? 'A' : 'You'}</span>
                <div>
                  <strong>{entry.speaker}</strong>
                  <p>{entry.text}</p>
                </div>
              </article>
            {/each}
          {/if}
        </div>

        {#if interruptions > 0}
          <p class="interruption-proof">✓ Natural interruption handled</p>
        {/if}
      </div>

      <aside class:ready={applicationBrief} class="brief-column" aria-labelledby="brief-title">
        <div class="brief-topline">
          <span>02 · Candidate-controlled brief</span>
          <i aria-hidden="true"></i>
        </div>
        <h2 id="brief-title">
          {applicationBrief ? 'Ready to review.' : 'Built only when you confirm.'}
        </h2>
        <p>
          {applicationBrief
            ? 'This summary stays on this page until you choose to continue.'
            : 'Concierge will repeat the brief and ask for your confirmation before anything appears here.'}
        </p>

        {#if applicationBrief}
          <dl class="brief-rows">
            {#each briefRows as row}
              <div>
                <dt>{row.label}</dt>
                <dd>{row.value}</dd>
              </div>
            {/each}
          </dl>

          <button
            class="continue-application"
            type="button"
            on:click={continueToApplication}
            disabled={continuing}
          >
            <span>{continuing ? 'Opening application…' : 'Continue in application'}</span>
            <span aria-hidden="true">↗</span>
          </button>
          <small>
            This explicit action creates a new application thread and carries over only the brief
            above.
          </small>
        {:else}
          <div class="brief-placeholder" aria-hidden="true">
            <span></span><span></span><span></span><span></span>
          </div>
          <a class="written-fallback" href="/apply"
            >Prefer to type? Start the written application ↗</a
          >
        {/if}
      </aside>
    </div>
  </section>

  <section class="voice-boundary">
    <div class="voice-shell boundary-grid">
      <span>One channel. Clear limits.</span>
      <h2>Voice prepares the start.<br /><em>People own the decision.</em></h2>
      <div class="boundary-list">
        <article>
          <span>01</span>
          <strong>Voice</strong>
          <p>Organizes non-sensitive work preferences into a brief you can see and correct.</p>
        </article>
        <article>
          <span>02</span>
          <strong>Application</strong>
          <p>Handles identity, documents, consent, and protected steps only when needed.</p>
        </article>
        <article>
          <span>03</span>
          <strong>Recruiter</strong>
          <p>Reviews fit and owns every consequential staffing action.</p>
        </article>
      </div>
    </div>
  </section>
</div>

<style>
  :global(body) {
    background: #faf5ef;
  }

  .voice-page {
    --voice-ink: #171512;
    --voice-deep: #020202;
    --voice-paper: #faf5ef;
    --voice-paper-bright: #fffaf4;
    --voice-tan: #af7c54;
    --voice-tan-soft: #d7b79e;
    --voice-blue: #1d6f8a;
    color: var(--voice-ink);
    background: var(--voice-paper);
    overflow: clip;
  }

  .voice-shell {
    width: min(calc(100% - 64px), 1380px);
    margin-inline: auto;
  }

  .voice-hero {
    position: relative;
    padding: clamp(78px, 8vw, 124px) 0 clamp(90px, 9vw, 136px);
    isolation: isolate;
  }

  .voice-orbit {
    position: absolute;
    z-index: -1;
    border: 1px solid rgba(175, 124, 84, 0.16);
    border-radius: 999px;
  }

  .voice-orbit-one {
    top: -440px;
    right: -170px;
    width: 880px;
    height: 880px;
  }

  .voice-orbit-two {
    top: -280px;
    right: -10px;
    width: 560px;
    height: 560px;
  }

  .voice-hero-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(430px, 0.74fr);
    gap: clamp(56px, 8vw, 126px);
    align-items: center;
  }

  .voice-kicker,
  .brief-topline,
  .section-heading > div > span,
  .voice-boundary > .voice-shell > span {
    color: var(--voice-blue);
    font-family: var(--font-mono, ui-monospace, monospace);
    font-size: 0.7rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .voice-kicker {
    display: inline-flex;
    align-items: center;
    gap: 10px;
  }

  .voice-kicker i {
    width: 9px;
    height: 9px;
    border-radius: 999px;
    background: var(--voice-blue);
    box-shadow: 0 0 0 6px rgba(29, 111, 138, 0.1);
  }

  .voice-copy h1 {
    margin: 26px 0 0;
    font-size: clamp(3.8rem, 6.7vw, 7rem);
    font-weight: 530;
    letter-spacing: -0.067em;
    line-height: 0.91;
  }

  .voice-copy h1 em,
  .voice-boundary h2 em {
    color: var(--voice-tan);
    font-family: Georgia, 'Times New Roman', serif;
    font-weight: 400;
    letter-spacing: -0.045em;
  }

  .voice-copy > p {
    max-width: 680px;
    margin: 30px 0 0;
    color: rgba(23, 21, 18, 0.64);
    font-size: clamp(1rem, 1.25vw, 1.18rem);
    line-height: 1.65;
  }

  .voice-principles {
    display: flex;
    gap: 8px 20px;
    flex-wrap: wrap;
    margin-top: 30px;
  }

  .voice-principles span {
    color: rgba(23, 21, 18, 0.62);
    font-size: 0.78rem;
  }

  .voice-principles span::before {
    content: '✓';
    margin-right: 8px;
    color: var(--voice-blue);
    font-weight: 700;
  }

  .voice-disclosure {
    display: flex;
    gap: 13px;
    align-items: center;
    max-width: 620px;
    margin-top: 28px;
    padding: 16px;
    border: 1px solid rgba(23, 21, 18, 0.12);
    border-radius: 18px;
    background: rgba(255, 250, 244, 0.72);
  }

  .disclosure-mark {
    display: grid;
    flex: 0 0 auto;
    place-items: center;
    width: 38px;
    height: 38px;
    border-radius: 999px;
    background: var(--voice-deep);
    color: white;
    font-size: 0.82rem;
  }

  .voice-disclosure p {
    margin: 0;
    color: rgba(23, 21, 18, 0.58);
    font-size: 0.76rem;
    line-height: 1.5;
  }

  .voice-disclosure strong {
    display: block;
    margin-bottom: 2px;
    color: var(--voice-ink);
  }

  .voice-console {
    padding: clamp(24px, 3vw, 34px);
    border-radius: 32px;
    background:
      radial-gradient(circle at 82% 12%, rgba(175, 124, 84, 0.2), transparent 30%),
      var(--voice-deep);
    color: white;
    box-shadow: 0 40px 100px rgba(2, 2, 2, 0.22);
  }

  .console-topline {
    display: flex;
    justify-content: space-between;
    gap: 20px;
    align-items: flex-start;
  }

  .console-topline > div {
    display: grid;
    gap: 5px;
  }

  .console-topline > div > span {
    color: var(--voice-tan-soft);
    font-family: var(--font-mono, ui-monospace, monospace);
    font-size: 0.65rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .console-topline strong {
    font-size: 1rem;
    font-weight: 600;
  }

  .connection-state {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 999px;
    color: rgba(255, 255, 255, 0.52);
    font-size: 0.66rem;
  }

  .connection-state i {
    width: 7px;
    height: 7px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.34);
  }

  .connection-state.online {
    color: #8fc9d9;
  }

  .connection-state.online i {
    background: #64b7cb;
    box-shadow: 0 0 0 5px rgba(100, 183, 203, 0.12);
  }

  .voice-stage {
    position: relative;
    display: flex;
    min-height: 360px;
    margin-top: 24px;
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 24px;
    background: linear-gradient(150deg, rgba(255, 255, 255, 0.04), transparent 46%), #11100e;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

  .voice-avatar {
    position: relative;
    z-index: 2;
    display: grid;
    place-items: center;
    width: 94px;
    height: 94px;
    border: 1px solid rgba(255, 255, 255, 0.24);
    border-radius: 999px;
    background: linear-gradient(145deg, var(--voice-tan-soft), var(--voice-tan));
    color: var(--voice-deep);
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 2.2rem;
    box-shadow: 0 22px 60px rgba(0, 0, 0, 0.34);
  }

  .stage-orbits,
  .stage-orbits i {
    position: absolute;
    border-radius: 999px;
  }

  .stage-orbits {
    width: 94px;
    height: 94px;
  }

  .stage-orbits i {
    inset: 0;
    border: 1px solid rgba(215, 183, 158, 0.3);
    opacity: 0;
  }

  .voice-stage.active .stage-orbits i {
    animation: voice-ring 2.8s ease-out infinite;
  }

  .voice-stage.active .stage-orbits i:nth-child(2) {
    animation-delay: 0.92s;
  }

  .voice-stage.active .stage-orbits i:nth-child(3) {
    animation-delay: 1.84s;
  }

  .voice-bars {
    position: relative;
    z-index: 2;
    display: flex;
    align-items: center;
    gap: 4px;
    height: 34px;
    margin-top: 22px;
  }

  .voice-bars i {
    width: 3px;
    height: 5px;
    border-radius: 999px;
    background: var(--voice-tan-soft);
  }

  .voice-stage.speaking .voice-bars i {
    animation: voice-bar 0.75s ease-in-out infinite alternate;
    animation-delay: var(--bar-delay);
  }

  .stage-status {
    position: relative;
    z-index: 2;
    margin-top: 7px;
    color: rgba(255, 255, 255, 0.74);
    font-size: 0.75rem;
  }

  .session-clock {
    position: absolute;
    top: 17px;
    right: 18px;
    color: rgba(255, 255, 255, 0.4);
    font-family: var(--font-mono, ui-monospace, monospace);
    font-size: 0.65rem;
  }

  .voice-error {
    margin: 16px 0 0;
    padding: 12px 14px;
    border: 1px solid rgba(215, 183, 158, 0.22);
    border-radius: 12px;
    background: rgba(175, 124, 84, 0.12);
    color: #efcfb6;
    font-size: 0.76rem;
    line-height: 1.5;
  }

  .voice-controls {
    display: flex;
    min-height: 58px;
    gap: 10px;
    align-items: center;
    justify-content: center;
    margin-top: 20px;
  }

  .voice-controls button {
    min-height: 50px;
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 999px;
    box-shadow: none;
  }

  .start-voice {
    display: inline-flex;
    gap: 12px;
    align-items: center;
    padding-inline: 24px;
    background: white;
    color: var(--voice-deep);
  }

  .control-icon {
    color: var(--voice-blue);
  }

  .mute-control,
  .reset-voice {
    background: rgba(255, 255, 255, 0.08);
    color: white;
  }

  .mute-control.muted {
    background: rgba(175, 124, 84, 0.2);
  }

  .end-voice {
    background: var(--voice-tan);
    color: white;
  }

  .microphone-note {
    margin: 10px 0 0;
    color: rgba(255, 255, 255, 0.38);
    font-size: 0.66rem;
    text-align: center;
  }

  .voice-workspace {
    padding: clamp(92px, 10vw, 148px) 0;
    background: var(--voice-paper-bright);
  }

  .workspace-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(370px, 0.58fr);
    gap: clamp(44px, 7vw, 96px);
    align-items: start;
  }

  .section-heading {
    display: flex;
    justify-content: space-between;
    gap: 28px;
    align-items: flex-start;
  }

  .section-heading h2 {
    margin: 12px 0 0;
    font-size: clamp(2.7rem, 4.8vw, 5rem);
    font-weight: 520;
    letter-spacing: -0.055em;
    line-height: 0.98;
  }

  .not-saved {
    padding: 8px 10px;
    border: 1px solid rgba(23, 21, 18, 0.12);
    border-radius: 999px;
    color: rgba(23, 21, 18, 0.48);
    font-size: 0.66rem;
  }

  .prompt-row {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    margin-top: 28px;
  }

  .prompt-row span {
    padding: 9px 11px;
    border: 1px solid rgba(23, 21, 18, 0.1);
    border-radius: 999px;
    color: rgba(23, 21, 18, 0.58);
    font-size: 0.68rem;
  }

  .voice-transcript {
    min-height: 390px;
    max-height: 590px;
    margin-top: 22px;
    overflow-y: auto;
    border-top: 1px solid rgba(23, 21, 18, 0.15);
    border-bottom: 1px solid rgba(23, 21, 18, 0.15);
  }

  .empty-transcript {
    display: grid;
    min-height: 390px;
    place-items: center;
    align-content: center;
    gap: 12px;
    color: rgba(23, 21, 18, 0.36);
    text-align: center;
  }

  .empty-transcript span {
    color: var(--voice-tan);
    letter-spacing: 0.3em;
  }

  .empty-transcript p {
    margin: 0;
    font-size: 0.78rem;
  }

  .voice-transcript article {
    display: grid;
    grid-template-columns: 46px 1fr;
    gap: 18px;
    padding: 24px 0;
    border-bottom: 1px solid rgba(23, 21, 18, 0.1);
  }

  .voice-transcript article:last-child {
    border-bottom: 0;
  }

  .voice-transcript article > span {
    display: grid;
    place-items: center;
    width: 38px;
    height: 38px;
    border-radius: 999px;
    background: rgba(23, 21, 18, 0.08);
    color: rgba(23, 21, 18, 0.7);
    font-size: 0.68rem;
  }

  .voice-transcript article.concierge > span {
    background: var(--voice-deep);
    color: var(--voice-tan-soft);
  }

  .voice-transcript article strong {
    font-size: 0.72rem;
  }

  .voice-transcript article p {
    margin: 6px 0 0;
    color: rgba(23, 21, 18, 0.62);
    font-size: 0.88rem;
    line-height: 1.6;
  }

  .interruption-proof {
    margin: 14px 0 0;
    color: var(--voice-blue);
    font-size: 0.68rem;
  }

  .brief-column {
    position: sticky;
    top: 122px;
    padding: clamp(28px, 3vw, 38px);
    border-radius: 30px;
    background: var(--voice-deep);
    color: white;
    box-shadow: 0 30px 80px rgba(2, 2, 2, 0.16);
  }

  .brief-topline {
    display: flex;
    justify-content: space-between;
    gap: 18px;
    align-items: center;
    color: var(--voice-tan-soft);
  }

  .brief-topline i {
    width: 9px;
    height: 9px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.2);
  }

  .brief-column.ready .brief-topline i {
    background: var(--voice-blue);
    box-shadow: 0 0 0 5px rgba(29, 111, 138, 0.14);
  }

  .brief-column h2 {
    margin: 58px 0 0;
    font-size: clamp(2.2rem, 3.3vw, 3.8rem);
    font-weight: 500;
    letter-spacing: -0.055em;
    line-height: 0.98;
  }

  .brief-column > p {
    margin: 20px 0 0;
    color: rgba(255, 255, 255, 0.52);
    font-size: 0.84rem;
    line-height: 1.6;
  }

  .brief-placeholder {
    display: grid;
    gap: 12px;
    margin-top: 36px;
  }

  .brief-placeholder span {
    height: 46px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.04);
  }

  .brief-placeholder span:nth-child(2) {
    width: 82%;
  }

  .brief-placeholder span:nth-child(3) {
    width: 68%;
  }

  .written-fallback {
    display: inline-block;
    margin-top: 28px;
    color: var(--voice-tan-soft);
    font-size: 0.76rem;
    text-decoration: none;
  }

  .brief-rows {
    display: grid;
    margin: 34px 0 0;
  }

  .brief-rows > div {
    display: grid;
    grid-template-columns: 120px 1fr;
    gap: 20px;
    padding: 15px 0;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }

  .brief-rows dt {
    color: rgba(255, 255, 255, 0.4);
    font-size: 0.68rem;
  }

  .brief-rows dd {
    margin: 0;
    color: rgba(255, 255, 255, 0.82);
    font-size: 0.78rem;
    line-height: 1.45;
  }

  .continue-application {
    display: flex;
    justify-content: space-between;
    gap: 22px;
    width: 100%;
    margin-top: 30px;
    padding: 10px 10px 10px 20px;
    border: 0;
    border-radius: 999px;
    background: white;
    color: var(--voice-deep);
  }

  .continue-application > span:last-child {
    display: grid;
    place-items: center;
    width: 38px;
    height: 38px;
    border-radius: 999px;
    background: var(--voice-tan);
    color: white;
  }

  .brief-column > small {
    display: block;
    margin-top: 14px;
    color: rgba(255, 255, 255, 0.36);
    font-size: 0.62rem;
    line-height: 1.5;
  }

  .voice-boundary {
    padding: clamp(92px, 10vw, 150px) 0;
    background: #f3e9df;
  }

  .boundary-grid > h2 {
    max-width: 940px;
    margin: 22px 0 0;
    font-size: clamp(3rem, 5.4vw, 6rem);
    font-weight: 520;
    letter-spacing: -0.06em;
    line-height: 0.96;
  }

  .boundary-list {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0;
    margin-top: 70px;
    border-top: 1px solid rgba(23, 21, 18, 0.16);
  }

  .boundary-list article {
    min-height: 250px;
    padding: 26px 30px 0 0;
    border-right: 1px solid rgba(23, 21, 18, 0.16);
  }

  .boundary-list article + article {
    padding-left: 30px;
  }

  .boundary-list article:last-child {
    border-right: 0;
  }

  .boundary-list article > span {
    color: var(--voice-blue);
    font-family: var(--font-mono, ui-monospace, monospace);
    font-size: 0.68rem;
  }

  .boundary-list strong {
    display: block;
    margin-top: 48px;
    font-size: 1.45rem;
  }

  .boundary-list p {
    max-width: 330px;
    margin: 14px 0 0;
    color: rgba(23, 21, 18, 0.58);
    font-size: 0.86rem;
    line-height: 1.6;
  }

  @keyframes voice-ring {
    0% {
      transform: scale(1);
      opacity: 0.7;
    }
    100% {
      transform: scale(2.8);
      opacity: 0;
    }
  }

  @keyframes voice-bar {
    to {
      height: var(--bar-height);
    }
  }

  @media (max-width: 980px) {
    .voice-shell {
      width: min(calc(100% - 36px), 780px);
    }

    .voice-hero-grid,
    .workspace-grid {
      grid-template-columns: 1fr;
    }

    .voice-console {
      width: min(100%, 650px);
    }

    .brief-column {
      position: static;
    }
  }

  @media (max-width: 680px) {
    .voice-shell {
      width: min(calc(100% - 28px), 560px);
    }

    .voice-hero {
      padding-top: 68px;
    }

    .voice-copy h1 {
      font-size: clamp(3.2rem, 16vw, 5rem);
    }

    .voice-console {
      padding: 18px;
      border-radius: 24px;
    }

    .voice-stage {
      min-height: 310px;
    }

    .section-heading {
      display: grid;
    }

    .not-saved {
      width: fit-content;
    }

    .boundary-list {
      grid-template-columns: 1fr;
    }

    .boundary-list article,
    .boundary-list article + article {
      min-height: 0;
      padding: 28px 0 34px;
      border-right: 0;
      border-bottom: 1px solid rgba(23, 21, 18, 0.16);
    }

    .boundary-list strong {
      margin-top: 26px;
    }

    .brief-rows > div {
      grid-template-columns: 1fr;
      gap: 6px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .voice-stage.active .stage-orbits i,
    .voice-stage.speaking .voice-bars i {
      animation: none;
    }
  }
</style>
