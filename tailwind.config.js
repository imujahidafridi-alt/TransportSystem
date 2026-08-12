/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/renderer/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#F4F3FF',
          100: '#ECE8FF',
          200: '#DDD6FE',
          300: '#C4B5FD',
          400: '#A78BFA',
          500: '#8B5CF6',
          600: '#6C5CE7',
          700: '#5A4AD1',
          800: '#4C1D95',
          900: '#2E1065',
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
      },
      boxShadow: {
        'soft-card': '0 8px 30px rgba(0, 0, 0, 0.04)',
        'soft-modal': '0 20px 50px rgba(108, 92, 231, 0.12)',
        'brand-glow': '0 4px 20px rgba(108, 92, 231, 0.25)',
      },
      borderRadius: {
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
    },
  },
  plugins: [],
}
