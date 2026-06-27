/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        fairway: {
          50: '#f0f9f1',
          100: '#dbf0dd',
          200: '#b9e1bf',
          300: '#8acb96',
          400: '#56ad68',
          500: '#2f8f47',
          600: '#207237',
          700: '#1b5b2e',
          800: '#194828',
          900: '#163b22',
          950: '#0a2113',
        },
        night: {
          50: '#f4f6fb',
          100: '#e7ebf4',
          200: '#cad4e6',
          300: '#9bafd0',
          400: '#6584b4',
          500: '#43639b',
          600: '#324d81',
          700: '#2a3f69',
          800: '#263758',
          900: '#1b2740',
          950: '#0b1120',
        },
      },
      fontFamily: {
        display: ['Syne', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        card: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        'card-dark': '0 1px 3px 0 rgb(0 0 0 / 0.4), 0 1px 2px -1px rgb(0 0 0 / 0.4)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out',
        'slide-up': 'slide-up 0.25s ease-out',
      },
    },
  },
  plugins: [],
};
