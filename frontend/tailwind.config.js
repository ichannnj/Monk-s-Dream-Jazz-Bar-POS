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
        'pos-xs': ['0.875rem', { lineHeight: '1.25rem', letterSpacing: '0.01em' }], // 14px
        'pos-sm': ['0.9375rem', { lineHeight: '1.375rem', letterSpacing: '0.005em' }], // 15px
        'pos-base': ['1rem', { lineHeight: '1.5rem', letterSpacing: '0em' }], // 16px (1rem)
        'pos-md': ['1.125rem', { lineHeight: '1.625rem', letterSpacing: '-0.01em' }], // 18px
        'pos-lg': ['1.25rem', { lineHeight: '1.75rem', letterSpacing: '-0.015em' }], // 20px
        'pos-xl': ['1.5rem', { lineHeight: '2rem', letterSpacing: '-0.02em' }], // 24px
        'pos-2xl': ['1.75rem', { lineHeight: '2.25rem', letterSpacing: '-0.025em' }], // 28px
        'pos-3xl': ['2.25rem', { lineHeight: '2.75rem', letterSpacing: '-0.03em' }], // 36px
        'brand-hero': ['3rem', { lineHeight: '3.25rem', letterSpacing: '0.01em' }], // 48px
        'brand-title': ['1.375rem', { lineHeight: '1.75rem', letterSpacing: '0.02em' }], // 22px
      },
      minHeight: {
        'touch-sm': '40px',
        touch: '44px',
        'touch-md': '48px',
        'touch-lg': '56px',
      },
      minWidth: {
        'touch-sm': '40px',
        touch: '44px',
        'touch-md': '48px',
        'touch-lg': '56px',
      }
    },
  },
  plugins: [],
};
