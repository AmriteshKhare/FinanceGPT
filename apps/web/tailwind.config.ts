/** @type {import('tailwindcss').Config} */
const config = {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          50: '#f3f6f4',
          100: '#e2ebe6',
          200: '#c5d6cc',
          700: '#2f4a3c',
          800: '#243a2f',
          900: '#1a2a22',
          950: '#0f1915',
        },
        leaf: {
          400: '#6fbf8a',
          500: '#3d9a5f',
          600: '#2f7a4b',
        },
        sand: {
          100: '#eef2ef',
          200: '#d9e3dc',
        },
      },
      fontFamily: {
        display: ['"Fraunces"', 'Georgia', 'serif'],
        sans: ['"Source Sans 3"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'mesh':
          'radial-gradient(ellipse at 20% 0%, rgba(61,154,95,0.18), transparent 50%), radial-gradient(ellipse at 90% 10%, rgba(36,58,47,0.12), transparent 45%), linear-gradient(180deg, #eef2ef 0%, #d9e3dc 100%)',
      },
    },
  },
  plugins: [],
};

export default config;
