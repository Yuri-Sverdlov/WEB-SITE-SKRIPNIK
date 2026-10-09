/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#faf6ee',
        ink: '#2c3e50',
        accent: '#3b6fa8',
        muted: '#8b9bb5',
        'border-light': '#e2dcc8',
      },
      fontFamily: {
        story: ['Georgia', 'Times New Roman', 'serif'],
        ui: ['system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
    },
  },
  plugins: [],
}