/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        forest: {
          50: '#f0f7f3',
          100: '#dceee2',
          200: '#bbdcc8',
          300: '#8ec3a7',
          400: '#5da483',
          500: '#3c8764',
          600: '#2c6c4f',
          700: '#245740',
          800: '#1e4635',
          900: '#0d3824',
          950: '#071f14',
        },
        leaf: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        charcoal: {
          800: '#1a241f',
          850: '#141d18',
          900: '#0f1713',
          950: '#0a0f0d',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
