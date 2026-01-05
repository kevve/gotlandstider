/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./*.{html,js}"],
  theme: {
    extend: {
      colors: {
        gotland: {
          stone: '#F2EBE5', // Ljus kalksten (Bakgrund)
          stoneDark: '#E5DCD3', // Skuggad kalksten (Sektioner)
          deep: '#1F2933', // Mörk grafit (Text)
          moss: '#7A8B7D', // Ljusare mossa
          pine: '#4A5D53', // Djup tallgrön (Accent)
          rust: '#BC8A6F', // Terracotta/Rost
          bark: '#8C5E45', // Mörkare bränd lera (Hover)
        }
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'serif'],
        sans: ['"Inter"', 'sans-serif'],
      }
    },
  },
  plugins: [],
}