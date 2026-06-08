import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        paper: '#fafafa',
        surface: '#f4f4f4',
        line: '#e5e5e5',
        'line-s': '#d4d4d4',
        ink: {
          1: '#0a0a0a',
          2: '#1f1f1f',
          3: '#595959',
          4: '#8a8a8a',
          5: '#b8b8b8',
        },
        signal: {
          DEFAULT: '#f06a2a',
          soft: '#fde8dd',
          deep: '#c4521e',
        },
        good: { DEFAULT: '#2a9c5e', soft: '#e1f3e8' },
        amber: { DEFAULT: '#d97706', soft: '#fcecd9' },
        blue: { DEFAULT: '#3b82f6', soft: '#e5efff' },
        violet: { DEFAULT: '#7b5ee6', soft: '#ede8fb' },
      },
      fontFamily: {
        display: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      letterSpacing: {
        display: '-0.022em',
        eyebrow: '0.1em',
        'eyebrow-wide': '0.14em',
      },
      borderRadius: {
        DEFAULT: '4px',
        rect: '2px',
      },
      transitionTimingFunction: {
        ease: 'cubic-bezier(0.2, 0, 0, 1)',
      },
    },
  },
  plugins: [],
};

export default config;
