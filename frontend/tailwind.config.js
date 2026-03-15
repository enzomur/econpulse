/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Dark professional theme
        'slate-950': '#0f172a',
        'slate-900': '#1e293b',
        'slate-800': '#334155',
        // Accent colors
        'teal-accent': '#00d4aa',
        'amber-accent': '#f59e0b',
      },
      fontFamily: {
        mono: ['Geist Mono', 'monospace'],
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
