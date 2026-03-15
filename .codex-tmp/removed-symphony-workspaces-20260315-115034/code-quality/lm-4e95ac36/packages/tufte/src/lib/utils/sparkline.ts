/**
 * Sparkline Path Generation
 *
 * Agentic utility that generates SVG paths for sparklines following Tufte's principles:
 * - Maximizes data-ink ratio (no decoration, just the line)
 * - Handles scaling automatically
 * - Works with any dataset
 */

export interface DataPoint {
	count: number;
	[key: string]: any;
}

/**
 * Generate SVG path for sparkline visualization
 *
 * @param data - Array of data points with count property
 * @param width - SVG viewBox width
 * @param height - SVG viewBox height
 * @returns SVG path string (M x,y L x,y L x,y...)
 */
export function generateSparklinePath(
	data: DataPoint[],
	width: number = 100,
	height: number = 20
): string {
	if (data.length === 0) return '';

	// Extract values
	const values = data.map((d) => d.count);

	// Calculate scale (agentic: automatically handles data range)
	const max = Math.max(...values, 1);
	const min = Math.min(...values, 0);
	const range = max - min || 1;

	// Generate points (agentic: smart scaling and positioning)
	const points = values.map((value, i) => {
		const x = (i / (values.length - 1 || 1)) * width;
		const y = height - ((value - min) / range) * height;
		return `${x},${y}`;
	});

	return `M ${points.join(' L ')}`;
}

/**
 * Generate area fill path (extends sparkline to bottom)
 *
 * @param linePath - SVG line path from generateSparklinePath
 * @param width - SVG viewBox width
 * @param height - SVG viewBox height
 * @returns SVG path string that closes to form a fill area
 */
export function generateFillPath(linePath: string, width: number, height: number): string {
	if (!linePath) return '';
	return `${linePath} L ${width},${height} L 0,${height} Z`;
}
