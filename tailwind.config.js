/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0f172a", // slate-950
        surface: "#1e293b",    // slate-800
        primary: "#6366f1",    // indigo-500
        secondary: "#06b6d4",  // cyan-500
        success: "#10b981",    // emerald-500
        danger: "#f43f5e",     // rose-500
        text: "#f8fafc",       // slate-50
        muted: "#94a3b8",      // slate-400
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      }
    },
  },
  plugins: [],
}