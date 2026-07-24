<script lang="ts">
	import {
		CONTROL_GATE,
		CONTROLLED_WATERWAY_STAGES,
		WATERWAY_STATES,
		type WaterwayStage
	} from '$lib/data/controlledWaterway';

	let activeStageId: WaterwayStage['id'] = 'map';

	function selectStageOnKeyboard(event: KeyboardEvent, stageId: WaterwayStage['id']): void {
		if (event.key !== 'Enter' && event.key !== ' ') return;
		event.preventDefault();
		activeStageId = stageId;
	}
</script>

<section class="waterway" aria-labelledby="controlled-waterway-title">
	<header class="waterway__header">
		<div>
			<span class="waterway__eyebrow">Controlled waterway</span>
			<h2 id="controlled-waterway-title">One workflow, designed to hold its course.</h2>
		</div>
		<p>
			Work moves like water. The system gives it a defined channel, validates every gate, and
			leaves a receipt downstream.
		</p>
	</header>

	<div class="waterway__controls" role="group" aria-label="Choose a workflow chapter">
		{#each CONTROLLED_WATERWAY_STAGES as stage}
			<button
				type="button"
				class:waterway__chapter--active={activeStageId === stage.id}
				aria-pressed={activeStageId === stage.id}
				aria-controls={`waterway-ledger-${stage.id}`}
				onclick={() => (activeStageId = stage.id)}
				onkeydown={(event) => selectStageOnKeyboard(event, stage.id)}
			>
				<span>{stage.step}</span>
				<strong>{stage.shortName}</strong>
				<small>{stage.verb}</small>
			</button>
		{/each}
	</div>

	<figure class="waterway__figure" data-active-stage={activeStageId}>
		<div class="waterway__scene">
			<svg class="waterway__channel" viewBox="0 0 1200 590" aria-hidden="true">
				<defs>
					<linearGradient id="water-flow" x1="0" y1="0" x2="1" y2="0">
						<stop offset="0" stop-color="var(--color-performance-signal-soft)" />
						<stop offset="0.5" stop-color="var(--color-performance-signal)" />
						<stop offset="1" stop-color="var(--color-performance-controlled)" />
					</linearGradient>
					<filter id="water-glow" x="-30%" y="-30%" width="160%" height="160%">
						<feGaussianBlur stdDeviation="7" result="blur" />
						<feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
					</filter>
				</defs>

				<g class="waterway__contours">
					<path d="M-50 85 C145 5 257 164 430 78 S731 21 910 100 1132 146 1260 61" />
					<path d="M-35 132 C145 53 258 211 438 126 S738 67 922 147 1140 195 1264 109" />
					<path d="M-20 452 C151 376 288 521 459 441 S751 374 939 457 1133 510 1260 421" />
					<path d="M-42 500 C153 421 283 570 465 489 S769 423 946 503 1144 559 1270 472" />
				</g>

				<path
					class="waterway__concrete"
					d="M44 368 C185 359 181 195 348 206 C529 219 500 387 679 372 C823 360 795 213 959 223 C1067 230 1111 314 1181 304"
				/>
				<path
					class="waterway__water"
					d="M44 368 C185 359 181 195 348 206 C529 219 500 387 679 372 C823 360 795 213 959 223 C1067 230 1111 314 1181 304"
				/>
				<path
					class="waterway__current"
					d="M44 368 C185 359 181 195 348 206 C529 219 500 387 679 372 C823 360 795 213 959 223 C1067 230 1111 314 1181 304"
				/>

				<g class="waterway__gate-lines">
					<path d="M220 234 L265 320" />
					<path d="M553 303 L600 389" />
					<path d="M889 194 L933 280" />
				</g>
			</svg>

			<ol class="waterway__milestones" aria-label="Map, Build, and Control workflow path">
				{#each CONTROLLED_WATERWAY_STAGES as stage}
					<li
						class:waterway__milestone--active={activeStageId === stage.id}
						data-waterway-stage={stage.id}
					>
						<span>{stage.step}</span>
						<strong>{stage.shortName}</strong>
						<small>{stage.verb}</small>

						{#if stage.id === 'control'}
							<div class="waterway__control-region">
								<ol aria-label="Control operating path">
									{#each CONTROL_GATE as gate}
										<li>
											<strong>{gate.label}</strong>
											<small>{gate.detail}</small>
										</li>
									{/each}
								</ol>
								<div class="waterway__states" aria-label="Decision gate states">
									{#each WATERWAY_STATES as state}
										<span class={`waterway__state waterway__state--${state.id}`}>
											<strong>{state.label}</strong>
											<small>{state.detail}</small>
										</span>
									{/each}
								</div>
							</div>
						{/if}
					</li>
				{/each}
			</ol>
		</div>
		<figcaption>
			<span>Water = work in motion</span>
			<span>Concrete = policy boundary</span>
			<span>Gate = agent + human authority</span>
			<span>Downstream receipt = Proof</span>
		</figcaption>
	</figure>

	<div class="waterway__ledger" aria-label="Workflow operating ledger">
		{#each CONTROLLED_WATERWAY_STAGES as stage}
			<article
				id={`waterway-ledger-${stage.id}`}
				class="waterway__ledger-card"
				class:waterway__ledger-card--active={activeStageId === stage.id}
				data-waterway-stage={stage.id}
			>
				<header>
					<span>{stage.step} / {stage.shortName}</span>
					<strong>{stage.customerJob}</strong>
				</header>
				<dl>
					<div><dt>Owner</dt><dd>{stage.ledger.owner}</dd></div>
					<div><dt>Authority</dt><dd>{stage.ledger.authority}</dd></div>
					<div><dt>Validation</dt><dd>{stage.ledger.validation}</dd></div>
					<div><dt>State</dt><dd>{stage.ledger.state}</dd></div>
					<div><dt>Evidence</dt><dd>{stage.ledger.evidence}</dd></div>
					<div><dt>Recovery</dt><dd>{stage.ledger.recovery}</dd></div>
				</dl>
			</article>
		{/each}
	</div>
</section>

<style>
	.waterway {
		--waterway-ink: var(--color-performance-ink, #090909);
		--waterway-muted: var(--color-performance-muted, #5e6268);
		--waterway-line: var(--color-performance-line, #d7d7d2);
		--waterway-line-strong: var(--color-performance-line-strong, #9c9c96);
		--waterway-panel: var(--color-performance-panel, #ffffff);
		--waterway-court: var(--color-performance-court, #e6e6e0);
		--waterway-court-line: var(--color-performance-court-line, rgba(255, 255, 255, 0.86));
		--waterway-ink-soft: var(--color-performance-ink-soft, #262626);
		--waterway-signal: var(--color-performance-signal, #0057b8);
		--waterway-signal-soft: var(--color-performance-signal-soft, #dce8f5);
		--waterway-pressure: var(--color-performance-pressure, #e54800);
		--waterway-ready: var(--color-performance-ready, #007a4d);
		--waterway-review: var(--color-performance-review, #8b6b00);
		--waterway-stop: var(--color-performance-stop, #c62026);
		display: grid;
		gap: clamp(1rem, 2vw, 1.5rem);
		width: min(100%, 90rem);
		margin: clamp(2rem, 5vw, 4rem) auto 0;
		color: var(--waterway-ink);
	}

	.waterway__header {
		display: grid;
		grid-template-columns: minmax(0, 1.1fr) minmax(18rem, 0.9fr);
		gap: clamp(1.5rem, 5vw, 5rem);
		align-items: end;
	}

	.waterway__header h2,
	.waterway__header p {
		margin: 0;
	}

	.waterway__header h2 {
		max-width: 18ch;
		font-size: clamp(2rem, 4.1vw, 4.75rem);
		font-weight: var(--font-performance-medium, 500);
		letter-spacing: -0.045em;
		line-height: 0.96;
		text-wrap: balance;
	}

	.waterway__header p {
		max-width: 40rem;
		color: var(--waterway-muted);
		font-size: clamp(1rem, 1.3vw, 1.2rem);
		line-height: 1.55;
	}

	.waterway__eyebrow,
	.waterway__controls span,
	.waterway__controls small,
	.waterway__milestones > li > span,
	.waterway__milestones > li > small,
	.waterway__ledger-card header span,
	dt,
	figcaption {
		font-family: var(--font-performance-mono, monospace);
		font-size: 0.72rem;
		font-weight: var(--font-performance-semibold, 600);
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}

	.waterway__eyebrow {
		display: block;
		margin-bottom: 0.9rem;
		color: var(--waterway-signal);
	}

	.waterway__controls {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		border: 1px solid var(--waterway-line-strong);
		background: var(--waterway-line);
		gap: 1px;
	}

	.waterway__controls button {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 0.15rem 0.7rem;
		align-items: center;
		min-height: 5.1rem;
		padding: 0.85rem 1rem;
		border: 0;
		background: var(--waterway-panel);
		color: var(--waterway-ink);
		font: inherit;
		text-align: left;
		cursor: pointer;
		transition:
			background var(--duration-performance-micro, 200ms) var(--ease-performance-standard, ease),
			color var(--duration-performance-micro, 200ms) var(--ease-performance-standard, ease);
	}

	.waterway__controls button:hover {
		background: var(--waterway-signal-soft);
	}

	.waterway__controls button:focus-visible {
		position: relative;
		z-index: 2;
		outline: 3px solid var(--waterway-signal);
		outline-offset: -3px;
	}

	.waterway__controls .waterway__chapter--active {
		background: var(--waterway-ink-soft);
		color: var(--waterway-panel);
	}

	.waterway__controls span {
		grid-row: 1 / span 2;
		color: var(--waterway-signal);
	}

	.waterway__controls strong {
		font-size: 1rem;
		line-height: 1.1;
	}

	.waterway__controls small {
		opacity: 0.68;
		font-size: 0.64rem;
	}

	.waterway__figure {
		margin: 0;
		border: 1px solid var(--waterway-line-strong);
		background: var(--waterway-ink-soft);
	}

	.waterway__scene {
		position: relative;
		min-height: clamp(32rem, 47vw, 42rem);
		overflow: hidden;
		background:
			radial-gradient(circle at 18% 10%, color-mix(in srgb, var(--waterway-court-line) 13%, transparent), transparent 28%),
			linear-gradient(145deg, color-mix(in srgb, var(--waterway-ink-soft) 78%, var(--waterway-court)) 0%, var(--waterway-ink-soft) 50%, var(--waterway-ink) 100%);
	}

	.waterway__scene::after {
		content: '';
		position: absolute;
		inset: 0;
		background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 160 160' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.16'/%3E%3C/svg%3E");
		opacity: 0.18;
		pointer-events: none;
	}

	.waterway__channel {
		position: absolute;
		inset: 0;
		z-index: 1;
		width: 100%;
		height: 100%;
	}

	.waterway__contours path {
		fill: none;
		stroke: color-mix(in srgb, var(--waterway-court) 18%, transparent);
		stroke-width: 1.5;
	}

	.waterway__concrete,
	.waterway__water,
	.waterway__current {
		fill: none;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	.waterway__concrete {
		stroke: var(--waterway-court);
		stroke-width: 118;
		opacity: 0.92;
	}

	.waterway__water {
		stroke: url(#water-flow);
		stroke-width: 72;
	}

	.waterway__current {
		stroke: color-mix(in srgb, var(--waterway-court-line) 82%, transparent);
		stroke-width: 3;
		stroke-dasharray: 12 20;
		filter: url(#water-glow);
		animation: waterway-current calc(var(--duration-performance-slow, 700ms) * 4) linear infinite;
	}

	.waterway__gate-lines path {
		fill: none;
		stroke: var(--waterway-pressure);
		stroke-width: 10;
		stroke-linecap: round;
	}

	.waterway__milestones {
		position: absolute;
		inset: 0;
		z-index: 3;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.waterway__milestones > li {
		position: absolute;
		display: grid;
		gap: 0.2rem;
		min-width: 10rem;
		padding: 0.8rem 0.9rem;
		border: 1px solid color-mix(in srgb, var(--waterway-panel) 35%, transparent);
		border-radius: var(--radius-performance-md, 4px);
		background: color-mix(in srgb, var(--waterway-ink-soft) 88%, transparent);
		box-shadow: var(--shadow-performance-node, none);
		color: var(--waterway-panel);
		backdrop-filter: blur(8px);
		transition:
			border-color var(--duration-performance-micro, 200ms) var(--ease-performance-standard, ease),
			transform var(--duration-performance-micro, 200ms) var(--ease-performance-standard, ease),
			background var(--duration-performance-micro, 200ms) var(--ease-performance-standard, ease);
	}

	.waterway__milestones > li::after {
		content: '';
		position: absolute;
		bottom: -0.36rem;
		left: 0.9rem;
		width: 0.65rem;
		height: 0.65rem;
		border-radius: 50%;
		background: var(--waterway-signal);
		box-shadow: 0 0 0 4px color-mix(in srgb, var(--waterway-signal) 20%, transparent);
	}

	.waterway__milestones > li:nth-child(1) { left: 6%; top: 18%; }
	.waterway__milestones > li:nth-child(2) { left: 38%; top: 58%; }
	.waterway__milestones > li:nth-child(3) { right: 4%; top: 8%; width: min(29rem, 39%); }

	.waterway__milestones > .waterway__milestone--active {
		border-color: var(--waterway-signal-soft);
		background: color-mix(in srgb, var(--waterway-signal) 58%, var(--waterway-ink-soft));
		transform: translateY(-0.35rem);
	}

	.waterway__milestones > li > span { color: var(--waterway-signal-soft); }
	.waterway__milestones > li > strong { font-size: 1.2rem; }
	.waterway__milestones > li > small { opacity: 0.68; }

	.waterway__control-region {
		display: grid;
		gap: 0.6rem;
		margin-top: 0.7rem;
		padding-top: 0.7rem;
		border-top: 1px solid color-mix(in srgb, var(--waterway-panel) 22%, transparent);
	}

	.waterway__control-region > ol {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 0.35rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.waterway__control-region > ol li {
		display: grid;
		gap: 0.25rem;
		padding: 0.5rem;
		border: 1px solid color-mix(in srgb, var(--waterway-panel) 16%, transparent);
		background: color-mix(in srgb, var(--waterway-panel) 6%, transparent);
	}

	.waterway__control-region strong { font-size: 0.72rem; }
	.waterway__control-region small { font-size: 0.62rem; line-height: 1.3; opacity: 0.7; }

	.waterway__states {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 0.35rem;
	}

	.waterway__state {
		display: grid;
		gap: 0.15rem;
		padding: 0.45rem 0.5rem;
		border-left: 3px solid;
		background: color-mix(in srgb, var(--waterway-panel) 6%, transparent);
	}

	.waterway__state--run { border-color: var(--waterway-ready); }
	.waterway__state--wait { border-color: var(--waterway-review); }
	.waterway__state--stop { border-color: var(--waterway-stop); }

	figcaption {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 1px;
		border-top: 1px solid color-mix(in srgb, var(--waterway-panel) 16%, transparent);
		background: var(--waterway-ink);
		color: color-mix(in srgb, var(--waterway-panel) 72%, transparent);
	}

	figcaption span {
		padding: 0.8rem;
		border-right: 1px solid color-mix(in srgb, var(--waterway-panel) 12%, transparent);
	}

	.waterway__ledger {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 1px;
		border: 1px solid var(--waterway-line-strong);
		background: var(--waterway-line);
	}

	.waterway__ledger article {
		display: grid;
		align-content: start;
		background: var(--waterway-panel);
		transition:
			box-shadow var(--duration-performance-micro, 200ms) var(--ease-performance-standard, ease),
			background var(--duration-performance-micro, 200ms) var(--ease-performance-standard, ease);
	}

	.waterway__ledger .waterway__ledger-card--active {
		position: relative;
		z-index: 1;
		background: var(--waterway-signal-soft);
		box-shadow: inset 0 4px 0 var(--waterway-signal);
	}

	.waterway__ledger-card header {
		display: grid;
		gap: 0.5rem;
		min-height: 8rem;
		padding: 1rem;
		border-bottom: 1px solid var(--waterway-line);
	}

	.waterway__ledger-card header span { color: var(--waterway-signal); }
	.waterway__ledger-card header strong { font-size: 1rem; line-height: 1.35; }

	.waterway__ledger dl { margin: 0; }
	.waterway__ledger dl div {
		display: grid;
		grid-template-columns: 5.5rem 1fr;
		gap: 0.65rem;
		padding: 0.75rem 1rem;
		border-bottom: 1px solid var(--waterway-line);
	}
	.waterway__ledger dl div:last-child { border-bottom: 0; }
	dt { color: var(--waterway-muted); }
	dd { margin: 0; font-size: 0.82rem; line-height: 1.4; }

	@keyframes waterway-current {
		to { stroke-dashoffset: -64; }
	}

	@media (max-width: 760px) {
		.waterway { margin-top: 2rem; }
		.waterway__header { grid-template-columns: 1fr; gap: 1rem; }
		.waterway__header h2 { font-size: clamp(2.25rem, 12vw, 3.8rem); }
		.waterway__controls { grid-template-columns: 1fr; }
		.waterway__controls button { min-height: 4rem; }

		.waterway__scene {
			min-height: auto;
			padding: 1rem;
			background: linear-gradient(160deg, var(--waterway-ink-soft) 0%, var(--waterway-ink) 100%);
		}

		.waterway__channel { display: none; }
		.waterway__milestones {
			position: relative;
			display: grid;
			gap: 1rem;
			padding: 0 0 0 1.4rem;
		}

		.waterway__milestones::before {
			content: '';
			position: absolute;
			left: 0.2rem;
			top: 1.5rem;
			bottom: 1.5rem;
			width: 0.72rem;
			border: 0.22rem solid var(--waterway-court);
			border-radius: 999px;
			background: linear-gradient(var(--waterway-signal-soft), var(--waterway-signal));
		}

		.waterway__milestones > li,
		.waterway__milestones > li:nth-child(1),
		.waterway__milestones > li:nth-child(2),
		.waterway__milestones > li:nth-child(3) {
			position: relative;
			left: auto;
			right: auto;
			top: auto;
			width: auto;
			min-width: 0;
		}

		.waterway__milestones > li::after {
			left: -1.65rem;
			top: 1.1rem;
			bottom: auto;
		}

		.waterway__milestones > .waterway__milestone--active { transform: translateX(0.25rem); }
		.waterway__control-region > ol,
		.waterway__states { grid-template-columns: 1fr; }
		.waterway__control-region small { font-size: 0.7rem; }

		figcaption { grid-template-columns: 1fr 1fr; }
		figcaption span { min-height: 3.6rem; }
		.waterway__ledger { grid-template-columns: 1fr; }
		.waterway__ledger-card header { min-height: auto; }
	}

	@media (prefers-reduced-motion: reduce) {
		.waterway *,
		.waterway *::before,
		.waterway *::after {
			animation-duration: 0.01ms !important;
			animation-iteration-count: 1 !important;
			transition-duration: 0.01ms !important;
		}
	}
</style>
