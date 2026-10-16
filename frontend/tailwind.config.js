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
        },
        wine: {
          950: '#120609',
          900: '#210c14',
          800: '#3d1420',
          700: '#501521',
          600: '#641b2a',
          500: '#7e2235',
          400: '#b93a52',
          300: '#d87083',
          200: '#f0b6c1',
          100: '#f7e8eb',
          50: '#fdf5f6'
        },
        stage: {
          dark: '#16080d',
          card: '#faf8f8',
          border: '#e2e4e8',
          input: '#fdfcfc',
        }
      },
      screens: {
        'mobile': '360px',
        'tablet': '768px',
        'tablet-lg': '1024px',
        'pos': '1180px',
      },
      fontFamily: {
        brand: ['"Raconteur NF"', 'RaconteurNF', 'Fraunces', 'Playfair Display', 'Georgia', 'serif'],
        serif: ['"Raconteur NF"', 'RaconteurNF', 'Fraunces', 'Playfair Display', 'Georgia', 'serif'],
        sans: ['Plus Jakarta Sans', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      fontSize: {
        'pos-2xs': ['11px', { lineHeight: '15px', letterSpacing: '0.02em' }],
        'pos-xs': ['13px', { lineHeight: '18px', letterSpacing: '0.01em' }],
        'pos-sm': ['14px', { lineHeight: '20px', letterSpacing: '0.005em' }],
        'pos-base': ['16px', { lineHeight: '24px', letterSpacing: '0em' }],
        'pos-md': ['18px', { lineHeight: '26px', letterSpacing: '-0.01em' }],
        'pos-lg': ['20px', { lineHeight: '28px', letterSpacing: '-0.015em' }],
        'pos-xl': ['24px', { lineHeight: '32px', letterSpacing: '-0.02em' }],
        'pos-2xl': ['30px', { lineHeight: '38px', letterSpacing: '-0.025em' }],
        'pos-3xl': ['38px', { lineHeight: '46px', letterSpacing: '-0.03em' }],
        'brand-hero': ['48px', { lineHeight: '52px', letterSpacing: '0.01em' }],
        'brand-title': ['22px', { lineHeight: '28px', letterSpacing: '0.02em' }],
      },
      minHeight: {
        touch: '48px',
        'touch-lg': '54px',
      },
      minWidth: {
        touch: '48px',
        'touch-lg': '54px',
      }
    },
  },
  plugins: [],
};
