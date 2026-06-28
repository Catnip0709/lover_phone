/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      boxShadow: {
        "memory-card": "0 4px 16px rgba(61,61,61,0.08)",
      },
    },
  },
  plugins: [],
};
