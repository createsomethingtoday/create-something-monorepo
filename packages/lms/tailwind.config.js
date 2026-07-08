/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/**/*.{html,js,svelte,ts}',
    '../canon/src/**/*.{svelte,js,ts}'
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ['ABC Diatype Mono', 'JetBrains Mono', 'SF Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
};
