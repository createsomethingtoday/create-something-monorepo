<script lang="ts">
  import { onDestroy, tick } from 'svelte';
  import { z } from 'zod';
  import type { RealtimeSession } from '@openai/agents/realtime';

  import { npgLocationDirectory, type NpgLocationLookupResult } from '$lib/npg/location-directory';
  import { absoluteUrl } from '$lib/site/seo';
  import { toSafeVoiceError } from '$lib/voice/errors';
  import {
    npgClientServiceInstructions,
    npgClientServiceSpeed,
    npgClientServiceVoice
  } from '$lib/voice/npg-knowledge';
  import { toVoiceTranscriptEntries, type VoiceTranscriptEntry } from '$lib/voice/transcript';

  type CallStatus = 'idle' | 'connecting' | 'listening' | 'speaking' | 'ended' | 'error';
  type NoticeType = 'late_arrival' | 'cancellation_notice' | 'access_issue' | 'human_follow_up';

  interface ClientSecretPayload {
    value?: string;
    model?: string;
    message?: string;
  }

  interface ServiceHandoff {
    noticeType: NoticeType;
    callerName: string;
    callerOrganization: string;
    veteranName: string;
    appointmentDate: string;
    originalTime: string;
    location: string;
    providerName: string;
    callbackNumber: string;
    estimatedArrival?: string;
    issueSummary?: string;
  }

  const pagePath = '/client-service';
  const pageTitle = 'NPG Client Service Representative | Abundance';
  const pageDescription =
    'A governed voice representative for NPG location assistance, access issues, and controlled attendance handoffs.';
  const approvedLocationCount = npgLocationDirectory.filter(
    (location) => location.status === 'approved'
  ).length;
  const reviewLocationCount = npgLocationDirectory.length - approvedLocationCount;

  let callStatus: CallStatus = 'idle';
  let muted = false;
  let elapsedSeconds = 0;
  let transcript: VoiceTranscriptEntry[] = [];
  let errorMessage = '';
  let locationQuery = '';
  let locationResult: NpgLocationLookupResult | null = null;
  let serviceHandoff: ServiceHandoff | null = null;
  let transcriptPanel: HTMLElement | null = null;
  let activeSession: RealtimeSession | null = null;
  let callTimer: ReturnType<typeof setInterval> | null = null;
  let disposed = false;

  $: callActive =
    callStatus === 'connecting' || callStatus === 'listening' || callStatus === 'speaking';
  $: sessionConnected = callStatus === 'listening' || callStatus === 'speaking';
  $: statusLabel =
    callStatus === 'connecting'
      ? 'Connecting securely'
      : callStatus === 'listening'
        ? muted
          ? 'Microphone muted'
          : 'Listening'
        : callStatus === 'speaking'
          ? 'Representative is speaking'
          : callStatus === 'ended'
            ? 'Session ended'
            : callStatus === 'error'
              ? 'Connection needs attention'
              : 'Ready to assist';

  function formatDuration(seconds: number): string {
    return `${Math.floor(seconds / 60)
      .toString()
      .padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
  }

  function startTimer() {
    if (callTimer) clearInterval(callTimer);
    callTimer = setInterval(() => (elapsedSeconds += 1), 1000);
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

  async function lookupLocation(query: string): Promise<NpgLocationLookupResult> {
    const response = await fetch('/api/npg/locations/lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ query })
    });
    if (!response.ok) {
      return {
        status: 'not_found',
        message:
          'The caller-safe NPG directory is unavailable. A human representative must confirm the appointment site.'
      };
    }
    return (await response.json()) as NpgLocationLookupResult;
  }

  async function runLocationLookup() {
    locationResult = await lookupLocation(locationQuery);
  }

  async function startVoiceSession() {
    if (callActive) return;

    errorMessage = '';
    transcript = [];
    serviceHandoff = null;
    elapsedSeconds = 0;
    muted = false;
    callStatus = 'connecting';

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('This browser does not provide microphone access.');
      }

      const tokenResponse = await fetch('/api/npg/client-service/session', {
        method: 'POST',
        headers: { Accept: 'application/json' }
      });
      const token = (await tokenResponse.json()) as ClientSecretPayload;
      if (!tokenResponse.ok || !token.value || !token.model) {
        throw new Error(token.message || 'The secure client-service session could not be started.');
      }

      const { RealtimeAgent, RealtimeSession, tool } = await import('@openai/agents/realtime');
      const lookupNpgLocation = tool({
        name: 'lookup_npg_location',
        description:
          'Look up an NPG appointment site in the caller-safe, versioned directory. Use this before giving any address, floor, suite, office, or arrival instruction.',
        parameters: z.object({
          query: z
            .string()
            .min(2)
            .max(180)
            .describe('City and state or the complete address shown on appointment paperwork')
        }),
        execute: async ({ query }) => {
          locationQuery = query;
          locationResult = await lookupLocation(query);
          return JSON.stringify(locationResult);
        }
      });

      const prepareServiceHandoff = tool({
        name: 'prepare_service_handoff',
        description:
          'Stage a caller-confirmed, minimum-necessary NPG attendance or access handoff in this browser. This does not notify a provider, cancel an appointment, or change a schedule.',
        parameters: z.object({
          noticeType: z.enum([
            'late_arrival',
            'cancellation_notice',
            'access_issue',
            'human_follow_up'
          ]),
          callerName: z.string().min(2).max(100),
          callerOrganization: z.string().min(2).max(100),
          veteranName: z.string().min(2).max(100),
          appointmentDate: z.string().min(2).max(40),
          originalTime: z.string().min(2).max(40),
          location: z.string().min(2).max(180),
          providerName: z.string().min(2).max(100),
          callbackNumber: z.string().min(7).max(40),
          estimatedArrival: z.string().min(2).max(60).optional(),
          issueSummary: z.string().min(2).max(240).optional()
        }),
        execute: async (handoff) => {
          serviceHandoff = handoff;
          return JSON.stringify({
            status: 'prepared_in_browser',
            message:
              'The handoff is prepared on screen. Nothing has been sent, no appointment was changed, and no provider was contacted.'
          });
        }
      });

      const agent = new RealtimeAgent({
        name: 'NPG Client Service Representative',
        voice: npgClientServiceVoice,
        instructions: npgClientServiceInstructions,
        tools: [lookupNpgLocation, prepareServiceHandoff]
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
            output: { voice: npgClientServiceVoice, speed: npgClientServiceSpeed }
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
        if (!disposed) callStatus = 'listening';
      });
      session.on('error', ({ error }) => {
        if (disposed) return;
        errorMessage = toSafeVoiceError(error);
        stopTimer();
        session.close();
        if (activeSession === session) activeSession = null;
        callStatus = 'error';
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
  <meta property="og:image" content={absoluteUrl('/npg-client-service/icon-512.png')} />
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:image" content={absoluteUrl('/npg-client-service/icon-512.png')} />
  <meta name="theme-color" content="#171512" />
  <link rel="icon" href="/npg-client-service/logo-mark.png" sizes="1024x1024" type="image/png" />
  <link rel="icon" href="/npg-client-service/favicon-32.png" sizes="32x32" type="image/png" />
  <link rel="apple-touch-icon" href="/npg-client-service/apple-touch-icon.png" sizes="180x180" />
  <link rel="manifest" href="/npg-client-service/site.webmanifest" />
</svelte:head>

<div class="service-page">
  <section class="service-hero">
    <div class="service-orbit" aria-hidden="true"></div>
    <div class="service-shell hero-grid">
      <div class="hero-copy">
        <span class="service-kicker"><i aria-hidden="true"></i> NPG client service</span>
        <h1>Find the office.<br /><em>Keep the handoff clear.</em></h1>
        <p>
          A dedicated NPG representative for location questions, shared-office access, and
          attendance updates—built to guide the caller without exposing private contact paths or
          changing an appointment.
        </p>
        <div class="hero-principles" aria-label="Client service safeguards">
          <span>Caller-safe directory</span>
          <span>Human help on request</span>
          <span>No scheduling changes</span>
        </div>
        <div class="disclosure" role="note">
          <span aria-hidden="true">
            <img src="/npg-client-service/logo-mark.png" alt="" />
          </span>
          <p>
            <strong>Automated assistance, named up front.</strong>
            The representative explains its role and offers a human path before collecting appointment
            details.
          </p>
        </div>
      </div>

      <section class="service-console" aria-labelledby="service-console-title">
        <div class="console-topline">
          <div>
            <span>Live voice</span>
            <strong id="service-console-title">NPG Representative</strong>
          </div>
          <span class:online={sessionConnected} class="connection-state">
            <i aria-hidden="true"></i>{sessionConnected
              ? 'Connected'
              : callStatus === 'connecting'
                ? 'Connecting'
                : 'Ready'}
          </span>
        </div>
        <div
          class:active={callActive}
          class:speaking={callStatus === 'speaking'}
          class="voice-stage"
        >
          <div class="stage-rings" aria-hidden="true"><i></i><i></i><i></i></div>
          <span class="service-avatar" aria-hidden="true">
            <img src="/npg-client-service/logo-mark.png" alt="" />
          </span>
          <div class="voice-bars" aria-hidden="true">
            {#each [1, 2, 3, 4, 5, 6, 7] as bar}
              <i style={`--delay:${bar * -80}ms;--height:${10 + (bar % 4) * 7}px`}></i>
            {/each}
          </div>
          <strong aria-live="polite">{statusLabel}</strong>
          {#if callActive}<span class="session-clock">{formatDuration(elapsedSeconds)}</span>{/if}
        </div>
        {#if errorMessage}<p class="service-error" role="alert">{errorMessage}</p>{/if}
        <div class="voice-controls">
          {#if !callActive}
            <button class="start-call" type="button" on:click={startVoiceSession}>
              <span aria-hidden="true">◉</span>
              {callStatus === 'idle' ? 'Start client-service session' : 'Start another session'}
            </button>
          {:else}
            <button type="button" on:click={toggleMute} disabled={callStatus === 'connecting'}>
              {muted ? 'Unmute' : 'Mute'}
            </button>
            <button class="end-call" type="button" on:click={endVoiceSession}>End session</button>
          {/if}
        </div>
        <p class="microphone-note">
          Your browser asks for microphone access. Audio is not stored by this site.
        </p>
      </section>
    </div>
  </section>

  <section class="service-workspace">
    <div class="service-shell workspace-grid">
      <div class="directory-column">
        <div class="section-heading">
          <div>
            <span>01 · Caller-safe directory</span>
            <h2>Confirm before guiding.</h2>
          </div>
          <span class="directory-status"
            >{approvedLocationCount} ready · {reviewLocationCount} held</span
          >
        </div>
        <form class="location-search" on:submit|preventDefault={runLocationLookup}>
          <label for="location-query">City and state or appointment address</label>
          <div>
            <input
              id="location-query"
              bind:value={locationQuery}
              placeholder="e.g. East Berlin, CT"
              autocomplete="street-address"
            />
            <button type="submit">Check location</button>
          </div>
        </form>

        <div
          class:matched={locationResult?.status === 'matched'}
          class="location-result"
          aria-live="polite"
        >
          {#if !locationResult}
            <span class="result-index">Directory 01</span>
            <h3>Search before reading an address back.</h3>
            <p>Unknown, incomplete, and ambiguous records stop at a human-confirmation boundary.</p>
          {:else if locationResult.status === 'matched'}
            <span class="result-index">Approved match</span>
            <h3>{locationResult.location.name}</h3>
            <address>
              {#each locationResult.location.addressLines as line}{line}<br />{/each}
            </address>
            <dl>
              {#if locationResult.location.building}<div>
                  <dt>Building</dt>
                  <dd>{locationResult.location.building}</dd>
                </div>{/if}
              {#if locationResult.location.floor}<div>
                  <dt>Floor</dt>
                  <dd>{locationResult.location.floor}</dd>
                </div>{/if}
              {#if locationResult.location.suite}<div>
                  <dt>Suite</dt>
                  <dd>{locationResult.location.suite}</dd>
                </div>{/if}
              {#if locationResult.location.office}<div>
                  <dt>Office</dt>
                  <dd>{locationResult.location.office}</dd>
                </div>{/if}
            </dl>
            <p class="arrival-note">{locationResult.location.arrivalNote}</p>
          {:else}
            <span class="result-index">Human confirmation required</span>
            <h3>Don’t guess the destination.</h3>
            <p>{locationResult.message}</p>
            {'matches' in locationResult && locationResult.matches.length > 0
              ? `Possible match: ${locationResult.matches.join(', ')}`
              : ''}
          {/if}
        </div>
      </div>

      <div class="conversation-column">
        <div class="section-heading">
          <div>
            <span>02 · Guided conversation</span>
            <h2>One reason at a time.</h2>
          </div>
          <span class="session-only">Session only</span>
        </div>
        <div class="intent-row" aria-label="Supported call reasons">
          <span>Location help</span><span>Access issue</span><span>Late arrival</span><span
            >Cancellation notice</span
          >
        </div>
        <div class="transcript" bind:this={transcriptPanel} aria-live="polite">
          {#if transcript.length === 0}
            <div class="empty-transcript">
              <span aria-hidden="true">•••</span>
              <p>The conversation appears here after the voice session begins.</p>
            </div>
          {:else}
            {#each transcript as entry (entry.id)}
              <article class:representative={entry.speaker === 'Concierge'}>
                <span>
                  {#if entry.speaker === 'Concierge'}
                    <img src="/npg-client-service/logo-mark.png" alt="" aria-hidden="true" />
                  {:else}
                    You
                  {/if}
                </span>
                <div>
                  <strong>{entry.speaker === 'Concierge' ? 'NPG Representative' : 'Caller'}</strong>
                  <p>{entry.text}</p>
                </div>
              </article>
            {/each}
          {/if}
        </div>
      </div>

      <aside class:prepared={serviceHandoff} class="handoff-column">
        <div class="section-heading compact">
          <div>
            <span>03 · Controlled handoff</span>
            <h2>{serviceHandoff ? 'Prepared, not sent.' : 'Human delivery stays visible.'}</h2>
          </div>
        </div>
        {#if serviceHandoff}
          <dl class="handoff-rows">
            <div>
              <dt>Reason</dt>
              <dd>{serviceHandoff.noticeType.replaceAll('_', ' ')}</dd>
            </div>
            <div>
              <dt>Appointment</dt>
              <dd>{serviceHandoff.appointmentDate} · {serviceHandoff.originalTime}</dd>
            </div>
            <div>
              <dt>Location</dt>
              <dd>{serviceHandoff.location}</dd>
            </div>
            <div>
              <dt>Provider</dt>
              <dd>{serviceHandoff.providerName}</dd>
            </div>
            {#if serviceHandoff.estimatedArrival}<div>
                <dt>Estimated arrival</dt>
                <dd>{serviceHandoff.estimatedArrival}</dd>
              </div>{/if}
            <div>
              <dt>Callback</dt>
              <dd>{serviceHandoff.callbackNumber}</dd>
            </div>
          </dl>
          <div class="not-sent">
            <i aria-hidden="true"></i><span
              ><strong>Delivery connection pending</strong>No provider or NPG team member has been
              contacted.</span
            >
          </div>
        {:else}
          <p>
            The representative repeats the minimum-necessary summary for confirmation. A prepared
            record appears here, while provider notification remains blocked until NPG approves the
            delivery path.
          </p>
          <div class="handoff-placeholder" aria-hidden="true">
            <span></span><span></span><span></span><span></span>
          </div>
        {/if}
      </aside>
    </div>
  </section>

  <section class="service-boundary">
    <div class="service-shell boundary-grid">
      <div>
        <span>Database · Automation · Judgment</span>
        <h2>Useful now.<br /><em>Safe by construction.</em></h2>
      </div>
      <div class="boundary-list">
        <article>
          <span>01</span><strong>Directory</strong>
          <p>Only caller-safe fields reach the voice session. Unclear records stop.</p>
        </article>
        <article>
          <span>02</span><strong>Representative</strong>
          <p>Guides, confirms, and prepares. It never changes the appointment.</p>
        </article>
        <article>
          <span>03</span><strong>NPG team</strong>
          <p>Owns provider contact, scheduling decisions, and unresolved cases.</p>
        </article>
      </div>
    </div>
  </section>
</div>

<style>
  :global(body) {
    background: #faf5ef;
  }
  .service-page {
    --ink: #171512;
    --deep: #020202;
    --paper: #faf5ef;
    --bright: #fffaf4;
    --tan: #af7c54;
    --tan-soft: #d7b79e;
    --blue: #1d6f8a;
    color: var(--ink);
    background: var(--paper);
  }
  .service-shell {
    width: min(calc(100% - 64px), 1380px);
    margin-inline: auto;
  }
  .service-hero {
    position: relative;
    overflow: hidden;
    padding: clamp(100px, 12vw, 174px) 0 clamp(86px, 10vw, 140px);
    background:
      radial-gradient(circle at 88% 18%, rgba(175, 124, 84, 0.16), transparent 26%), var(--paper);
  }
  .service-orbit {
    position: absolute;
    width: 680px;
    aspect-ratio: 1;
    border: 1px solid rgba(175, 124, 84, 0.2);
    border-radius: 50%;
    right: -270px;
    top: -350px;
  }
  .hero-grid {
    position: relative;
    display: grid;
    grid-template-columns: minmax(0, 1.04fr) minmax(420px, 0.72fr);
    gap: clamp(64px, 8vw, 132px);
    align-items: center;
  }
  .service-kicker,
  .section-heading span,
  .boundary-grid > div > span,
  .result-index {
    color: var(--blue);
    font-family: var(--font-mono, ui-monospace, monospace);
    font-size: 0.72rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }
  .service-kicker {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .service-kicker i {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: var(--blue);
    box-shadow: 0 0 0 6px rgba(29, 111, 138, 0.1);
  }
  .hero-copy h1 {
    margin: 44px 0 30px;
    max-width: 820px;
    font-size: clamp(4.2rem, 7.1vw, 7.5rem);
    font-weight: 600;
    letter-spacing: -0.075em;
    line-height: 0.87;
  }
  .hero-copy h1 em,
  .boundary-grid h2 em {
    color: var(--tan);
    font-family: Georgia, serif;
    font-weight: 400;
  }
  .hero-copy > p {
    max-width: 750px;
    margin: 0;
    color: #69645e;
    font-size: clamp(1.05rem, 1.35vw, 1.3rem);
    line-height: 1.55;
  }
  .hero-principles {
    display: flex;
    flex-wrap: wrap;
    gap: 22px;
    margin-top: 34px;
    color: #5f5a54;
    font-size: 0.86rem;
  }
  .hero-principles span::before {
    content: '✓';
    margin-right: 8px;
    color: var(--tan);
  }
  .disclosure {
    display: flex;
    align-items: flex-start;
    gap: 15px;
    max-width: 700px;
    margin-top: 34px;
    padding: 18px 20px;
    border: 1px solid rgba(23, 21, 18, 0.1);
    border-radius: 20px;
    background: rgba(255, 250, 244, 0.76);
  }
  .disclosure > span {
    display: grid;
    place-items: center;
    flex: 0 0 34px;
    height: 34px;
    border-radius: 50%;
    background: white;
    border: 1px solid rgba(23, 21, 18, 0.1);
  }
  .disclosure > span img {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    object-fit: cover;
  }
  .disclosure p {
    margin: 0;
    color: #67615a;
    line-height: 1.45;
  }
  .disclosure strong {
    display: block;
    margin-bottom: 4px;
    color: var(--ink);
  }
  .service-console {
    position: relative;
    overflow: hidden;
    padding: 28px;
    border-radius: 36px;
    background:
      radial-gradient(circle at 75% 25%, rgba(29, 111, 138, 0.2), transparent 30%), var(--deep);
    color: white;
    box-shadow: 0 30px 70px rgba(23, 21, 18, 0.2);
  }
  .console-topline {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 20px;
  }
  .console-topline > div {
    display: grid;
    gap: 5px;
  }
  .console-topline > div span {
    color: var(--tan-soft);
    font-family: var(--font-mono, ui-monospace, monospace);
    font-size: 0.65rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }
  .console-topline strong {
    font-size: 1rem;
  }
  .connection-state {
    display: flex;
    align-items: center;
    gap: 8px;
    color: rgba(255, 255, 255, 0.5);
    font-size: 0.72rem;
  }
  .connection-state i {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #736e68;
  }
  .connection-state.online i {
    background: #78d5d9;
    box-shadow: 0 0 0 5px rgba(120, 213, 217, 0.1);
  }
  .voice-stage {
    position: relative;
    display: grid;
    place-items: center;
    min-height: 360px;
    margin: 25px 0;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 26px;
    background: rgba(255, 255, 255, 0.025);
  }
  .service-avatar {
    display: grid;
    place-items: center;
    width: 86px;
    height: 86px;
    border-radius: 50%;
    border: 1px solid rgba(255, 255, 255, 0.12);
    background: var(--bright);
    box-shadow: 0 14px 42px rgba(0, 0, 0, 0.24);
    z-index: 2;
  }
  .service-avatar img {
    width: 86px;
    height: 86px;
    border-radius: 50%;
    object-fit: cover;
  }
  .stage-rings {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
  }
  .stage-rings i {
    position: absolute;
    width: 150px;
    aspect-ratio: 1;
    border: 1px solid rgba(215, 183, 158, 0.22);
    border-radius: 50%;
  }
  .stage-rings i:nth-child(2) {
    width: 230px;
  }
  .stage-rings i:nth-child(3) {
    width: 310px;
  }
  .voice-stage.active .stage-rings i {
    animation: pulse 2.8s ease-out infinite;
  }
  .voice-stage.active .stage-rings i:nth-child(2) {
    animation-delay: 0.4s;
  }
  .voice-stage.active .stage-rings i:nth-child(3) {
    animation-delay: 0.8s;
  }
  .voice-bars {
    display: flex;
    align-items: center;
    gap: 4px;
    height: 40px;
    z-index: 2;
  }
  .voice-bars i {
    width: 3px;
    height: 6px;
    border-radius: 4px;
    background: var(--tan-soft);
  }
  .voice-stage.speaking .voice-bars i {
    animation: bars 0.7s ease-in-out infinite alternate;
    animation-delay: var(--delay);
    height: var(--height);
  }
  .voice-stage > strong {
    z-index: 2;
    font-size: 0.85rem;
  }
  .session-clock {
    z-index: 2;
    color: rgba(255, 255, 255, 0.45);
    font-family: var(--font-mono, ui-monospace, monospace);
    font-size: 0.68rem;
  }
  .voice-controls {
    display: flex;
    gap: 10px;
  }
  .voice-controls button {
    min-height: 54px;
    padding: 0 20px;
    border: 0;
    border-radius: 999px;
    font: inherit;
    font-weight: 650;
    cursor: pointer;
  }
  .start-call {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 10px;
    width: 100%;
    background: var(--tan-soft);
    color: var(--deep);
  }
  .end-call {
    background: var(--tan);
    color: var(--deep);
  }
  .microphone-note {
    margin: 16px 0 0;
    color: rgba(255, 255, 255, 0.42);
    font-size: 0.72rem;
    text-align: center;
  }
  .service-error {
    padding: 12px 14px;
    border-radius: 12px;
    background: #4f221e;
    color: #ffdcd7;
    font-size: 0.8rem;
  }
  .service-workspace {
    padding: clamp(84px, 10vw, 140px) 0;
    background: var(--bright);
  }
  .workspace-grid {
    display: grid;
    grid-template-columns: 1.05fr 1fr 0.8fr;
    gap: 24px;
    align-items: start;
  }
  .directory-column,
  .conversation-column,
  .handoff-column {
    min-width: 0;
  }
  .section-heading {
    display: flex;
    justify-content: space-between;
    gap: 20px;
    align-items: flex-start;
    margin-bottom: 28px;
  }
  .section-heading > div {
    display: grid;
    gap: 12px;
  }
  .section-heading h2 {
    margin: 0;
    font-size: clamp(2rem, 3vw, 3.2rem);
    font-weight: 560;
    letter-spacing: -0.055em;
    line-height: 1;
  }
  .directory-status,
  .session-only {
    padding: 8px 10px;
    border: 1px solid rgba(23, 21, 18, 0.1);
    border-radius: 999px;
    color: #706a63 !important;
    font-family: inherit !important;
    font-size: 0.66rem !important;
    letter-spacing: 0 !important;
    text-transform: none !important;
    white-space: nowrap;
  }
  .location-search {
    display: grid;
    gap: 9px;
    margin-bottom: 18px;
  }
  .location-search label {
    color: #6c665f;
    font-size: 0.77rem;
  }
  .location-search > div {
    display: flex;
    padding: 5px;
    border: 1px solid rgba(23, 21, 18, 0.14);
    border-radius: 999px;
    background: white;
  }
  .location-search input {
    min-width: 0;
    flex: 1;
    padding: 0 15px;
    border: 0;
    outline: 0;
    background: transparent;
    font: inherit;
  }
  .location-search button {
    padding: 14px 18px;
    border: 0;
    border-radius: 999px;
    background: var(--deep);
    color: white;
    font: inherit;
    font-weight: 650;
    cursor: pointer;
  }
  .location-result,
  .transcript,
  .handoff-column {
    border: 1px solid rgba(23, 21, 18, 0.1);
    border-radius: 26px;
    background: white;
  }
  .location-result {
    min-height: 330px;
    padding: 27px;
  }
  .location-result.matched {
    border-color: rgba(29, 111, 138, 0.32);
    box-shadow: inset 0 4px 0 var(--blue);
  }
  .location-result h3 {
    margin: 20px 0 12px;
    font-size: 1.4rem;
  }
  .location-result p {
    color: #6b655e;
    line-height: 1.55;
  }
  .location-result address {
    margin-bottom: 20px;
    font-size: 1.12rem;
    font-style: normal;
    line-height: 1.55;
  }
  .location-result dl,
  .handoff-rows {
    display: grid;
    margin: 0;
  }
  .location-result dl div,
  .handoff-rows div {
    display: flex;
    justify-content: space-between;
    gap: 20px;
    padding: 11px 0;
    border-top: 1px solid rgba(23, 21, 18, 0.08);
  }
  dt {
    color: #777069;
    font-size: 0.75rem;
  }
  dd {
    margin: 0;
    font-size: 0.82rem;
    font-weight: 650;
    text-align: right;
    text-transform: capitalize;
  }
  .arrival-note {
    padding: 15px;
    border-radius: 14px;
    background: #f6eee6;
    color: #54483e !important;
    font-size: 0.8rem;
  }
  .intent-row {
    display: flex;
    flex-wrap: wrap;
    gap: 7px;
    margin-bottom: 18px;
  }
  .intent-row span {
    padding: 8px 10px;
    border-radius: 999px;
    background: #f3e7dc;
    color: #72563f;
    font-size: 0.68rem;
  }
  .transcript {
    height: 400px;
    overflow: auto;
    padding: 16px 22px;
  }
  .empty-transcript {
    display: grid;
    place-items: center;
    align-content: center;
    height: 100%;
    color: #8c857d;
    text-align: center;
  }
  .empty-transcript span {
    color: var(--tan);
    letter-spacing: 0.4em;
  }
  .transcript article {
    display: flex;
    gap: 12px;
    padding: 18px 0;
    border-bottom: 1px solid rgba(23, 21, 18, 0.08);
  }
  .transcript article > span {
    display: grid;
    place-items: center;
    flex: 0 0 34px;
    height: 34px;
    border-radius: 50%;
    background: #eae6e0;
    color: #4a4540;
    font-size: 0.68rem;
  }
  .transcript article.representative > span {
    border: 1px solid rgba(23, 21, 18, 0.1);
    background: var(--bright);
  }
  .transcript article.representative > span img {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    object-fit: cover;
  }
  .transcript article strong {
    font-size: 0.78rem;
  }
  .transcript article p {
    margin: 5px 0 0;
    color: #625d57;
    font-size: 0.86rem;
    line-height: 1.45;
  }
  .handoff-column {
    padding: 25px;
    background: var(--deep);
    color: white;
  }
  .handoff-column .section-heading {
    margin-bottom: 18px;
  }
  .handoff-column .section-heading h2 {
    font-size: 1.8rem;
  }
  .handoff-column > p {
    color: rgba(255, 255, 255, 0.56);
    line-height: 1.55;
  }
  .handoff-placeholder {
    display: grid;
    gap: 10px;
    margin-top: 28px;
  }
  .handoff-placeholder span {
    height: 42px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.035);
  }
  .handoff-rows div {
    border-color: rgba(255, 255, 255, 0.1);
  }
  .handoff-rows dt {
    color: rgba(255, 255, 255, 0.45);
  }
  .handoff-rows dd {
    color: white;
  }
  .not-sent {
    display: flex;
    gap: 12px;
    margin-top: 22px;
    padding: 14px;
    border-radius: 15px;
    background: rgba(175, 124, 84, 0.15);
  }
  .not-sent i {
    flex: 0 0 9px;
    height: 9px;
    margin-top: 5px;
    border-radius: 50%;
    background: var(--tan-soft);
  }
  .not-sent span {
    color: rgba(255, 255, 255, 0.58);
    font-size: 0.72rem;
    line-height: 1.4;
  }
  .not-sent strong {
    display: block;
    margin-bottom: 3px;
    color: white;
  }
  .service-boundary {
    padding: clamp(90px, 11vw, 150px) 0;
    background: var(--deep);
    color: white;
  }
  .boundary-grid {
    display: grid;
    grid-template-columns: 0.8fr 1.2fr;
    gap: clamp(60px, 8vw, 130px);
  }
  .boundary-grid h2 {
    margin: 28px 0 0;
    font-size: clamp(3.2rem, 5.5vw, 6.2rem);
    font-weight: 520;
    letter-spacing: -0.065em;
    line-height: 0.92;
  }
  .boundary-list article {
    display: grid;
    grid-template-columns: 50px 150px 1fr;
    gap: 20px;
    padding: 28px 0;
    border-top: 1px solid rgba(255, 255, 255, 0.12);
    align-items: start;
  }
  .boundary-list article > span {
    color: var(--tan-soft);
    font-family: var(--font-mono, ui-monospace, monospace);
    font-size: 0.7rem;
  }
  .boundary-list strong {
    font-size: 1rem;
  }
  .boundary-list p {
    margin: 0;
    color: rgba(255, 255, 255, 0.52);
    line-height: 1.5;
  }
  @keyframes pulse {
    0% {
      opacity: 0.45;
      transform: scale(0.72);
    }
    100% {
      opacity: 0;
      transform: scale(1.2);
    }
  }
  @keyframes bars {
    from {
      height: 6px;
    }
    to {
      height: var(--height);
    }
  }
  @media (max-width: 1100px) {
    .hero-grid,
    .boundary-grid {
      grid-template-columns: 1fr;
    }
    .workspace-grid {
      grid-template-columns: 1fr 1fr;
    }
    .handoff-column {
      grid-column: 1/-1;
    }
    .service-console {
      max-width: 700px;
    }
    .boundary-list article {
      grid-template-columns: 42px 130px 1fr;
    }
  }
  @media (max-width: 720px) {
    .service-shell {
      width: min(calc(100% - 32px), 1380px);
    }
    .service-hero {
      padding: 72px 0 80px;
    }
    .hero-grid {
      gap: 48px;
    }
    .hero-copy h1 {
      margin-top: 34px;
      font-size: clamp(3.3rem, 16vw, 5.2rem);
    }
    .hero-principles {
      display: grid;
      gap: 12px;
    }
    .service-console {
      padding: 18px;
      border-radius: 26px;
    }
    .voice-stage {
      min-height: 310px;
    }
    .workspace-grid {
      grid-template-columns: 1fr;
    }
    .handoff-column {
      grid-column: auto;
    }
    .section-heading {
      display: grid;
    }
    .location-search > div {
      border-radius: 20px;
      display: grid;
    }
    .location-search input {
      min-height: 52px;
    }
    .location-search button {
      width: 100%;
    }
    .boundary-list article {
      grid-template-columns: 34px 1fr;
    }
    .boundary-list article p {
      grid-column: 2;
    }
    .boundary-grid h2 {
      font-size: 3.7rem;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .voice-stage.active .stage-rings i,
    .voice-stage.speaking .voice-bars i {
      animation: none;
    }
  }
</style>
