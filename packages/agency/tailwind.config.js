/** @type {import('tailwindcss').Config} */
export default {
	content: [
		'./src/**/*.{html,js,svelte,ts,svelte.ts,svelte.js}',
		'./src/routes/**/*.{svelte,ts,js}',
		'./src/lib/**/*.{svelte,ts,js}',
		'../components/src/**/*.{svelte,js,ts}'
	],
	theme: {
		extend: {
			fontFamily: {
				'mono': ['JetBrains Mono', 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', 'monospace'],
			},
		},
	},
	plugins: [],
	safelist: [
		'gap-6',
		'gap-8',
		'p-8',
		'px-4',
		'py-8',
		'max-w-7xl',
		'rounded-lg',
		'rounded-xl',
		'text-sm',
		'text-xs',
		{
			pattern: /(bg|text|border)-(white|gray|green|red|blue)-(100|200|300|400|500|600|700|800|900)/,
		},
		{
			pattern: /(p|m|px|py|mx|my|mt|mb|ml|mr)-(1|2|3|4|5|6|8|10|12|16|20|24)/,
		},
		{
			pattern: /gap-(1|2|3|4|5|6|8|10|12)/,
		},
		{
			pattern: /w-(1|2|full|1\/2|1\/3|2\/3)/,
		},
		{
			pattern: /h-(1|2|full|screen)/,
		}
	]
}
