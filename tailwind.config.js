/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
    "./lib/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef7f2",
          100: "#d6ecdf",
          200: "#aed9bf",
          300: "#7cc09a",
          400: "#4aa374",
          500: "#2e8a5c",
          600: "#1f6e48",
          700: "#185639",
          800: "#12402b",
          900: "#0b2a1c",
        },
        navy: {
          50: "#f0f4f8",
          100: "#dce6ef",
          200: "#b9cddf",
          300: "#8dadca",
          400: "#5f8cb2",
          500: "#40709a",
          600: "#315a7f",
          700: "#274766",
          800: "#1c3450",
          900: "#122338",
        },
      },
    },
  },
  plugins: [],
};
