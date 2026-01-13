/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'cyber-cyan': '#00ffff',
        'cyber-green': '#00ff00',
        'cyber-pink': '#ff00ff',
        'dark-bg': '#0a0a0a',
        'dark-card': '#111111',
      },
      fontFamily: {
        'orbitron': ['Orbitron', 'monospace'],
        'mono': ['Rajdhani', 'Courier New', 'monospace'],
      },
    },
  },
  plugins: [],
}
