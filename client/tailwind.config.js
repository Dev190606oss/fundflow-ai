/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef6ff',
          100: '#d9ecff',
          200: '#bce0ff',
          500: '#0066cc',
          600: '#0052a3',
          700: '#003d7a',
          900: '#0a192f',
        },
        navy: {
          800: '#0f172a',
          900: '#090d16',
          950: '#050811',
        },
        paypal: {
          blue: '#003087',
          lightBlue: '#0079C1',
          gold: '#FFC439',
        },
      },
    },
  },
  plugins: [],
}
