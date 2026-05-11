export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        pg: {
          50:  '#f0f7ff',
          100: '#e0efff',
          200: '#baddff',
          500: '#336791',   // classic PostgreSQL blue
          600: '#285273',
          700: '#1e3d57',
        },
      },
    },
  },
  plugins: [],
}
