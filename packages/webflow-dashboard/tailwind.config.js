/** @type {import('tailwindcss').Config} */
export default {
	content: [
		'./src/**/*.{html,js,svelte,ts,svelte.ts,svelte.js}',
		'./src/routes/**/*.{svelte,ts,js}',
		'./src/lib/**/*.{svelte,ts,js}'
	],
	darkMode: 'class',
	theme: {
		extend: {
			fontFamily: {
				sans: ['WF Visual Sans', 'system-ui', 'sans-serif'],
				'sans-medium': ['WF Visual Sans Medium', 'system-ui', 'sans-serif'],
				'sans-semibold': ['WF Visual Sans Semibold', 'system-ui', 'sans-serif'],
				mono: ['JetBrains Mono', 'SF Mono', 'Monaco', 'monospace'],
			},
			colors: {
				// Webflow brand colors
				'webflow': {
					'blue': '#4353ff',
					'blue-dark': '#3340cc',
					'blue-light': '#6673ff',
					'gray': {
						100: '#f0f0f0',
						200: '#e0e0e0',
						300: '#c0c0c0',
						400: '#a0a0a0',
						500: '#808080',
						600: '#606060',
						700: '#404040',
						800: '#252525',
						900: '#1a1a1a',
						950: '#080808',
					}
				}
			},
			fontSize: {
				// Webflow typography scale
				'h0': ['3.5rem', { lineHeight: '1.1', fontWeight: '600' }],
				'h1': ['2.5rem', { lineHeight: '1.2', fontWeight: '600' }],
				'h2': ['2rem', { lineHeight: '1.25', fontWeight: '600' }],
				'h3': ['1.5rem', { lineHeight: '1.3', fontWeight: '600' }],
				'h4': ['1.25rem', { lineHeight: '1.4', fontWeight: '600' }],
				'h5': ['1rem', { lineHeight: '1.5', fontWeight: '600' }],
				'h6': ['0.875rem', { lineHeight: '1.5', fontWeight: '600' }],
				'paragraph-xxl': ['1.5rem', { lineHeight: '1.6' }],
				'paragraph-xl': ['1.25rem', { lineHeight: '1.6' }],
				'paragraph-l': ['1.125rem', { lineHeight: '1.6' }],
				'paragraph': ['1rem', { lineHeight: '1.6' }],
				'paragraph-s': ['0.875rem', { lineHeight: '1.6' }],
				'paragraph-sm': ['0.75rem', { lineHeight: '1.6' }],
				'eyebrow': ['0.75rem', { lineHeight: '1.4', letterSpacing: '0.1em', fontWeight: '600' }],
				'caption': ['0.6875rem', { lineHeight: '1.4' }],
			}
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
	]
}
