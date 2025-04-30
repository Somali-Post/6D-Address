/** @type {import('tailwindcss').Config} */
const defaultTheme = require('tailwindcss/defaultTheme'); // Import defaultTheme

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Add Poppins to the beginning of the sans-serif font stack
      fontFamily: {
        sans: ['Poppins', ...defaultTheme.fontFamily.sans],
      },
    },
  },
  plugins: [],
}