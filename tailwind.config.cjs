// tailwind.config.cjs
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        glass: 'rgba(255,255,255,0.06)',
        accent: '#0ea5a0', // tealish Apple vibe
        subtle: '#6b7280'
      },
      boxShadow: {
        'soft-lg': '0 10px 30px rgba(2,6,23,0.55)'
      },
      borderRadius: {
        'xl2': '18px'
      }
    },
  },
  plugins: [],
}
