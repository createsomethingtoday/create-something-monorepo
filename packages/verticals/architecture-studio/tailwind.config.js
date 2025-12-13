/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	theme: {
		extend: {
			fontFamily: {
				sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
				serif: ['Newsreader', 'Georgia', 'Times New Roman', 'serif'],
				mono: ['JetBrains Mono', 'SF Mono', 'Consolas', 'monospace']
			}
		}
	},
	plugins: []
};
