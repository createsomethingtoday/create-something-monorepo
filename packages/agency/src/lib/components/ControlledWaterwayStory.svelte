<script lang="ts">
	import PipelineCanvas from './PipelineCanvas.svelte';
	import {
		AGENT_WORK_TRACE,
		BUSINESS_OUTCOME,
		CONTROL_GATE,
		CONTROLLED_WATERWAY_STAGES,
		GOVERNED_WORK_PACKET,
		PAUSE_STATION,
		WATERWAY_STATES,
		WORKFLOW_TRIGGERS,
		type WaterwayStage
	} from '$lib/data/controlledWaterway';

	let activeStageId: WaterwayStage['id'] = 'map';
	let pipelineRendererState: 'fallback' | 'loading' | 'ready' = 'fallback';
	$: activeStage =
		CONTROLLED_WATERWAY_STAGES.find((stage) => stage.id === activeStageId) ??
		CONTROLLED_WATERWAY_STAGES[0];

	function selectStageOnKeyboard(event: KeyboardEvent, stageId: WaterwayStage['id']): void {
		if (event.key !== 'Enter' && event.key !== ' ') return;
		event.preventDefault();
		activeStageId = stageId;
	}
</script>

<section class="waterway" aria-labelledby="controlled-waterway-title">
	<header class="waterway__header">
		<div>
			<span class="waterway__eyebrow">Controlled work pipeline</span>
			<h2 id="controlled-waterway-title">One straight path. Many inputs. Every handoff governed.</h2>
		</div>
		<p>
			A person, system, or agent can enter the same controlled line. Bounded agents and
			integrations move work forward; explicit valves decide when to run, prepare and wait, or
			stop; every resolved step leaves proof.
		</p>
	</header>

	<div class="waterway__controls" role="group" aria-label="Choose a workflow chapter">
		{#each CONTROLLED_WATERWAY_STAGES as stage}
			<button
				type="button"
				class:waterway__chapter--active={activeStageId === stage.id}
				aria-pressed={activeStageId === stage.id}
				aria-controls="waterway-system-flow waterway-active-chapter"
				onclick={() => (activeStageId = stage.id)}
				onkeydown={(event) => selectStageOnKeyboard(event, stage.id)}
			>
				<span>{stage.step}</span>
				<strong>{stage.shortName}</strong>
				<small>{stage.verb}</small>
			</button>
		{/each}
	</div>

	<div
		id="waterway-system-flow"
		class="waterway__system"
		data-system-flow
		data-flow-progress={activeStageId}
	>
		<figure class="waterway__figure" data-active-stage={activeStageId}>
		<div class="waterway__scene">
			<div id="waterway-flow-readout" class="waterway__flow-readout" aria-live="polite">
				<span>Current position</span>
				<strong>{activeStage.shortName}</strong>
				<small>Water moving through: {activeStage.flowStatus}</small>
			</div>
			<PipelineCanvas
				stage={activeStageId}
				onstatechange={(state) => (pipelineRendererState = state)}
			/>
			<svg
				class="waterway__pipeline"
				class:waterway__pipeline--enhanced={pipelineRendererState === 'ready'}
				viewBox="0 0 1200 590"
				aria-hidden="true"
			>
				<defs>
					<linearGradient id="water-flow" gradientUnits="userSpaceOnUse" x1="44" y1="368" x2="1181" y2="368">
						<stop offset="0" stop-color="var(--color-performance-signal-soft)" />
						<stop offset="0.5" stop-color="var(--color-performance-signal)" />
						<stop offset="1" stop-color="var(--color-performance-controlled)" />
					</linearGradient>
					<filter id="water-glow" x="-30%" y="-30%" width="160%" height="160%">
						<feGaussianBlur stdDeviation="2.5" result="blur" />
						<feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
					</filter>
				</defs>

				<g class="waterway__input-shell" data-instrument-manifold>
					<path d="M-24 176 H104 V344 H184" />
					<path d="M-24 368 H184" />
					<path d="M-24 560 H104 V392 H184" />
				</g>

				<g class="waterway__input-lines">
					<path d="M-24 176 H104 V344 H184" />
					<path d="M-24 368 H184" />
					<path d="M-24 560 H104 V392 H184" />
				</g>

				<path
					class="waterway__pipe-shell"
					d="M44 368 H1181"
				/>
				<path
					class="waterway__flow"
					d="M44 368 H1181"
				/>
				<g class="waterway__currents">
					<path class="waterway__current" data-flow-segment="map" d="M44 368 H260" />
					<path class="waterway__current" data-flow-segment="build" d="M260 368 H590" />
					<path class="waterway__current" data-flow-segment="control" d="M590 368 H1181" />
				</g>

				<g class="waterway__pipe-joints">
					<path d="M178 340 V396 M188 340 V396" />
					<path d="M1112 340 V396 M1122 340 V396" />
				</g>

				<g class="waterway__valves" stroke="currentColor">
					<g class="waterway__instrument-valve" data-valve-stage="map" transform="translate(260 368)">
						<circle class="waterway__valve-ring" r="16" />
						<path class="waterway__valve-blade" d="M-9 -7 L0 0 L-9 7 M9 -7 L0 0 L9 7" />
						<circle class="waterway__valve-core" r="3" />
					</g>
					<g class="waterway__instrument-valve" data-valve-stage="build" transform="translate(590 368)">
						<circle class="waterway__valve-ring" r="16" />
						<path class="waterway__valve-blade" d="M-9 -7 L0 0 L-9 7 M9 -7 L0 0 L9 7" />
						<circle class="waterway__valve-core" r="3" />
					</g>
					<g class="waterway__instrument-valve" data-valve-stage="control" transform="translate(920 368)">
						<circle class="waterway__valve-ring" r="16" />
						<path class="waterway__valve-blade" d="M-9 -7 L0 0 L-9 7 M9 -7 L0 0 L9 7" />
						<circle class="waterway__valve-core" r="3" />
					</g>
				</g>

				<g class="waterway__terminal" data-pipeline-terminal>
					<path d="M1152 352 V384" />
					<path d="M1162 352 L1180 368 L1162 384" />
				</g>
			</svg>

			<ol class="waterway__milestones" data-mobile-current aria-label="Map, Build, and Control workflow path">
				{#each CONTROLLED_WATERWAY_STAGES as stage}
					<li
						class:waterway__milestone--active={activeStageId === stage.id}
						data-waterway-stage={stage.id}
					>
						<span>{stage.step}</span>
						<strong>{stage.shortName}</strong>
						<small>{stage.verb}</small>

						{#if stage.id === 'control' && activeStageId === 'control'}
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
			<span>Inputs = typed triggers</span>
			<span>Pipe = bounded work</span>
			<span>Valves = policy gates</span>
			<span>Hold = prepare + wait</span>
			<span>Output = proof + outcome</span>
		</figcaption>
	</figure>

	<section
		id="waterway-active-chapter"
		class="waterway__chapter-detail"
		data-active-chapter={activeStageId}
		aria-labelledby="waterway-active-chapter-title"
	>
		<header>
			<span class="waterway__eyebrow">{activeStage.step} / {activeStage.shortName}</span>
			<h3 id="waterway-active-chapter-title">{activeStage.customerJob}</h3>
			<p>{activeStage.outcome}</p>
		</header>

		<article class="waterway__ledger-card" data-waterway-stage={activeStage.id}>
			<header>
				<span>Operating ledger</span>
				<strong>What must remain true at this stage.</strong>
			</header>
			<dl>
				<div><dt>Owner</dt><dd>{activeStage.ledger.owner}</dd></div>
				<div><dt>Authority</dt><dd>{activeStage.ledger.authority}</dd></div>
				<div><dt>Validation</dt><dd>{activeStage.ledger.validation}</dd></div>
				<div><dt>State</dt><dd>{activeStage.ledger.state}</dd></div>
				<div><dt>Evidence</dt><dd>{activeStage.ledger.evidence}</dd></div>
				<div><dt>Recovery</dt><dd>{activeStage.ledger.recovery}</dd></div>
			</dl>
		</article>
	</section>

	{#if activeStageId === 'control'}
	<section class="waterway__network" aria-labelledby="governed-network-title">
		<header class="waterway__network-header">
			<div>
				<span class="waterway__eyebrow">Inside Control / governed handoff</span>
				<h3 id="governed-network-title">The blocked action waits. The workflow does not have to.</h3>
			</div>
			<p>
				The same work packet can move between people, agents, and integrations without losing
				context, authority, or recovery. A receipt appears only after work or judgment resolves.
			</p>
		</header>

		<div class="waterway__network-route" aria-label="Governed work route">
			<div class="waterway__network-pipe" data-pipeline-rail aria-hidden="true">
				<span></span>
			</div>
			<section class="waterway__network-node waterway__inlets" data-flow-phase="map" aria-labelledby="trigger-inlets-title">
				<header>
					<span>01 / Inputs</span>
					<strong id="trigger-inlets-title">Triggers enter one controlled line.</strong>
				</header>
				<div class="waterway__trigger-list">
					{#each WORKFLOW_TRIGGERS as trigger}
						<article data-work-trigger={trigger.id}>
							<div class="waterway__trigger-source">
								<span class="waterway__source-icon" data-source-icon={trigger.id} aria-hidden="true"></span>
								<span>{trigger.source}</span>
							</div>
							<strong>{trigger.label}</strong>
							<p>{trigger.detail}</p>
						</article>
					{/each}
				</div>
			</section>

			<article class="waterway__network-node waterway__packet" data-flow-phase="map">
				<header>
					<span>02 / Handoff</span>
					<strong>Governed work packet</strong>
				</header>
				<dl>
					{#each GOVERNED_WORK_PACKET as field}
						<div><dt>{field.label}</dt><dd>{field.value}</dd></div>
					{/each}
				</dl>
			</article>

			<section class="waterway__network-node waterway__work-cell" data-flow-phase="build" data-work-cell aria-labelledby="work-cell-title">
				<header>
					<span>03 / Bounded work</span>
					<strong id="work-cell-title">Agent + integration work</strong>
				</header>
				<ol>
					{#each AGENT_WORK_TRACE as step}
						<li
							class:waterway__work-step--receipt={step.id === 'receipt'}
							data-receipt={step.id === 'receipt' ? 'resolved' : undefined}
						>
							<span>{step.label}</span>
							<small>{step.detail}</small>
						</li>
					{/each}
				</ol>
			</section>

			<article class="waterway__network-node waterway__policy-gate" data-flow-phase="control">
				<header>
					<span>04 / Policy gate</span>
					<strong>Run / Wait / Stop</strong>
				</header>
				<p>Policy and validation determine what may proceed, what needs judgment, and what must be contained.</p>
				<div class="waterway__policy-states" aria-label="Governed decision states">
					{#each WATERWAY_STATES as state}
						<span class={`waterway__state waterway__state--${state.id}`}>
							<strong>{state.label}</strong>
							<small>{state.detail}</small>
						</span>
					{/each}
				</div>
			</article>
		</div>

		<div class="waterway__decision-field" data-flow-phase="control">
			<article class="waterway__run-lane">
				<div class="waterway__decision-current" data-decision-current aria-hidden="true"><span></span></div>
				<span>Run</span>
				<strong>Approved work keeps moving.</strong>
				<p>The action stays inside the defined lane and leaves a result receipt.</p>
			</article>

			<article class="waterway__pause-station" data-wait-station>
				<header>
					<div>
						<span>Wait station</span>
						<strong>{PAUSE_STATION.label}</strong>
					</div>
					<small>Protected judgment / safe parallel work</small>
				</header>
				<div class="waterway__pause-lanes">
					<section class="waterway__pause-lane waterway__pause-lane--protected">
						<span>Held lane</span>
						<strong>{PAUSE_STATION.protectedState}</strong>
						<p>{PAUSE_STATION.protectedAction}</p>
					</section>
					<section class="waterway__pause-lane waterway__pause-lane--safe">
						<span>Active lane</span>
						<strong>{PAUSE_STATION.safeState}</strong>
						<p>{PAUSE_STATION.safeWork}</p>
					</section>
					<section class="waterway__human-station">
						<span>Decision owner</span>
						<strong>{PAUSE_STATION.decisionOwner}</strong>
						<p>{PAUSE_STATION.resume}</p>
					</section>
				</div>
			</article>

			<article class="waterway__stop-lane">
				<span>Stop</span>
				<strong>Consequential work is contained.</strong>
				<p>{PAUSE_STATION.recovery}</p>
			</article>
		</div>

		<article class="waterway__business-outcome" data-flow-phase="control" data-business-outcome>
			<span class="waterway__outcome-current" data-outcome-current aria-hidden="true"></span>
			<div>
				<span>05 / Output</span>
				<strong>{BUSINESS_OUTCOME.label}</strong>
			</div>
			<p>{BUSINESS_OUTCOME.operationalResult}</p>
			<small>{BUSINESS_OUTCOME.measure}</small>
		</article>
	</section>
	{/if}
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
		--waterway-ready-soft: var(--color-performance-ready-soft, #dcece5);
		--waterway-review: var(--color-performance-review, #8b6b00);
		--waterway-review-soft: var(--color-performance-review-soft, #f1e7c8);
		--waterway-stop: var(--color-performance-stop, #c62026);
		--waterway-stop-soft: var(--color-performance-stop-soft, #f5dddd);
		display: grid;
		gap: clamp(1rem, 2vw, 1.5rem);
		width: min(100%, 90rem);
		margin: 0 auto;
		padding: 0;
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

	.waterway__controls button.waterway__chapter--active:hover {
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

	.waterway__system {
		--waterway-route-progress: 50%;
		--waterway-primary-progress: 31%;
		display: grid;
		gap: 0;
		border: 1px solid var(--waterway-line-strong);
		background: var(--waterway-line);
	}

	.waterway__system[data-flow-progress='map'] {
		--waterway-route-progress: 50%;
		--waterway-primary-progress: 31%;
	}

	.waterway__system[data-flow-progress='build'] {
		--waterway-route-progress: 75%;
		--waterway-primary-progress: 61%;
	}

	.waterway__system[data-flow-progress='control'] {
		--waterway-route-progress: 100%;
		--waterway-primary-progress: 100%;
	}

	.waterway__figure {
		margin: 0;
		border: 0;
		background: var(--waterway-ink-soft);
	}

	.waterway__scene {
		position: relative;
		min-height: clamp(28rem, 38vw, 34rem);
		overflow: hidden;
		background:
			linear-gradient(to right, color-mix(in srgb, var(--waterway-court-line) 8%, transparent) 1px, transparent 1px) 0 0 / calc(100% / 12) 100%,
			linear-gradient(to bottom, color-mix(in srgb, var(--waterway-court-line) 8%, transparent) 1px, transparent 1px) 0 0 / 100% 25%,
			linear-gradient(145deg, color-mix(in srgb, var(--waterway-ink-soft) 78%, var(--waterway-court)) 0%, var(--waterway-ink-soft) 50%, var(--waterway-ink) 100%);
	}

	.waterway__scene::after {
		content: '';
		position: absolute;
		inset: 0;
		background: linear-gradient(90deg, transparent 0 94%, color-mix(in srgb, var(--waterway-court-line) 10%, transparent) 94% 94.15%, transparent 94.15%);
		opacity: 0.7;
		pointer-events: none;
	}

	.waterway__flow-readout {
		position: absolute;
		left: clamp(1rem, 2vw, 1.5rem);
		top: clamp(1rem, 2vw, 1.5rem);
		z-index: 4;
		display: grid;
		grid-template-columns: auto auto;
		gap: 0.2rem 0.75rem;
		align-items: baseline;
		padding: 0.65rem 0.8rem;
		border: 1px solid color-mix(in srgb, var(--waterway-panel) 18%, transparent);
		border-top: 2px solid var(--waterway-signal);
		background: color-mix(in srgb, var(--waterway-ink) 88%, transparent);
		color: var(--waterway-panel);
		backdrop-filter: blur(8px);
	}

	.waterway__flow-readout span,
	.waterway__flow-readout small {
		font-family: var(--font-performance-mono, monospace);
		font-size: 0.62rem;
		font-weight: var(--font-performance-semibold, 600);
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}

	.waterway__flow-readout span { color: var(--waterway-signal-soft); }
	.waterway__flow-readout strong { font-size: 0.85rem; }
	.waterway__flow-readout small {
		grid-column: 1 / -1;
		opacity: 0.62;
		text-transform: none;
	}

	.waterway__pipeline {
		position: absolute;
		inset: 0;
		z-index: 1;
		width: 100%;
		height: 100%;
		transition: opacity var(--duration-performance-standard, 400ms) var(--ease-performance-standard, ease);
	}

	.waterway__pipeline--enhanced { opacity: 0; }

	.waterway__input-shell path,
	.waterway__input-lines path {
		fill: none;
		stroke-linecap: square;
		stroke-linejoin: miter;
	}

	.waterway__input-shell path {
		stroke: color-mix(in srgb, var(--waterway-court) 78%, var(--waterway-line-strong));
		stroke-width: 24;
		opacity: 0.78;
	}

	.waterway__input-lines path {
		stroke: color-mix(in srgb, var(--waterway-signal) 82%, var(--waterway-ink-soft));
		stroke-width: 10;
		opacity: 0.94;
	}

	.waterway__pipe-shell,
	.waterway__flow,
	.waterway__current {
		fill: none;
		stroke-linecap: square;
		stroke-linejoin: miter;
	}

	.waterway__pipe-shell {
		stroke: color-mix(in srgb, var(--waterway-court) 78%, var(--waterway-line-strong));
		stroke-width: 44;
		opacity: 0.84;
	}

	.waterway__flow {
		stroke: url(#water-flow);
		stroke-width: 26;
		opacity: 0.92;
	}

	.waterway__current {
		stroke: color-mix(in srgb, var(--waterway-panel) 88%, var(--waterway-signal-soft));
		stroke-width: 4;
		stroke-dasharray: 10 28;
		stroke-linecap: round;
		filter: url(#water-glow);
		opacity: 0.12;
		animation: waterway-current calc(var(--duration-performance-slow, 700ms) * 4) linear infinite;
		transition: opacity var(--duration-performance-micro, 200ms) var(--ease-performance-standard, ease);
	}

	.waterway__current[data-flow-segment='build'] { animation-delay: -0.65s; }
	.waterway__current[data-flow-segment='control'] { animation-delay: -1.3s; }
	.waterway__figure[data-active-stage='map'] [data-flow-segment='map'],
	.waterway__figure[data-active-stage='build'] [data-flow-segment='map'],
	.waterway__figure[data-active-stage='build'] [data-flow-segment='build'],
	.waterway__figure[data-active-stage='control'] [data-flow-segment] { opacity: 1; }

	.waterway__pipe-joints path {
		fill: none;
		stroke: color-mix(in srgb, var(--waterway-panel) 72%, var(--waterway-line-strong));
		stroke-width: 3;
	}

	.waterway__instrument-valve {
		color: color-mix(in srgb, var(--waterway-line-strong) 80%, var(--waterway-panel));
		transition:
			color var(--duration-performance-micro, 200ms) var(--ease-performance-standard, ease),
			filter var(--duration-performance-micro, 200ms) var(--ease-performance-standard, ease);
	}

	.waterway__valve-ring {
		fill: var(--waterway-ink-soft);
		stroke-width: 2;
	}

	.waterway__valve-blade {
		fill: none;
		stroke-width: 2;
		stroke-linecap: square;
		stroke-linejoin: miter;
	}

	.waterway__valve-core {
		fill: currentColor;
		stroke: none;
	}

	.waterway__figure[data-active-stage='map'] [data-valve-stage='map'],
	.waterway__figure[data-active-stage='build'] [data-valve-stage='build'],
	.waterway__figure[data-active-stage='control'] [data-valve-stage='control'] {
		color: var(--waterway-pressure);
		filter: drop-shadow(0 0 6px color-mix(in srgb, var(--waterway-pressure) 68%, transparent));
	}

	.waterway__figure[data-active-stage='build'] [data-valve-stage='map'],
	.waterway__figure[data-active-stage='control'] [data-valve-stage='map'],
	.waterway__figure[data-active-stage='control'] [data-valve-stage='build'] { color: var(--waterway-ready); }

	.waterway__terminal {
		fill: none;
		stroke: color-mix(in srgb, var(--waterway-panel) 74%, var(--waterway-signal-soft));
		stroke-width: 3;
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
		background: color-mix(in srgb, var(--waterway-ink) 86%, transparent);
		box-shadow: 0 12px 30px color-mix(in srgb, var(--waterway-ink) 32%, transparent);
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

	.waterway__milestones > li:nth-child(1) { left: 14%; top: 40%; }
	.waterway__milestones > li:nth-child(2) { left: 41%; top: 40%; }
	.waterway__milestones > li:nth-child(3) { right: 4%; top: 8%; width: min(29rem, 39%); }

	.waterway__milestones > .waterway__milestone--active {
		border-color: var(--waterway-signal);
		background: color-mix(in srgb, var(--waterway-ink) 82%, var(--waterway-signal));
		box-shadow:
			inset 3px 0 0 var(--waterway-signal),
			0 16px 36px color-mix(in srgb, var(--waterway-ink) 46%, transparent);
		transform: translateY(-0.18rem);
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
		grid-template-columns: repeat(5, minmax(0, 1fr));
		gap: 1px;
		border-top: 1px solid color-mix(in srgb, var(--waterway-panel) 16%, transparent);
		background: var(--waterway-ink);
		color: color-mix(in srgb, var(--waterway-panel) 72%, transparent);
	}

	figcaption span {
		padding: 0.8rem;
		border-right: 1px solid color-mix(in srgb, var(--waterway-panel) 12%, transparent);
	}

	.waterway__network {
		display: grid;
		gap: 1px;
		padding: 0;
		border: 0;
		border-top: 1px solid var(--waterway-line-strong);
		background: var(--waterway-line);
	}

	.waterway__network-header {
		display: grid;
		grid-template-columns: minmax(0, 1.15fr) minmax(18rem, 0.85fr);
		gap: clamp(1.5rem, 5vw, 5rem);
		align-items: end;
		padding: clamp(1.15rem, 2vw, 1.75rem);
		background: var(--waterway-panel);
	}

	.waterway__network-header h3,
	.waterway__network-header p,
	.waterway__network-node p,
	.waterway__decision-field p,
	.waterway__business-outcome p {
		margin: 0;
	}

	.waterway__network-header h3 {
		max-width: 22ch;
		font-size: clamp(1.75rem, 3.1vw, 3.5rem);
		font-weight: var(--font-performance-medium, 500);
		letter-spacing: -0.04em;
		line-height: 1;
		text-wrap: balance;
	}

	.waterway__network-header p {
		max-width: 38rem;
		color: var(--waterway-muted);
		font-size: 1rem;
		line-height: 1.55;
	}

	.waterway__network-route {
		position: relative;
		display: grid;
		grid-template-columns: minmax(0, 1.3fr) minmax(0, 0.95fr) minmax(0, 1.1fr) minmax(0, 1.15fr);
		gap: 1px;
		padding-top: 2px;
		background: var(--waterway-line);
	}

	.waterway__network-pipe {
		position: absolute;
		inset: 0 0 auto;
		z-index: 4;
		height: 4px;
		overflow: hidden;
		background: var(--waterway-signal-soft);
		pointer-events: none;
	}

	.waterway__network-pipe span {
		position: relative;
		display: block;
		width: var(--waterway-route-progress);
		height: 100%;
		overflow: hidden;
		background: var(--waterway-signal);
		box-shadow: 0 0 8px color-mix(in srgb, var(--waterway-signal) 32%, transparent);
		transition: width var(--duration-performance-standard, 350ms) var(--ease-performance-standard, ease);
	}

	.waterway__network-pipe span::after {
		content: '';
		position: absolute;
		left: -4rem;
		top: 0;
		width: 4rem;
		height: 100%;
		background: linear-gradient(90deg, transparent, var(--waterway-panel), transparent);
		animation: waterway-network-current calc(var(--duration-performance-slow, 700ms) * 3) linear infinite;
	}

	.waterway__system [data-flow-phase] {
		opacity: 0.62;
		transition:
			opacity var(--duration-performance-standard, 350ms) var(--ease-performance-standard, ease),
			filter var(--duration-performance-standard, 350ms) var(--ease-performance-standard, ease);
	}

	.waterway__system[data-flow-progress='map'] [data-flow-phase='map'],
	.waterway__system[data-flow-progress='build'] [data-flow-phase='map'],
	.waterway__system[data-flow-progress='build'] [data-flow-phase='build'],
	.waterway__system[data-flow-progress='control'] [data-flow-phase] {
		opacity: 1;
	}

	.waterway__network-node {
		position: relative;
		display: grid;
		align-content: start;
		gap: 1rem;
		min-width: 0;
		padding: 1rem;
		background: var(--waterway-panel);
	}

	.waterway__network-node::after {
		content: '';
		position: absolute;
		top: 2.08rem;
		right: -0.34rem;
		z-index: 3;
		width: 0.58rem;
		height: 0.58rem;
		border: 2px solid var(--waterway-panel);
		border-radius: 50%;
		background: var(--waterway-signal);
	}

	.waterway__network-node:last-child::after { display: none; }

	.waterway__network-node > header,
	.waterway__pause-station > header {
		display: grid;
		gap: 0.35rem;
		padding-bottom: 0.75rem;
		border-bottom: 1px solid var(--waterway-line);
	}

	.waterway__network-node > header span,
	.waterway__work-cell li > span,
	.waterway__decision-field article > span,
	.waterway__pause-station span,
	.waterway__business-outcome span,
	.waterway__business-outcome small {
		font-family: var(--font-performance-mono, monospace);
		font-size: 0.65rem;
		font-weight: var(--font-performance-semibold, 600);
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}

	.waterway__network-node > header span,
	.waterway__business-outcome span { color: var(--waterway-signal); }

	.waterway__network-node > header strong { font-size: 0.95rem; line-height: 1.3; }

	.waterway__trigger-list {
		display: grid;
		gap: 0.5rem;
	}

	.waterway__trigger-list article {
		display: grid;
		gap: 0.3rem;
		padding: 0.7rem;
		border-left: 3px solid var(--waterway-signal);
		background: var(--waterway-signal-soft);
	}

	.waterway__trigger-source {
		display: flex;
		gap: 0.45rem;
		align-items: center;
		color: var(--waterway-signal);
		font-family: var(--font-performance-mono, monospace);
		font-size: 0.65rem;
		font-weight: var(--font-performance-semibold, 600);
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}

	.waterway__source-icon {
		position: relative;
		flex: 0 0 auto;
		display: inline-block;
		width: 0.78rem;
		height: 0.78rem;
		border: 1.5px solid currentColor;
	}

	.waterway__source-icon[data-source-icon='human'] {
		border-radius: 50%;
		box-shadow: inset 0 -0.23rem 0 color-mix(in srgb, var(--waterway-signal) 28%, transparent);
	}

	.waterway__source-icon[data-source-icon='system']::before,
	.waterway__source-icon[data-source-icon='system']::after {
		content: '';
		position: absolute;
		background: currentColor;
	}

	.waterway__source-icon[data-source-icon='system']::before { inset: 0.18rem; }
	.waterway__source-icon[data-source-icon='system']::after {
		left: -0.22rem;
		right: -0.22rem;
		top: 0.3rem;
		height: 1px;
		box-shadow: 0 -0.27rem 0 currentColor, 0 0.27rem 0 currentColor;
	}

	.waterway__source-icon[data-source-icon='agent'] {
		width: 0.65rem;
		height: 0.65rem;
		margin-inline: 0.07rem;
		transform: rotate(45deg);
		background: color-mix(in srgb, var(--waterway-signal) 16%, transparent);
	}

	.waterway__trigger-list article strong { font-size: 0.86rem; }
	.waterway__trigger-list article p,
	.waterway__policy-gate > p {
		color: var(--waterway-muted);
		font-size: 0.75rem;
		line-height: 1.4;
	}

	.waterway__packet dl {
		display: grid;
		gap: 0;
		margin: 0;
		border: 1px solid var(--waterway-line);
	}

	.waterway__packet dl div {
		display: grid;
		gap: 0.2rem;
		padding: 0.55rem 0.6rem;
		border-bottom: 1px solid var(--waterway-line);
	}

	.waterway__packet dl div:last-child { border-bottom: 0; }
	.waterway__packet dd { font-size: 0.74rem; line-height: 1.35; }

	.waterway__work-cell ol {
		display: grid;
		gap: 0.55rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.waterway__work-cell li {
		position: relative;
		display: grid;
		gap: 0.2rem;
		padding: 0.55rem 0.6rem 0.55rem 1.55rem;
		border: 1px solid var(--waterway-line);
		background: var(--waterway-panel);
	}

	.waterway__work-cell li::before {
		content: '';
		position: absolute;
		left: 0.55rem;
		top: 0.8rem;
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 50%;
		background: var(--waterway-signal);
		box-shadow: 0 0 0 3px var(--waterway-signal-soft);
	}

	.waterway__work-cell li:not(:last-child)::after {
		content: '';
		position: absolute;
		left: 0.78rem;
		top: 1.35rem;
		bottom: -0.75rem;
		width: 1px;
		background: var(--waterway-signal);
	}

	.waterway__work-cell li small { color: var(--waterway-muted); font-size: 0.7rem; line-height: 1.35; }
	.waterway__work-cell .waterway__work-step--receipt {
		border-color: var(--waterway-ready);
		background: var(--waterway-ready-soft);
	}
	.waterway__work-cell .waterway__work-step--receipt::before { background: var(--waterway-ready); }

	.waterway__policy-states {
		display: grid;
		gap: 0.55rem;
	}

	.waterway__policy-states .waterway__state {
		border-top: 1px solid var(--waterway-line);
		border-right: 1px solid var(--waterway-line);
		border-bottom: 1px solid var(--waterway-line);
		background: var(--waterway-panel);
	}

	.waterway__decision-field {
		position: relative;
		display: grid;
		grid-template-columns: minmax(0, 0.75fr) minmax(0, 2.5fr) minmax(0, 0.75fr);
		gap: 1px;
		background: var(--waterway-line);
	}

	.waterway__decision-field > article {
		display: grid;
		align-content: start;
		gap: 0.6rem;
		min-width: 0;
		padding: 1rem;
		background: var(--waterway-panel);
	}

	.waterway__decision-current {
		position: absolute;
		inset: -4px 0 auto;
		height: 4px;
		overflow: hidden;
		background: var(--waterway-ready);
		pointer-events: none;
	}

	.waterway__decision-current span {
		position: absolute;
		left: -4rem;
		top: 0;
		width: 4rem;
		height: 100%;
		background: linear-gradient(90deg, transparent, var(--waterway-panel), transparent);
		animation: waterway-network-current calc(var(--duration-performance-slow, 700ms) * 3) linear infinite;
	}

	.waterway__decision-field p { color: var(--waterway-muted); font-size: 0.78rem; line-height: 1.45; }
	.waterway__run-lane { border-top: 4px solid var(--waterway-ready); }
	.waterway__run-lane > span { color: var(--waterway-ready); }
	.waterway__stop-lane { border-top: 4px solid var(--waterway-stop); }
	.waterway__stop-lane > span { color: var(--waterway-stop); }

	.waterway__decision-field > .waterway__pause-station {
		gap: 1rem;
		border-top: 4px solid var(--waterway-review);
		background: var(--waterway-review-soft);
	}

	.waterway__pause-station > header {
		grid-template-columns: 1fr auto;
		gap: 1rem;
		align-items: end;
		border-color: color-mix(in srgb, var(--waterway-review) 30%, transparent);
	}

	.waterway__pause-station > header div { display: grid; gap: 0.25rem; }
	.waterway__pause-station > header span { color: var(--waterway-review); }
	.waterway__pause-station > header strong { font-size: 1.05rem; }
	.waterway__pause-station > header small {
		font-family: var(--font-performance-mono, monospace);
		font-size: 0.62rem;
		letter-spacing: 0.03em;
		text-transform: uppercase;
	}

	.waterway__pause-lanes {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 0.65rem;
	}

	.waterway__pause-lanes > section {
		display: grid;
		align-content: start;
		gap: 0.45rem;
		padding: 0.75rem;
		border: 1px solid color-mix(in srgb, var(--waterway-review) 28%, var(--waterway-panel));
		background: color-mix(in srgb, var(--waterway-panel) 80%, transparent);
	}

	.waterway__pause-lane--protected { box-shadow: inset 0 3px 0 var(--waterway-review); }
	.waterway__pause-lane--safe { box-shadow: inset 0 3px 0 var(--waterway-ready); }
	.waterway__human-station { box-shadow: inset 0 3px 0 var(--waterway-signal); }
	.waterway__pause-lanes strong { font-size: 0.8rem; line-height: 1.3; }

	.waterway__business-outcome {
		position: relative;
		display: grid;
		grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.25fr) minmax(0, 0.95fr);
		gap: 1.5rem;
		align-items: center;
		padding: 1rem;
		border-left: 5px solid var(--waterway-ready);
		background: var(--waterway-ready-soft);
	}

	.waterway__outcome-current {
		position: absolute;
		left: -5px;
		top: 0;
		bottom: 0;
		width: 5px;
		overflow: hidden;
	}

	.waterway__outcome-current::after {
		content: '';
		position: absolute;
		left: 0;
		top: -3rem;
		width: 100%;
		height: 3rem;
		background: linear-gradient(180deg, transparent, var(--waterway-panel), transparent);
		animation: waterway-outcome-current calc(var(--duration-performance-slow, 700ms) * 2) linear infinite;
	}

	.waterway__business-outcome > div { display: grid; gap: 0.35rem; }
	.waterway__business-outcome strong { font-size: 1rem; }
	.waterway__business-outcome p { font-size: 0.86rem; line-height: 1.45; }
	.waterway__business-outcome small { color: var(--waterway-ready); line-height: 1.4; }

	.waterway__chapter-detail {
		--waterway-chapter-accent: var(--waterway-signal);
		display: grid;
		grid-template-columns: minmax(0, 0.82fr) minmax(0, 1.18fr);
		gap: 1px;
		padding: 0;
		border-top: 1px solid var(--waterway-line-strong);
		background: var(--waterway-line);
	}

	.waterway__chapter-detail[data-active-chapter='build'] {
		--waterway-chapter-accent: var(--waterway-pressure);
	}

	.waterway__chapter-detail[data-active-chapter='control'] {
		--waterway-chapter-accent: var(--waterway-ready);
	}

	.waterway__chapter-detail > header {
		display: grid;
		align-content: start;
		gap: 0.8rem;
		padding: clamp(1.25rem, 2.5vw, 2rem);
		border-top: 4px solid var(--waterway-chapter-accent);
		background: var(--waterway-panel);
	}

	.waterway__chapter-detail > header .waterway__eyebrow { margin: 0; }

	.waterway__chapter-detail > header h3,
	.waterway__chapter-detail > header p {
		margin: 0;
	}

	.waterway__chapter-detail > header h3 {
		max-width: 22ch;
		font-size: clamp(1.65rem, 2.7vw, 2.8rem);
		font-weight: var(--font-performance-medium, 500);
		letter-spacing: -0.035em;
		line-height: 1.02;
		text-wrap: balance;
	}

	.waterway__chapter-detail > header p {
		max-width: 42rem;
		color: var(--waterway-muted);
		font-size: 0.95rem;
		line-height: 1.5;
	}

	.waterway__ledger-card {
		display: grid;
		align-content: start;
		border-top: 4px solid color-mix(in srgb, var(--waterway-chapter-accent) 28%, var(--waterway-line));
		background: var(--waterway-panel);
	}

	.waterway__ledger-card header {
		display: grid;
		gap: 0.5rem;
		padding: 1rem;
		border-bottom: 1px solid var(--waterway-line);
	}

	.waterway__ledger-card header span { color: var(--waterway-signal); }
	.waterway__ledger-card header strong { font-size: 1rem; line-height: 1.35; }

	.waterway__ledger-card dl {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		margin: 0;
	}

	.waterway__ledger-card dl div {
		display: grid;
		gap: 0.25rem;
		padding: 0.75rem 1rem;
		border-right: 1px solid var(--waterway-line);
		border-bottom: 1px solid var(--waterway-line);
	}
	.waterway__ledger-card dl div:nth-child(even) { border-right: 0; }
	.waterway__ledger-card dl div:nth-last-child(-n + 2) { border-bottom: 0; }
	dt { color: var(--waterway-muted); }
	dd { margin: 0; font-size: 0.82rem; line-height: 1.4; }

	@keyframes waterway-current {
		to { stroke-dashoffset: -64; }
	}

	@keyframes waterway-network-current {
		to { transform: translateX(90rem); }
	}

	@keyframes waterway-mobile-current {
		to { background-position: 0 56px; }
	}

	@keyframes waterway-network-mobile-current {
		to { transform: translateY(100rem); }
	}

	@keyframes waterway-outcome-current {
		to { transform: translateY(12rem); }
	}

	@media (max-width: 760px) {
		.waterway__header { grid-template-columns: 1fr; gap: 1rem; }
		.waterway__header h2 { font-size: clamp(2.25rem, 12vw, 3.8rem); }
		.waterway__controls { grid-template-columns: repeat(3, minmax(0, 1fr)); }
		.waterway__controls button {
			grid-template-columns: 1fr;
			justify-items: center;
			gap: 0.2rem;
			min-height: 3.8rem;
			padding: 0.65rem 0.35rem;
			text-align: center;
		}
		.waterway__controls span { grid-row: auto; }
		.waterway__controls strong { font-size: 0.9rem; }
		.waterway__controls small { display: none; }

		.waterway__scene {
			min-height: auto;
			padding: 1rem;
			background: linear-gradient(160deg, var(--waterway-ink-soft) 0%, var(--waterway-ink) 100%);
		}

		.waterway__pipeline { display: none; }
		.waterway__flow-readout {
			position: relative;
			left: auto;
			top: auto;
			margin-bottom: 1rem;
		}
		.waterway__milestones {
			position: relative;
			display: grid;
			padding: 0;
		}

		.waterway__milestones::before,
		.waterway__milestones::after { display: none; }

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

		.waterway__milestones > li:not(.waterway__milestone--active) { display: none; }

		.waterway__milestones > li::after {
			display: none;
		}

		.waterway__milestones > .waterway__milestone--active { transform: none; }
		.waterway__control-region > ol,
		.waterway__states { grid-template-columns: 1fr; }
		.waterway__control-region small { font-size: 0.7rem; }

		figcaption { grid-template-columns: 1fr 1fr; }
		figcaption span { min-height: 3.6rem; }
		figcaption span:last-child { grid-column: 1 / -1; }
		.waterway__network-header { grid-template-columns: 1fr; gap: 1rem; }
		.waterway__network-header h3 { font-size: clamp(2rem, 10vw, 3rem); }
		.waterway__network-route,
		.waterway__decision-field,
		.waterway__pause-lanes,
		.waterway__business-outcome { grid-template-columns: 1fr; }
		.waterway__network-node::after {
			top: auto;
			right: auto;
			bottom: -0.42rem;
			left: 1.4rem;
		}
		.waterway__network-route { padding-top: 0; padding-left: 2px; }
		.waterway__network-pipe {
			inset: 0 auto 0 0;
			width: 4px;
			height: auto;
		}
		.waterway__network-pipe span {
			width: 100%;
			height: var(--waterway-route-progress);
			transition: height var(--duration-performance-standard, 350ms) var(--ease-performance-standard, ease);
		}
		.waterway__network-pipe span::after {
			left: 0;
			top: -3rem;
			width: 100%;
			height: 3rem;
			background: linear-gradient(180deg, transparent, var(--waterway-panel), transparent);
			animation-name: waterway-network-mobile-current;
		}
		.waterway__pause-station > header { grid-template-columns: 1fr; }
		.waterway__chapter-detail { grid-template-columns: 1fr; }
		.waterway__ledger-card dl { grid-template-columns: 1fr; }
		.waterway__ledger-card dl div,
		.waterway__ledger-card dl div:nth-child(even),
		.waterway__ledger-card dl div:nth-last-child(-n + 2) {
			border-right: 0;
			border-bottom: 1px solid var(--waterway-line);
		}
		.waterway__ledger-card dl div:last-child { border-bottom: 0; }
	}

	@media (min-width: 761px) and (max-width: 1080px) {
		.waterway__network-route { grid-template-columns: 1fr 1fr; }
		.waterway__network-node:nth-child(2)::after { display: none; }
		.waterway__decision-field { grid-template-columns: 1fr; }
	}

	@media (prefers-reduced-motion: reduce) {
		.waterway__pipeline { transition: none; }
		.waterway *,
		.waterway *::before,
		.waterway *::after {
			animation-duration: 0.01ms !important;
			animation-iteration-count: 1 !important;
			transition-duration: 0.01ms !important;
		}

		.waterway__current,
		.waterway__network-pipe span::after,
		.waterway__milestones::after,
		.waterway__decision-current span,
		.waterway__outcome-current::after {
			animation-play-state: paused !important;
			stroke-dashoffset: 0;
		}
	}
</style>
