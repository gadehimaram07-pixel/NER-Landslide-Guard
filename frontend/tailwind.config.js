/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        hazard: {
          critical: '#ef4444',
          high: '#f97316',
          moderate: '#eab308',
          low: '#22c55e',
          safe: '#06b6d4'
        }
      }
    },
  },
  plugins: [],
}
