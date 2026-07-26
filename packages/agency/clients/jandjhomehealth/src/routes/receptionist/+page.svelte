<script lang="ts">
	import { onDestroy, tick } from 'svelte';
	import {
		ArrowLeft,
		CheckCircle2,
		Clock3,
		HeartHandshake,
		Mic,
		MicOff,
		Phone,
		PhoneOff,
		RotateCcw,
		ShieldCheck,
		Sparkles,
		Volume2
	} from 'lucide-svelte';
	import { z } from 'zod';
	import type { RealtimeSession } from '@openai/agents/realtime';

	import { toSafeVoiceError } from '$lib/receptionist/errors';
	import {
		receptionistInstructions,
		receptionistVoice,
		receptionistVoiceSpeed
	} from '$lib/receptionist/knowledge';
	import { toTranscriptEntries, type TranscriptEntry } from '$lib/receptionist/transcript';

	type CallStatus = 'idle' | 'connecting' | 'listening' | 'speaking' | 'ended' | 'error';

	interface CallbackRequest {
		firstName: string;
		callbackNumber: string;
		reason: string;
	}

	interface ClientSecretPayload {
		value?: string;
		expiresAt?: number;
		model?: string;
		message?: string;
	}

	let callStatus = $state<CallStatus>('idle');
	let muted = $state(false);
	let transcript = $state<TranscriptEntry[]>([]);
	let callbackRequest = $state<CallbackRequest | null>(null);
	let errorMessage = $state<string | null>(null);
	let elapsedSeconds = $state(0);
	let interruptions = $state(0);
	let transcriptPanel = $state<HTMLElement | null>(null);

	let activeSession: RealtimeSession | null = null;
	let callTimer: ReturnType<typeof setInterval> | null = null;
	let disposed = false;

	const callActive = $derived(
		callStatus === 'connecting' || callStatus === 'listening' || callStatus === 'speaking'
	);
	const sessionConnected = $derived(callStatus === 'listening' || callStatus === 'speaking');
	const statusLabel = $derived.by(() => {
		if (callStatus === 'connecting') return 'Connecting securely';
		if (callStatus === 'listening') return muted ? 'Microphone muted' : 'Listening';
		if (callStatus === 'speaking') return 'Jamie is speaking';
		if (callStatus === 'ended') return 'Demo call ended';
		if (callStatus === 'error') return 'Connection needs attention';
		return 'Ready for a demo call';
	});

	function formatDuration(seconds: number): string {
		const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
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
		transcript = toTranscriptEntries(history);
		await tick();
		transcriptPanel?.scrollTo({ top: transcriptPanel.scrollHeight, behavior: 'smooth' });
	}

	async function startCall() {
		if (callActive) return;

		errorMessage = null;
		callbackRequest = null;
		transcript = [];
		elapsedSeconds = 0;
		interruptions = 0;
		muted = false;
		callStatus = 'connecting';

		try {
			if (!navigator.mediaDevices?.getUserMedia) {
				throw new Error('This browser does not provide microphone access for the demo.');
			}

			const tokenResponse = await fetch('/api/receptionist/session', {
				method: 'POST',
				headers: { Accept: 'application/json' }
			});
			const token = (await tokenResponse.json()) as ClientSecretPayload;
			if (!tokenResponse.ok || !token.value || !token.model) {
				throw new Error(token.message || 'The secure voice session could not be started.');
			}

			const { RealtimeAgent, RealtimeSession, tool } = await import('@openai/agents/realtime');
			const prepareCallbackRequest = tool({
				name: 'prepare_callback_request',
				description:
					'Prepare a session-only simulated callback after confirming fictional caller details. This never contacts real staff.',
				parameters: z.object({
					firstName: z.string().min(1).max(40).describe('A fictional first name or alias'),
					callbackNumber: z.string().min(7).max(30).describe('A fictional callback number'),
					reason: z.string().min(3).max(140).describe('A broad, non-clinical reason for the callback')
				}),
				execute: async ({ firstName, callbackNumber, reason }) => {
					callbackRequest = { firstName, callbackNumber, reason };
					return JSON.stringify({
						status: 'simulated_only',
						message: 'Demo callback prepared. No real staff member was contacted.'
					});
				}
			});

			const agent = new RealtimeAgent({
				name: 'Jamie — J&J virtual receptionist',
				voice: receptionistVoice,
				instructions: receptionistInstructions,
				tools: [prepareCallbackRequest]
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
						output: { voice: receptionistVoice, speed: receptionistVoiceSpeed }
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

	function endCall() {
		activeSession?.close();
		activeSession = null;
		stopTimer();
		muted = false;
		if (!disposed) callStatus = 'ended';
	}

	function resetDemo() {
		endCall();
		callStatus = 'idle';
		errorMessage = null;
		transcript = [];
		callbackRequest = null;
		elapsedSeconds = 0;
		interruptions = 0;
	}

	onDestroy(() => {
		disposed = true;
		activeSession?.close();
		activeSession = null;
		stopTimer();
	});
</script>

<svelte:head>
	<title>Voice Receptionist Demo | J and J Home Health</title>
	<meta
		name="description"
		content="Try a voice-to-voice virtual receptionist demo for J and J Home Health using fictional information."
	/>
	<meta name="robots" content="noindex" />
</svelte:head>

<main class="receptionist-page">
	<header class="demo-header">
		<a class="back-link" href="/">
			<ArrowLeft size={17} aria-hidden="true" />
			<span>J&amp;J Home Health</span>
		</a>
		<div class="demo-label"><Sparkles size={15} aria-hidden="true" /> Voice receptionist demo</div>
	</header>

	<section class="intro" aria-labelledby="demo-title">
		<p class="eyebrow">A natural first hello</p>
		<h1 id="demo-title">Meet Jamie, your virtual receptionist.</h1>
		<p>
			Speak naturally. Ask about home-health services, next steps, or prepare a fictional
			callback request. Jamie listens, responds, and knows when a person should take over.
		</p>
	</section>

	<div class="demo-disclosure" role="note">
		<ShieldCheck size={20} aria-hidden="true" />
		<div>
			<strong>Use fictional information only.</strong>
			<span>This demo does not save audio, transcripts, contact details, or health information.</span>
		</div>
	</div>

	<div class="demo-grid">
		<section class="call-card" aria-labelledby="call-heading">
			<div class="call-meta">
				<div>
					<p class="card-kicker">Live call</p>
					<h2 id="call-heading">J&amp;J reception</h2>
				</div>
				<div class:online={sessionConnected} class="connection-pill">
					<span></span>{sessionConnected ? 'Connected' : callStatus === 'connecting' ? 'Connecting' : 'Demo line'}
				</div>
			</div>

			<div class:active={callActive} class:speaking={callStatus === 'speaking'} class="agent-stage">
				<div class="voice-rings" aria-hidden="true"><span></span><span></span><span></span></div>
				<div class="agent-avatar"><HeartHandshake size={34} aria-hidden="true" /></div>
				<div class="agent-identity">
					<strong>Jamie</strong>
					<span>Virtual receptionist</span>
				</div>
				<div class="voice-bars" aria-hidden="true">
					{#each [1, 2, 3, 4, 5, 6, 7] as bar}
						<span style={`--bar-delay:${bar * -80}ms;--bar-height:${10 + (bar % 4) * 6}px`}></span>
					{/each}
				</div>
				<p class="status" aria-live="polite">
					{#if callStatus === 'speaking'}<Volume2 size={16} aria-hidden="true" />{:else}<Mic
							size={16}
							aria-hidden="true"
						/> {/if}{statusLabel}
				</p>
				{#if callActive}
					<div class="call-clock"><Clock3 size={14} aria-hidden="true" /> {formatDuration(elapsedSeconds)}</div>
				{/if}
			</div>

			{#if errorMessage}
				<div class="call-error" role="alert">{errorMessage}</div>
			{/if}

			<div class="call-controls">
				{#if !callActive && callStatus !== 'connecting'}
					<button class="start-button" type="button" onclick={startCall}>
						<Phone size={20} aria-hidden="true" />
						{callStatus === 'idle' ? 'Start demo call' : 'Start another call'}
					</button>
				{:else}
					<button
						class="round-control"
						class:muted
						type="button"
						onclick={toggleMute}
						disabled={callStatus === 'connecting'}
						aria-label={muted ? 'Unmute microphone' : 'Mute microphone'}
					>
						{#if muted}<MicOff size={22} aria-hidden="true" />{:else}<Mic size={22} aria-hidden="true" />{/if}
					</button>
					<button class="end-button" type="button" onclick={endCall}>
						<PhoneOff size={21} aria-hidden="true" /> End call
					</button>
				{/if}
				{#if callStatus === 'error'}
					<button class="reset-button" type="button" onclick={resetDemo}>
						<RotateCcw size={18} aria-hidden="true" /> Reset
					</button>
				{/if}
			</div>

			<p class="permission-note">Your browser will ask for microphone access when the call starts.</p>
		</section>

		<aside class="guide-card" aria-labelledby="try-heading">
			<p class="card-kicker">Try a conversation</p>
			<h2 id="try-heading">A few ways to begin</h2>
			<div class="prompt-list">
				<div><span>01</span><p>“My parent may need help after coming home from the hospital.”</p></div>
				<div><span>02</span><p>“What kinds of home-health services can you explain?”</p></div>
				<div><span>03</span><p>“Can you prepare a fictional callback request for me?”</p></div>
			</div>
			<div class="barge-in-tip">
				<Volume2 size={18} aria-hidden="true" />
				<p><strong>Try interrupting.</strong> Begin speaking while Jamie responds to test natural turn-taking.</p>
			</div>
			<div class="boundary-note">
				<ShieldCheck size={18} aria-hidden="true" />
				<p>For a life-threatening emergency, Jamie will tell the caller to hang up and call 911.</p>
			</div>
		</aside>
	</div>

	<section class="session-card" aria-labelledby="transcript-heading">
		<div class="session-heading">
			<div>
				<p class="card-kicker">Session view</p>
				<h2 id="transcript-heading">Live transcript</h2>
			</div>
			<span>Not saved</span>
		</div>

		<div class="transcript" bind:this={transcriptPanel} aria-live="polite" aria-relevant="additions text">
			{#if transcript.length === 0}
				<div class="empty-transcript">
					<Mic size={24} aria-hidden="true" />
					<p>Your fictional conversation will appear here after the call begins.</p>
				</div>
			{:else}
				{#each transcript as entry (entry.id)}
					<article class:jamie={entry.speaker === 'Jamie'} class="transcript-entry">
						<div class="speaker-mark">{entry.speaker === 'Jamie' ? 'J' : 'C'}</div>
						<div>
							<strong>{entry.speaker}</strong>
							<p>{entry.text}</p>
						</div>
					</article>
				{/each}
			{/if}
		</div>

		{#if callbackRequest}
			<div class="handoff-card">
				<CheckCircle2 size={22} aria-hidden="true" />
				<div>
					<strong>Simulated callback prepared</strong>
					<p>{callbackRequest.firstName} · {callbackRequest.callbackNumber}</p>
					<span>{callbackRequest.reason}</span>
					<small>No real staff member was contacted.</small>
				</div>
			</div>
		{/if}

		{#if interruptions > 0}
			<p class="interrupt-proof"><CheckCircle2 size={15} aria-hidden="true" /> Interruption detected and handled.</p>
		{/if}
	</section>

	<footer class="demo-footer">
		<p><strong>Demo boundary:</strong> No scheduling, record access, benefit verification, or real callback delivery.</p>
		<a href="tel:+18179993839"><Phone size={15} aria-hidden="true" /> Call J&amp;J at (817) 999-3839</a>
	</footer>
</main>

<style>
	:global(body) {
		margin: 0;
		background: #f4f7f5;
		color: #132f29;
	}

	:global(button),
	:global(a) {
		-webkit-tap-highlight-color: transparent;
	}

	.receptionist-page {
		min-height: 100vh;
		padding: 0 28px 48px;
		background:
			radial-gradient(circle at 78% 8%, rgba(130, 188, 165, 0.22), transparent 28rem),
			linear-gradient(180deg, #fbfcfb 0%, #f3f7f5 48%, #edf3f0 100%);
		font-family: 'Avenir', 'Avenir Next', system-ui, sans-serif;
	}

	.demo-header {
		max-width: 1180px;
		margin: 0 auto;
		padding: 24px 0;
		display: flex;
		align-items: center;
		justify-content: space-between;
		border-bottom: 1px solid rgba(19, 47, 41, 0.1);
	}

	.back-link,
	.demo-label,
	.connection-pill,
	.status,
	.call-clock,
	.demo-footer a {
		display: inline-flex;
		align-items: center;
		gap: 8px;
	}

	.back-link {
		color: #173f36;
		font-size: 14px;
		font-weight: 700;
		text-decoration: none;
	}

	.demo-label {
		padding: 8px 12px;
		border: 1px solid rgba(31, 111, 88, 0.2);
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.72);
		color: #1f6f58;
		font-size: 12px;
		font-weight: 800;
		letter-spacing: 0.05em;
		text-transform: uppercase;
	}

	.intro {
		max-width: 760px;
		margin: 72px auto 30px;
		text-align: center;
	}

	.eyebrow,
	.card-kicker {
		margin: 0 0 10px;
		color: #1f7a5f;
		font-size: 12px;
		font-weight: 900;
		letter-spacing: 0.12em;
		text-transform: uppercase;
	}

	.intro h1 {
		margin: 0;
		font-family: 'Avenir Heavy', 'Avenir Next', system-ui, sans-serif;
		font-size: clamp(38px, 6vw, 68px);
		line-height: 0.98;
		letter-spacing: -0.045em;
	}

	.intro > p:last-child {
		max-width: 650px;
		margin: 24px auto 0;
		color: #506b64;
		font-size: 18px;
		line-height: 1.65;
	}

	.demo-disclosure {
		max-width: 760px;
		margin: 0 auto 42px;
		padding: 15px 18px;
		display: flex;
		gap: 13px;
		align-items: flex-start;
		border: 1px solid #cee0d8;
		border-radius: 15px;
		background: rgba(255, 255, 255, 0.7);
		color: #27604e;
	}

	.demo-disclosure strong,
	.demo-disclosure span {
		display: block;
	}

	.demo-disclosure strong {
		font-size: 14px;
	}

	.demo-disclosure span {
		margin-top: 3px;
		font-size: 13px;
		line-height: 1.45;
	}

	.demo-grid,
	.session-card,
	.demo-footer {
		max-width: 1080px;
		margin-left: auto;
		margin-right: auto;
	}

	.demo-grid {
		display: grid;
		grid-template-columns: minmax(0, 1.25fr) minmax(300px, 0.75fr);
		gap: 22px;
		align-items: stretch;
	}

	.call-card,
	.guide-card,
	.session-card {
		border: 1px solid rgba(19, 47, 41, 0.1);
		border-radius: 26px;
		background: rgba(255, 255, 255, 0.9);
		box-shadow: 0 22px 65px rgba(26, 69, 57, 0.08);
	}

	.call-card {
		padding: 28px;
	}

	.call-meta,
	.session-heading {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 24px;
	}

	.call-meta h2,
	.guide-card h2,
	.session-heading h2 {
		margin: 0;
		font-size: 24px;
		letter-spacing: -0.025em;
	}

	.connection-pill {
		padding: 7px 10px;
		border-radius: 999px;
		background: #edf2f0;
		color: #6b7e78;
		font-size: 12px;
		font-weight: 700;
	}

	.connection-pill span {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background: #9da9a5;
	}

	.connection-pill.online {
		background: #e4f5ec;
		color: #176447;
	}

	.connection-pill.online span {
		background: #2ba36f;
		box-shadow: 0 0 0 4px rgba(43, 163, 111, 0.12);
	}

	.agent-stage {
		position: relative;
		min-height: 360px;
		margin-top: 26px;
		padding: 34px 24px 28px;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		overflow: hidden;
		border-radius: 21px;
		background:
			linear-gradient(150deg, rgba(255, 255, 255, 0.04), transparent 42%),
			linear-gradient(145deg, #173f36, #0f2e28);
		color: white;
	}

	.agent-stage::before {
		content: '';
		position: absolute;
		inset: 0;
		background-image: radial-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px);
		background-size: 18px 18px;
		mask-image: linear-gradient(to bottom, rgba(0, 0, 0, 0.6), transparent 80%);
	}

	.agent-avatar {
		position: relative;
		z-index: 2;
		width: 94px;
		height: 94px;
		display: grid;
		place-items: center;
		border: 1px solid rgba(255, 255, 255, 0.28);
		border-radius: 50%;
		background: linear-gradient(145deg, #84c3a8, #438d70);
		box-shadow: 0 18px 50px rgba(0, 0, 0, 0.24);
	}

	.voice-rings,
	.voice-rings span {
		position: absolute;
		border-radius: 50%;
	}

	.voice-rings {
		z-index: 1;
		width: 94px;
		height: 94px;
	}

	.voice-rings span {
		inset: 0;
		border: 1px solid rgba(143, 214, 183, 0.32);
		opacity: 0;
	}

	.agent-stage.active .voice-rings span {
		animation: voice-ring 2.7s ease-out infinite;
	}

	.agent-stage.active .voice-rings span:nth-child(2) { animation-delay: 0.9s; }
	.agent-stage.active .voice-rings span:nth-child(3) { animation-delay: 1.8s; }

	.agent-identity {
		position: relative;
		z-index: 2;
		margin-top: 18px;
		text-align: center;
	}

	.agent-identity strong,
	.agent-identity span {
		display: block;
	}

	.agent-identity strong {
		font-size: 22px;
	}

	.agent-identity span {
		margin-top: 3px;
		color: rgba(255, 255, 255, 0.65);
		font-size: 13px;
	}

	.voice-bars {
		position: relative;
		z-index: 2;
		height: 35px;
		margin-top: 22px;
		display: flex;
		align-items: center;
		gap: 5px;
	}

	.voice-bars span {
		width: 4px;
		height: 5px;
		border-radius: 4px;
		background: #9fddc3;
		transition: height 180ms ease;
	}

	.agent-stage.speaking .voice-bars span {
		animation: voice-bar 0.75s ease-in-out infinite alternate;
		animation-delay: var(--bar-delay);
	}

	.status {
		position: relative;
		z-index: 2;
		margin: 8px 0 0;
		color: #d8ebe3;
		font-size: 13px;
		font-weight: 700;
	}

	.call-clock {
		position: absolute;
		top: 18px;
		right: 18px;
		z-index: 2;
		color: rgba(255, 255, 255, 0.62);
		font-size: 12px;
		font-variant-numeric: tabular-nums;
	}

	.call-error {
		margin-top: 14px;
		padding: 12px 14px;
		border: 1px solid #f0c5c0;
		border-radius: 12px;
		background: #fff2f0;
		color: #89382f;
		font-size: 13px;
		line-height: 1.45;
	}

	.call-controls {
		min-height: 56px;
		margin-top: 20px;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 12px;
	}

	.call-controls button {
		border: 0;
		font: inherit;
		font-weight: 800;
		cursor: pointer;
		transition: transform 150ms ease, box-shadow 150ms ease, background 150ms ease;
	}

	.call-controls button:hover:not(:disabled) { transform: translateY(-1px); }
	.call-controls button:focus-visible { outline: 3px solid rgba(37, 132, 99, 0.35); outline-offset: 3px; }
	.call-controls button:disabled { cursor: wait; opacity: 0.55; }

	.start-button,
	.end-button,
	.reset-button {
		min-height: 52px;
		padding: 0 22px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 9px;
		border-radius: 999px;
	}

	.start-button {
		background: #1f7659;
		color: white;
		box-shadow: 0 12px 28px rgba(31, 118, 89, 0.22);
	}

	.end-button { background: #a83d35; color: white; }
	.reset-button { background: #e8efec; color: #234e42; }

	.round-control {
		width: 52px;
		height: 52px;
		display: grid;
		place-items: center;
		border-radius: 50%;
		background: #e8efec;
		color: #244f43;
	}

	.round-control.muted { background: #ffebe8; color: #9b3931; }

	.permission-note {
		margin: 12px 0 0;
		color: #788983;
		font-size: 12px;
		text-align: center;
	}

	.guide-card {
		padding: 31px;
		background: #fbfcfb;
	}

	.prompt-list {
		margin-top: 28px;
		display: grid;
		gap: 10px;
	}

	.prompt-list > div {
		padding: 15px;
		display: grid;
		grid-template-columns: 30px 1fr;
		gap: 11px;
		align-items: start;
		border: 1px solid #e0e8e4;
		border-radius: 14px;
		background: white;
	}

	.prompt-list span {
		width: 27px;
		height: 27px;
		display: grid;
		place-items: center;
		border-radius: 50%;
		background: #e7f2ed;
		color: #2b765e;
		font-size: 10px;
		font-weight: 900;
	}

	.prompt-list p,
	.barge-in-tip p,
	.boundary-note p {
		margin: 0;
		color: #49635b;
		font-size: 13px;
		line-height: 1.5;
	}

	.barge-in-tip,
	.boundary-note {
		margin-top: 18px;
		padding: 15px;
		display: flex;
		gap: 11px;
		align-items: flex-start;
		border-radius: 14px;
	}

	.barge-in-tip { background: #edf7f2; color: #2c725a; }
	.boundary-note { margin-top: 10px; background: #fff5e8; color: #865b26; }

	.session-card {
		margin-top: 22px;
		padding: 28px;
	}

	.session-heading span {
		padding: 6px 9px;
		border-radius: 999px;
		background: #edf2f0;
		color: #60756e;
		font-size: 11px;
		font-weight: 800;
		text-transform: uppercase;
	}

	.transcript {
		max-height: 390px;
		min-height: 190px;
		margin-top: 22px;
		padding: 18px;
		overflow-y: auto;
		border: 1px solid #e1e9e5;
		border-radius: 18px;
		background: #f8faf9;
	}

	.empty-transcript {
		min-height: 150px;
		display: grid;
		place-content: center;
		justify-items: center;
		gap: 10px;
		color: #84948f;
		text-align: center;
	}

	.empty-transcript p { max-width: 300px; margin: 0; font-size: 13px; line-height: 1.5; }

	.transcript-entry {
		max-width: 84%;
		margin-bottom: 16px;
		display: grid;
		grid-template-columns: 34px 1fr;
		gap: 10px;
		align-items: start;
	}

	.transcript-entry.jamie { margin-left: auto; }

	.speaker-mark {
		width: 34px;
		height: 34px;
		display: grid;
		place-items: center;
		border-radius: 50%;
		background: #dfe8e4;
		color: #45635a;
		font-size: 12px;
		font-weight: 900;
	}

	.transcript-entry.jamie .speaker-mark { background: #1f7659; color: white; }
	.transcript-entry strong { color: #39544c; font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; }
	.transcript-entry p {
		margin: 4px 0 0;
		padding: 11px 13px;
		border-radius: 4px 14px 14px 14px;
		background: #e8efec;
		color: #294b42;
		font-size: 14px;
		line-height: 1.55;
	}

	.transcript-entry.jamie p { background: #e5f4ec; }

	.handoff-card {
		margin-top: 16px;
		padding: 16px;
		display: flex;
		gap: 12px;
		align-items: flex-start;
		border: 1px solid #cbe4d8;
		border-radius: 15px;
		background: #eff8f3;
		color: #246149;
	}

	.handoff-card strong,
	.handoff-card p,
	.handoff-card span,
	.handoff-card small { display: block; }
	.handoff-card p { margin: 5px 0 2px; color: #284d42; font-size: 14px; font-weight: 800; }
	.handoff-card span { color: #4f6d64; font-size: 13px; }
	.handoff-card small { margin-top: 7px; color: #6e817b; }

	.interrupt-proof {
		margin: 14px 0 0;
		display: flex;
		align-items: center;
		gap: 7px;
		color: #277054;
		font-size: 12px;
		font-weight: 800;
	}

	.demo-footer {
		margin-top: 24px;
		padding: 18px 4px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 24px;
		color: #6a7d76;
		font-size: 12px;
	}

	.demo-footer p { margin: 0; }
	.demo-footer a { color: #1f6f58; font-weight: 800; text-decoration: none; white-space: nowrap; }

	@keyframes voice-ring {
		0% { transform: scale(0.92); opacity: 0.65; }
		100% { transform: scale(2.4); opacity: 0; }
	}

	@keyframes voice-bar {
		from { height: 5px; }
		to { height: var(--bar-height); }
	}

	@media (max-width: 820px) {
		.receptionist-page { padding: 0 18px 36px; }
		.intro { margin-top: 48px; }
		.demo-grid { grid-template-columns: 1fr; }
		.guide-card { order: -1; }
		.demo-footer { align-items: flex-start; flex-direction: column; }
	}

	@media (max-width: 540px) {
		.demo-header { padding: 18px 0; }
		.back-link span { display: none; }
		.demo-label { font-size: 10px; }
		.intro h1 { font-size: 42px; }
		.intro > p:last-child { font-size: 16px; }
		.call-card,
		.guide-card,
		.session-card { padding: 20px; border-radius: 20px; }
		.agent-stage { min-height: 320px; }
		.transcript-entry { max-width: 100%; }
	}

	@media (prefers-reduced-motion: reduce) {
		.voice-rings span,
		.agent-stage.speaking .voice-bars span { animation: none; }
		.call-controls button { transition: none; }
	}
</style>
