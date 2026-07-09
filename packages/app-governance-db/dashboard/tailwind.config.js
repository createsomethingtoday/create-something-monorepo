/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  corePlugins: {
    // Structure only — aesthetics come from Canon tokens.
    preflight: true
  },
  theme: {
    extend: {}
  },
  plugins: []
};
