/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	theme: {
		extend: {
			fontFamily: {
				mono: ['Stack Sans', 'ui-monospace', 'monospace'],
			},
		},
	},
	plugins: [],
};
