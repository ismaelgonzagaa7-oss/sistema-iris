/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        iris: {
          dark: "#0B1D3A",
          blue: "#1E4FA8",
          gold: "#C9A34E",
        },
      },
    },
  },
  plugins: [],
};
