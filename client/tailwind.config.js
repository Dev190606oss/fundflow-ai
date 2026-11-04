/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: '#FFFFFF',
        surface: '#F8F9FA',
        subtle: '#F1F3F5',
        border: '#E5E7EB',
        primary: {
          DEFAULT: '#171717',
          hover: '#0A0A0A',
        },
        secondary: '#737373',
        muted: '#A3A3A3',
        accent: {
          DEFAULT: '#0D9488', // Muted refined teal
          hover: '#0F766E',
          subtle: '#F0FDFA',
          border: '#CCFBF1',
        },
        success: {
          DEFAULT: '#16A34A',
          bg: '#F0FDF4',
          border: '#DCFCE7',
          text: '#15803D',
        },
        warning: {
          DEFAULT: '#D97706',
          bg: '#FFFBEB',
          border: '#FEF3C7',
          text: '#B45309',
        },
        error: {
          DEFAULT: '#DC2626',
          bg: '#FEF2F2',
          border: '#FEE2E2',
          text: '#B91C1C',
        },
      },
      fontFamily: {
        sans: [
          'Plus Jakarta Sans',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
}
