import typography from '@tailwindcss/typography'

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
      typography: {
        DEFAULT: {
          css: {
            color: '#2c3e50',
            maxWidth: 'none',
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontSize: '1.125rem', // 18px
            lineHeight: '1.7',
            p: {
              marginTop: '1.5em',
              marginBottom: '1.5em',
            },
            'p:first-child': {
              marginTop: '0',
            },
            a: {
              color: '#3b6fa8',
              textDecoration: 'underline',
            },
            'a:hover': {
              color: '#2c4f7c',
            },
            h1: { color: '#2c3e50' },
            h2: { color: '#2c3e50' },
            h3: { color: '#2c3e50' },
            strong: { color: '#2c3e50' },
            blockquote: {
              color: '#5a6b7d',
              borderLeftColor: '#e2dcc8',
            },
          },
        },
      },
    },
  },
  plugins: [typography],
}
