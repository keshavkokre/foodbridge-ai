/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        harvest: {
          canvas: '#F6F7F1',       // Warm Ivory base
          surface: '#FFFFFF',      // Crisp card white
          subtle: '#F0F2EB',       // Muted surface / table header
          border: '#E4E8DF',       // Hairline boundary
          forest: '#174C35',       // Primary botanical forest
          'forest-dark': '#0B2118',// Obsidian deep forest
          'forest-light': '#236548',
          lime: '#B9E76A',         // High-visibility harvest signal
          'lime-muted': '#EBF7D3', // Soft lime badge
          amber: '#E8A46A',        // Urgent status amber
          'amber-muted': '#FBF0E6',
          crimson: '#C84630',      // Critical warning
          'text-dark': '#202A24',  // Primary charcoal green text
          'text-muted': '#707A72', // Slate olive secondary text
        }
      },
      fontFamily: {
        heading: ['Manrope', 'sans-serif'],
        sans: ['DM Sans', 'sans-serif'],
      },
      boxShadow: {
        'harvest-sm': '0 1px 2px 0 rgba(11, 33, 24, 0.05)',
        'harvest-md': '0 4px 12px 0 rgba(11, 33, 24, 0.08)',
        'harvest-lg': '0 12px 32px 0 rgba(11, 33, 24, 0.12)',
      }
    },
  },
  plugins: [],
}
