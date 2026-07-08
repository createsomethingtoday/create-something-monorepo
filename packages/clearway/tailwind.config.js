/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	theme: {
		extend: {
			fontFamily: {
				sans: ['ABC Diatype', 'Stack Sans Notch', 'system-ui', '-apple-system', 'sans-serif'],
				mono: ['ABC Diatype Mono', 'JetBrains Mono', 'monospace']
			}
		}
	},
	plugins: []
};
