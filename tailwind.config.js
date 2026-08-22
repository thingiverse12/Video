/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        fantasy: {
          bg: '#0c0f17',
          surface: '#151b28',
          card: '#1c2436',
          border: '#2e3a52',
          gold: '#e2b34a',
          goldLight: '#fbe29a',
          goldDark: '#997321',
          ruby: '#e63946',
          emerald: '#2a9d8f',
          sapphire: '#457b9d',
          amethyst: '#9d4edd',
        }
      },
      fontFamily: {
        serif: ['Cinzel', 'Georgia', 'serif'],
        sans: ['Inter', 'sans-serif'],
        mono: ['Fira Code', 'monospace'],
      },
      boxShadow: {
        'gold-glow': '0 0 20px rgba(226, 179, 74, 0.35)',
        'blue-glow': '0 0 20px rgba(69, 123, 157, 0.4)',
        'portal-glow': '0 0 25px rgba(157, 78, 221, 0.5)',
      }
    },
  },
  plugins: [],
}
