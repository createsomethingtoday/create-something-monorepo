/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Stack Sans', 'system-ui', 'sans-serif'],
        mono: ['Stack Sans', 'ui-monospace', 'monospace']
      }
    }
  },
  plugins: []
};
