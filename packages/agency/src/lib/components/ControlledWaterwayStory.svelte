<script lang="ts">
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

	function selectStageOnKeyboard(event: KeyboardEvent, stageId: WaterwayStage['id']): void {
		if (event.key !== 'Enter' && event.key !== ' ') return;
		event.preventDefault();
		activeStageId = stageId;
	}
</script>

<section class="waterway" aria-labelledby="controlled-waterway-title">
	<header class="waterway__header">
		<div>
			<span class="waterway__eyebrow">Controlled work network</span>
			<h2 id="controlled-waterway-title">One workflow. Many inlets. Every handoff governed.</h2>
		</div>
		<p>
			A person, system, or agent can start the work. Bounded agents and integrations move it
			forward; policy decides when to run, prepare and wait, or stop; every resolved step leaves
			proof.
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

				<g class="waterway__tributaries">
					<path d="M-72 226 C18 228 32 302 111 349" />
					<path d="M-72 368 C4 368 48 368 111 368" />
					<path d="M-72 516 C18 500 38 425 111 387" />
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
			<span>Tributaries = typed triggers</span>
			<span>Water = work in motion</span>
			<span>Concrete = policy boundary</span>
			<span>Basin = prepare + wait</span>
			<span>Downstream = proof + outcome</span>
		</figcaption>
	</figure>

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
			<section class="waterway__network-node waterway__inlets" aria-labelledby="trigger-inlets-title">
				<header>
					<span>01 / Inlets</span>
					<strong id="trigger-inlets-title">Triggers can come from anywhere.</strong>
				</header>
				<div class="waterway__trigger-list">
					{#each WORKFLOW_TRIGGERS as trigger}
						<article data-work-trigger={trigger.id}>
							<span>{trigger.source}</span>
							<strong>{trigger.label}</strong>
							<p>{trigger.detail}</p>
						</article>
					{/each}
				</div>
			</section>

			<article class="waterway__network-node waterway__packet">
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

			<section class="waterway__network-node waterway__work-cell" data-work-cell aria-labelledby="work-cell-title">
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

			<article class="waterway__network-node waterway__policy-gate">
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

		<div class="waterway__decision-field">
			<article class="waterway__run-lane">
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

		<article class="waterway__business-outcome" data-business-outcome>
			<div>
				<span>05 / Downstream</span>
				<strong>{BUSINESS_OUTCOME.label}</strong>
			</div>
			<p>{BUSINESS_OUTCOME.operationalResult}</p>
			<small>{BUSINESS_OUTCOME.measure}</small>
		</article>
	</section>

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
		--waterway-ready-soft: var(--color-performance-ready-soft, #dcece5);
		--waterway-review: var(--color-performance-review, #8b6b00);
		--waterway-review-soft: var(--color-performance-review-soft, #f1e7c8);
		--waterway-stop: var(--color-performance-stop, #c62026);
		--waterway-stop-soft: var(--color-performance-stop-soft, #f5dddd);
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

	.waterway__tributaries path {
		fill: none;
		stroke: var(--waterway-signal-soft);
		stroke-width: 42;
		stroke-linecap: round;
		opacity: 0.72;
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
		border: 1px solid var(--waterway-line-strong);
		background: var(--waterway-line);
	}

	.waterway__network-header {
		display: grid;
		grid-template-columns: minmax(0, 1.15fr) minmax(18rem, 0.85fr);
		gap: clamp(1.5rem, 5vw, 5rem);
		align-items: end;
		padding: clamp(1.25rem, 3vw, 2.5rem);
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
		display: grid;
		grid-template-columns: minmax(0, 1.3fr) minmax(0, 0.95fr) minmax(0, 1.1fr) minmax(0, 1.15fr);
		gap: 1px;
		background: var(--waterway-line);
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
		top: 2rem;
		right: -0.42rem;
		z-index: 3;
		width: 0.72rem;
		height: 0.72rem;
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
	.waterway__trigger-list article > span,
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

	.waterway__trigger-list article > span { color: var(--waterway-signal); }
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
		display: grid;
		grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.25fr) minmax(0, 0.95fr);
		gap: 1.5rem;
		align-items: center;
		padding: 1rem;
		border-left: 5px solid var(--waterway-ready);
		background: var(--waterway-ready-soft);
	}

	.waterway__business-outcome > div { display: grid; gap: 0.35rem; }
	.waterway__business-outcome strong { font-size: 1rem; }
	.waterway__business-outcome p { font-size: 0.86rem; line-height: 1.45; }
	.waterway__business-outcome small { color: var(--waterway-ready); line-height: 1.4; }

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
		.waterway__pause-station > header { grid-template-columns: 1fr; }
		.waterway__ledger { grid-template-columns: 1fr; }
		.waterway__ledger-card header { min-height: auto; }
	}

	@media (min-width: 761px) and (max-width: 1080px) {
		.waterway__network-route { grid-template-columns: 1fr 1fr; }
		.waterway__network-node:nth-child(2)::after { display: none; }
		.waterway__decision-field { grid-template-columns: 1fr; }
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
