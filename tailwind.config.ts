import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Planhat-inspired palette
        ink: {
          900: '#0B1727',
          800: '#142235',
          700: '#1E3047',
          600: '#2A405A',
          500: '#5A6B82',
          400: '#8896A8',
          300: '#B5BFCC',
          200: '#D9DFE7',
          100: '#EEF1F5',
          50: '#F5F7FA',
        },
        brand: {
          50: '#EEF3FF',
          100: '#DCE6FF',
          200: '#B9CDFF',
          300: '#8FAFFF',
          400: '#5C8AFF',
          500: '#2766F1',
          600: '#1B4ED1',
          700: '#163FA8',
          800: '#143586',
          900: '#102D6E',
        },
        good: {
          50: '#E8F8F1',
          500: '#10B981',
          600: '#0E9E6F',
          700: '#0B7E59',
        },
        warn: {
          50: '#FFF5E5',
          500: '#F59E0B',
          600: '#D98708',
          700: '#B36F06',
        },
        bad: {
          50: '#FDEBEC',
          500: '#EF4444',
          600: '#D63A3A',
          700: '#B12E2E',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px 0 rgba(11,23,39,0.04), 0 1px 3px 0 rgba(11,23,39,0.06)',
        cardLg: '0 4px 12px -2px rgba(11,23,39,0.08), 0 2px 6px -2px rgba(11,23,39,0.04)',
      },
    },
  },
  plugins: [],
};

export default config;
