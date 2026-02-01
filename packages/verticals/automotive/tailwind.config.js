/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	darkMode: 'class',
	theme: {
		extend: {
			colors: {
				// NIO-inspired electric blue as default accent
				primary: '#3B82F6',
				'primary-light': '#60A5FA',
				'primary-dark': '#2563EB',
				// Dark theme backgrounds
				'nio-black': '#050505',
				'nio-grey': '#F3F4F6',
				'background-dark': '#0a0a0a',
				'background-light': '#ffffff'
			},
			fontFamily: {
				sans: ['Inter', 'sans-serif'],
				display: ['Inter', 'sans-serif']
			},
			spacing: {
				'128': '32rem'
			},
			animation: {
				'fade-up': 'fadeUp 1s ease-out forwards',
				'bounce-slow': 'bounce 2s infinite'
			},
			keyframes: {
				fadeUp: {
					'0%': { opacity: '0', transform: 'translateY(20px)' },
					'100%': { opacity: '1', transform: 'translateY(0)' }
				}
			}
		}
	},
	plugins: [require('@tailwindcss/forms')]
};
