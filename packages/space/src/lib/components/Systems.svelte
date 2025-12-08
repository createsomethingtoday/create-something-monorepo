<script lang="ts">
	/**
	 * Systems Component
	 *
	 * MEP (Mechanical, Electrical, Plumbing) visualization overlay.
	 * Following Heidegger's zuhandenheit: infrastructure should be
	 * "ready-to-hand" — present when needed, invisible when not.
	 *
	 * Tufte: High data-ink ratio for complex technical systems.
	 * Rams: Less but better, each line item earns its place.
	 */

	import type { SystemsData } from '$lib/types/architecture';

	export let systems: SystemsData;
	export let showCaption: boolean = true;

	// System colors - using design tokens
	const colors = {
		hvac: {
			supply: 'var(--arch-hvac-supply)',
			return: 'var(--arch-hvac-return)',
			equipment: 'var(--arch-hvac-equipment)',
			zone: 'var(--arch-hvac-zone)'
		},
		plumbing: {
			supply: 'var(--arch-plumbing-supply)',
			drain: 'var(--arch-plumbing-drain)',
			vent: 'var(--arch-plumbing-vent)',
			fixture: 'var(--arch-plumbing-fixture)'
		},
		electrical: {
			circuit: 'var(--arch-electrical-circuit)',
			equipment: 'var(--arch-electrical-equipment)',
			wire: 'var(--arch-electrical-wire)'
		}
	};

	// Scale and dimensions
	const scale = 12;
	const margin = 20;

	$: svgWidth = systems.width * scale + margin * 2 + 80;
	$: svgHeight = systems.depth * scale + margin * 2 + 20;

	// Coordinate transforms (SVG y is inverted)
	function tx(x: number): number {
		return margin + x * scale;
	}

	function ty(y: number): number {
		return svgHeight - margin - y * scale - 20;
	}

	// Equipment icons - minimal geometric symbols
	function getHVACSymbol(type: string): string {
		switch (type) {
			case 'air_handler':
				return '▣'; // Air handler
			case 'condenser':
				return '◉'; // Condenser unit
			case 'mini_split':
				return '◈'; // Mini split
			case 'thermostat':
				return '◌'; // Thermostat
			default:
				return '○';
		}
	}

	function getPlumbingSymbol(type: string): string {
		switch (type) {
			case 'water_heater':
				return '⬡'; // Water heater
			case 'main_shutoff':
				return '⊗'; // Main shutoff
			case 'hose_bib':
				return '⊙'; // Hose bib
			default:
				return '○';
		}
	}

	function getElectricalSymbol(type: string): string {
		switch (type) {
			case 'panel':
				return '⊞'; // Main panel
			case 'subpanel':
				return '⊟'; // Sub panel
			case 'meter':
				return '◐'; // Meter
			default:
				return '○';
		}
	}

	// Caption
	$: caption = `${systems.width}′ × ${systems.depth}′  ·  MEP Systems`;
</script>

<div class="systems-container">
	<svg viewBox="0 0 {svgWidth} {svgHeight}" class="systems-plan" role="img" aria-label={systems.name}>
		<!-- Building outline - faint reference -->
		<rect
			x={tx(0)}
			y={ty(systems.depth)}
			width={systems.width * scale}
			height={systems.depth * scale}
			class="building-outline"
		/>

		<!-- HVAC Zones -->
		{#each systems.hvacZones || [] as zone}
			<rect
				x={tx(zone.x)}
				y={ty(zone.y + zone.height)}
				width={zone.width * scale}
				height={zone.height * scale}
				fill={colors.hvac.zone}
				stroke={colors.hvac.supply}
				stroke-width="0.5"
				stroke-dasharray="2 2"
				class="hvac-zone"
			/>
			<text
				x={tx(zone.x + zone.width / 2)}
				y={ty(zone.y + zone.height / 2)}
				class="zone-label hvac"
			>
				{zone.name}
			</text>
		{/each}

		<!-- Circuit Zones -->
		{#each systems.circuits || [] as circuit}
			<rect
				x={tx(circuit.x)}
				y={ty(circuit.y + circuit.height)}
				width={circuit.width * scale}
				height={circuit.height * scale}
				fill={colors.electrical.circuit}
				stroke={colors.electrical.wire}
				stroke-width="0.5"
				stroke-dasharray="4 2"
				class="circuit-zone"
			/>
			<text
				x={tx(circuit.x + circuit.width / 2)}
				y={ty(circuit.y + circuit.height / 2)}
				class="zone-label electrical"
			>
				{circuit.circuit}
			</text>
		{/each}

		<!-- Duct runs -->
		{#each systems.ducts || [] as duct}
			<line
				x1={tx(duct.x1)}
				y1={ty(duct.y1)}
				x2={tx(duct.x2)}
				y2={ty(duct.y2)}
				stroke={duct.type === 'supply' ? colors.hvac.supply : colors.hvac.return}
				stroke-width={duct.type === 'supply' ? 2 : 1.5}
				stroke-linecap="round"
				stroke-dasharray={duct.type === 'return' ? '4 2' : 'none'}
				class="duct {duct.type}"
			/>
		{/each}

		<!-- Pipe runs -->
		{#each systems.pipes || [] as pipe}
			{@const pipeColor =
				pipe.type === 'supply'
					? colors.plumbing.supply
					: pipe.type === 'drain'
						? colors.plumbing.drain
						: colors.plumbing.vent}
			<line
				x1={tx(pipe.x1)}
				y1={ty(pipe.y1)}
				x2={tx(pipe.x2)}
				y2={ty(pipe.y2)}
				stroke={pipeColor}
				stroke-width={pipe.type === 'supply' ? 1.5 : 1}
				stroke-linecap="round"
				stroke-dasharray={pipe.type === 'vent' ? '2 2' : 'none'}
				class="pipe {pipe.type}"
			/>
		{/each}

		<!-- HVAC Equipment -->
		{#each systems.hvacEquipment as equip}
			<text
				x={tx(equip.x)}
				y={ty(equip.y)}
				class="equipment-symbol hvac"
				dominant-baseline="middle"
				text-anchor="middle"
			>
				{getHVACSymbol(equip.type)}
			</text>
			{#if equip.label}
				<text x={tx(equip.x)} y={ty(equip.y) + 12} class="equipment-label hvac">
					{equip.label}
				</text>
			{/if}
		{/each}

		<!-- Plumbing Fixtures -->
		{#each systems.plumbingFixtures as fixture}
			<text
				x={tx(fixture.x)}
				y={ty(fixture.y)}
				class="equipment-symbol plumbing"
				dominant-baseline="middle"
				text-anchor="middle"
			>
				{getPlumbingSymbol(fixture.type)}
			</text>
			{#if fixture.label}
				<text x={tx(fixture.x)} y={ty(fixture.y) + 12} class="equipment-label plumbing">
					{fixture.label}
				</text>
			{/if}
		{/each}

		<!-- Electrical Equipment -->
		{#each systems.electricalEquipment as equip}
			<text
				x={tx(equip.x)}
				y={ty(equip.y)}
				class="equipment-symbol electrical"
				dominant-baseline="middle"
				text-anchor="middle"
			>
				{getElectricalSymbol(equip.type)}
			</text>
			{#if equip.label}
				<text x={tx(equip.x)} y={ty(equip.y) + 12} class="equipment-label electrical">
					{equip.label}
				</text>
			{/if}
		{/each}

		<!-- Labels -->
		{#each systems.labels || [] as label}
			<text x={tx(label.x)} y={ty(label.y)} class="label" class:small={label.small}>
				{label.text}
			</text>
		{/each}

		<!-- Legend -->
		<g class="legend" transform="translate({svgWidth - 70}, 20)">
			<text x="0" y="0" class="legend-title">SYSTEMS</text>

			<text x="0" y="18" class="legend-item hvac">— HVAC</text>
			<text x="0" y="30" class="legend-item plumbing">— Plumbing</text>
			<text x="0" y="42" class="legend-item electrical">— Electrical</text>
		</g>
	</svg>

	{#if showCaption}
		<footer class="caption-bar">
			<span class="caption">{caption}</span>
		</footer>
	{/if}
</div>

<style>
	.systems-container {
		width: 100%;
	}

	.systems-plan {
		width: 100%;
		height: auto;
		display: block;
	}

	.building-outline {
		fill: var(--color-bg-elevated);
		stroke: var(--color-fg-subtle);
		stroke-width: 0.5;
	}

	/* Zone labels */
	.zone-label {
		font-family: var(--font-sans, system-ui, sans-serif);
		font-size: 6px;
		text-anchor: middle;
		dominant-baseline: middle;
		letter-spacing: var(--tracking-wider, 0.05em);
		text-transform: uppercase;
	}

	.zone-label.hvac {
		fill: var(--arch-hvac-label);
	}

	.zone-label.electrical {
		fill: var(--arch-electrical-label);
	}

	/* Equipment symbols */
	.equipment-symbol {
		font-size: 10px;
	}

	.equipment-symbol.hvac {
		fill: var(--arch-hvac-equipment);
	}

	.equipment-symbol.plumbing {
		fill: var(--arch-plumbing-fixture);
	}

	.equipment-symbol.electrical {
		fill: var(--arch-electrical-equipment);
	}

	/* Equipment labels */
	.equipment-label {
		font-family: var(--font-sans, system-ui, sans-serif);
		font-size: 5px;
		text-anchor: middle;
		letter-spacing: var(--tracking-normal, 0.02em);
	}

	.equipment-label.hvac {
		fill: var(--arch-hvac-label);
	}

	.equipment-label.plumbing {
		fill: var(--arch-plumbing-label);
	}

	.equipment-label.electrical {
		fill: var(--arch-electrical-label);
	}

	/* General labels */
	.label {
		font-family: var(--font-sans, system-ui, sans-serif);
		font-size: 7px;
		fill: var(--arch-label-primary);
		text-anchor: middle;
		dominant-baseline: middle;
	}

	.label.small {
		font-size: 5px;
		fill: var(--arch-label-secondary);
	}

	/* Legend */
	.legend-title {
		font-family: var(--font-sans, system-ui, sans-serif);
		font-size: 6px;
		fill: var(--arch-label-secondary);
		letter-spacing: var(--tracking-widest, 0.1em);
	}

	.legend-item {
		font-family: var(--font-sans, system-ui, sans-serif);
		font-size: 5px;
		letter-spacing: var(--tracking-wider, 0.05em);
	}

	.legend-item.hvac {
		fill: var(--arch-hvac-supply);
	}

	.legend-item.plumbing {
		fill: var(--arch-plumbing-supply);
	}

	.legend-item.electrical {
		fill: var(--arch-electrical-wire);
	}

	/* Caption */
	.caption-bar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-top: var(--space-md, 1.5rem);
		padding-top: var(--space-sm, 1rem);
		border-top: 1px solid var(--color-hover);
		font-family: var(--font-sans, system-ui, sans-serif);
	}

	.caption {
		font-size: var(--text-body-sm, 11px);
		color: var(--color-fg-muted);
		letter-spacing: var(--tracking-normal, 0.02em);
	}
</style>
