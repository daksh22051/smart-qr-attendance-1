/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./pages/**/*.{js,jsx}", "./components/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        clinic: {
          50: "#eef5ff",
          100: "#d9e7ff",
          200: "#b3cfff",
          300: "#85b0ff",
          400: "#5f90ff",
          500: "#3b71ff",
          600: "#2a57db",
          700: "#1f41ad",
          800: "#182f7a",
          900: "#13255b"
        }
      }
    }
  },
  plugins: []
};
