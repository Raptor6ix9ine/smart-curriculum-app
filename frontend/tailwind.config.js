/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        'dark-bg': '#0D1117', 'dark-card': '#161B22',
        'spark-green': '#22C55E', 'spark-cyan': '#2DD4BF',
      }
    },
  },
  plugins: [],
}