// tailwind.config.js
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./node_modules/jalaali-date-time-picker/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ks: {
          blue: {
            DEFAULT: '#2563EB',
            50: '#eff6ff',
            100: '#dbeafe',
            200: '#bfdbfe',
            300: '#93c5fd',
            400: '#60a5fa',
            500: '#2563EB',
            600: '#1d4ed8',
            700: '#1e40af',
            800: '#1e3a8a',
            900: '#172554',
          },
          dark: {
            DEFAULT: '#1a1d21',
            950: '#1a1d21',
            900: '#24272c',
            800: '#2D3644',
            700: '#272727',
            600: '#3a3a3a',
            500: '#4a4a4a',
            400: '#6b7280',
            300: '#858990',
          },
          light: {
            DEFAULT: '#f7f9fa',
            50: '#f7f9fa',
            100: '#f1f1f1',
            200: '#e9e9e9',
            300: '#e2e8f0',
            text: '#111111',
          },
          gray: '#24272c',
        },
      },
      fontFamily: {
        vazir: ['var(--font-vazir)', 'sans-serif'],
      },
    },
  },
}