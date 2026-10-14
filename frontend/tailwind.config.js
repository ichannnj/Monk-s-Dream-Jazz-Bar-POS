/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        jazz: {
          950: '#07090e',
          900: '#0d1117',
          850: '#131822',
          800: '#171d2b',
          700: '#232b3e',
          600: '#344059',
          500: '#4e5d7d',
          gold: '#f59e0b',
          'gold-light': '#fbbf24',
          'gold-dark': '#b45309',
          accent: '#d97706',
          brass: '#eab308',
          velvet: '#831843',
          neon: '#06b6d4',
          emerald: '#10b981',
          rose: '#f43f5e'
        }
      }
    },
  },
  plugins: [],
};
