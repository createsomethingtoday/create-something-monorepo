/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif']
      },
      colors: {
        // Webflow brand colors
        webflow: {
          blue: '#4353FF',
          dark: '#1A1A2E',
          light: '#F4F5F7'
        }
      }
    }
  },
  plugins: []
};
