<script lang="ts">
	/**
	 * ArchitecturalPatterns Component
	 *
	 * SVG pattern definitions for construction documents.
	 * Provides reusable hatching and fill patterns for architectural visualizations.
	 *
	 * Usage:
	 * <ArchitecturalPatterns />
	 * Then reference patterns by id in SVG elements:
	 * <rect fill="url(#earth-hatch)" ... />
	 */
</script>

<svg width="0" height="0" style="position: absolute; visibility: hidden;">
	<defs>
		<!-- Earth/Ground Hatching Pattern -->
		<!-- Diagonal lines at 45° for below-grade earth material -->
		<pattern
			id="earth-hatch"
			x="0"
			y="0"
			width="{6}"
			height="{6}"
			patternUnits="userSpaceOnUse"
			patternTransform="rotate(-45)"
		>
			<line x1="0" y1="0" x2="0" y2="6" stroke="var(--arch-hatch-color)" stroke-width="0.5" />
		</pattern>

		<!-- Concrete Hatching Pattern -->
		<!-- Denser diagonal lines for concrete/masonry -->
		<pattern
			id="concrete-hatch"
			x="0"
			y="0"
			width="{3}"
			height="{3}"
			patternUnits="userSpaceOnUse"
			patternTransform="rotate(-45)"
		>
			<line x1="0" y1="0" x2="0" y2="3" stroke="var(--arch-hatch-color)" stroke-width="0.25" />
		</pattern>

		<!-- Metal/Steel Hatching Pattern -->
		<!-- Perpendicular lines creating grid for metal materials -->
		<pattern id="metal-hatch" x="0" y="0" width="{4}" height="{4}" patternUnits="userSpaceOnUse">
			<line x1="0" y1="0" x2="4" y2="4" stroke="var(--arch-hatch-color)" stroke-width="0.3" />
			<line x1="4" y1="0" x2="0" y2="4" stroke="var(--arch-hatch-color)" stroke-width="0.3" />
		</pattern>

		<!-- Wood Hatching Pattern -->
		<!-- Diagonal lines with wider spacing for wood material -->
		<pattern
			id="wood-hatch"
			x="0"
			y="0"
			width="{8}"
			height="{8}"
			patternUnits="userSpaceOnUse"
			patternTransform="rotate(-45)"
		>
			<line x1="0" y1="0" x2="0" y2="8" stroke="var(--arch-hatch-color)" stroke-width="0.4" />
		</pattern>

		<!-- Insulation Hatching Pattern -->
		<!-- Crossed diagonal lines for insulation/void spaces -->
		<pattern
			id="insulation-hatch"
			x="0"
			y="0"
			width="{5}"
			height="{5}"
			patternUnits="userSpaceOnUse"
		>
			<line x1="0" y1="0" x2="5" y2="5" stroke="var(--arch-hatch-color)" stroke-width="0.25" />
			<line x1="5" y1="0" x2="0" y2="5" stroke="var(--arch-hatch-color)" stroke-width="0.25" />
		</pattern>
	</defs>
</svg>

<style>
	svg {
		display: none;
	}
</style>
